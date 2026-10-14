import type { ExtensionResponse } from '../shared/messages';
import { validateActiveTabContext } from '../services/activeTabContext';
import { createReplayPlan, type ReplayPlanStep } from './replayPlan';
import { executeReplayOperation } from './executeReplayOperation';

export interface ReplayStepResult {
  index: number;
  label: string;
  status: 'pending' | 'running' | 'passed' | 'skipped' | 'failed' | 'interrupted';
  message?: string;
}

export interface ReplayStatus {
  phase: 'idle' | 'running' | 'completed' | 'failed' | 'interrupted';
  origin?: string;
  steps: ReplayStepResult[];
  message?: string;
}

let preview: { token: string; tabId: number; url: string; documentId: string; snapshot: string; plan: ReplayPlanStep[] } | undefined;
let status: ReplayStatus = { phase: 'idle', steps: [] };
let runId = 0;
let runningTabId: number | undefined;

function error(message: string): ExtensionResponse { return { success: false, error: message }; }
function permissionPattern(url: string) {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.hostname}/*`;
}

async function currentDocument(tabId: number) {
  const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
  return frame?.documentId && frame.documentLifecycle === 'active' ? frame.documentId : undefined;
}

async function validatedContext() {
  const context = await validateActiveTabContext();
  if (!context || !/^https?:\/\//.test(context.url)) return undefined;
  const permitted = await chrome.permissions.contains({ origins: [permissionPattern(context.url)] });
  if (!permitted) return undefined;
  const documentId = await currentDocument(context.tabId);
  return documentId ? { ...context, documentId } : undefined;
}

export async function prepareReplay(): Promise<ExtensionResponse> {
  if (status.phase === 'running') return error('Já existe uma execução em andamento.');
  preview = undefined;
  const context = await validatedContext();
  if (!context) return error('Reabra o StepScript pelo ícone na aba autorizada para executar os passos.');
  const local = await chrome.storage.local.get(['recordingState', 'recordedSteps']);
  if ((local.recordingState as { isRecording?: boolean } | undefined)?.isRecording)
    return error('Pare a gravação antes de executar os passos.');
  const saved = Array.isArray(local.recordedSteps) ? local.recordedSteps : [];
  const plan = createReplayPlan(saved, new URL(context.url).origin, context.url);
  if (!plan.some((step) => step.operation)) return error('Nenhum passo compatível para executar nesta aba.');
  const token = crypto.randomUUID();
  preview = { token, tabId: context.tabId, url: context.url, documentId: context.documentId, snapshot: JSON.stringify(saved), plan };
  return { success: true, replayPreview: {
    token, origin: new URL(context.url).origin,
    steps: plan.map(({ index, label, operation, reason }) => ({ index, label, status: operation ? 'pending' : 'skipped', ...(reason ? { message: reason } : {}) })),
  } };
}

export function getReplayStatus(): ExtensionResponse { return { success: true, replayStatus: structuredClone(status) }; }

export function interruptReplay(message: string, tabId?: number) {
  if (preview && (tabId === undefined || preview.tabId === tabId)) preview = undefined;
  if (status.phase !== 'running' || (tabId !== undefined && runningTabId !== tabId)) return;
  runId += 1;
  status.phase = 'interrupted';
  status.message = message;
  status.steps = status.steps.map((step) => step.status === 'running' ? { ...step, status: 'interrupted', message } : step);
  runningTabId = undefined;
}

export async function startReplay(token: string): Promise<ExtensionResponse> {
  const prepared = preview;
  preview = undefined;
  if (!prepared || prepared.token !== token || status.phase === 'running') return error('A confirmação expirou. Prepare a execução novamente.');
  const context = await validatedContext();
  if (!context || context.tabId !== prepared.tabId || context.url !== prepared.url || context.documentId !== prepared.documentId)
    return error('A aba mudou. Reabra o StepScript e confirme novamente.');
  const local = await chrome.storage.local.get(['recordingState', 'recordedSteps']);
  if ((local.recordingState as { isRecording?: boolean } | undefined)?.isRecording || JSON.stringify(local.recordedSteps ?? []) !== prepared.snapshot)
    return error('A gravação ou os passos mudaram. Confirme novamente.');
  status = { phase: 'running', origin: new URL(context.url).origin,
    steps: prepared.plan.map(({ index, label, operation, reason }) => ({ index, label, status: operation ? 'pending' : 'skipped', ...(reason ? { message: reason } : {}) })) };
  runningTabId = context.tabId;
  const currentRun = ++runId;
  void runReplay(prepared, currentRun);
  return getReplayStatus();
}

async function runReplay(prepared: NonNullable<typeof preview>, currentRun: number) {
  try {
    for (const step of prepared.plan) {
      if (currentRun !== runId) return;
      if (!step.operation) continue;
      const context = await validatedContext();
      if (currentRun !== runId) return;
      if (!context || context.tabId !== prepared.tabId || context.url !== prepared.url || context.documentId !== prepared.documentId) {
        interruptReplay('A aba, URL ou documento mudou; execução interrompida.');
        return;
      }
      const local = await chrome.storage.local.get(['recordingState', 'recordedSteps']);
      if (currentRun !== runId) return;
      if ((local.recordingState as { isRecording?: boolean } | undefined)?.isRecording ||
          JSON.stringify(local.recordedSteps ?? []) !== prepared.snapshot) {
        interruptReplay('A gravação ou os passos mudaram; execução interrompida.');
        return;
      }
      status.steps[step.index] = { index: step.index, label: step.label, status: 'running' };
      const results = await chrome.scripting.executeScript({ target: { tabId: prepared.tabId, documentIds: [prepared.documentId] },
        func: executeReplayOperation, args: [step.operation, prepared.url] });
      if (currentRun !== runId) return;
      const after = await validatedContext();
      if (currentRun !== runId) return;
      if (!after || after.tabId !== prepared.tabId || after.url !== prepared.url || after.documentId !== prepared.documentId) {
        interruptReplay('A aba, URL ou documento mudou; execução interrompida.');
        return;
      }
      const outcome = results[0]?.result;
      if (!outcome?.success || outcome.url !== prepared.url) {
        status.steps[step.index] = { index: step.index, label: step.label, status: 'failed', message: outcome?.error ?? 'O documento mudou durante o passo.' };
        status.phase = 'failed';
        status.message = 'A execução parou no primeiro erro.';
        runningTabId = undefined;
        return;
      }
      status.steps[step.index] = { index: step.index, label: step.label, status: 'passed' };
    }
    if (currentRun === runId) { status.phase = 'completed'; status.message = 'Execução concluída.'; runningTabId = undefined; }
  } catch {
    if (currentRun === runId) interruptReplay('Não foi possível continuar a execução nesta página.');
  }
}
