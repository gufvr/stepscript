import type { ExtensionResponse } from '../shared/messages';
import type { RecordedStep, RecordingState } from '../shared/recordingTypes';
import { validateActiveTabContext, STALE_TAB_CONTEXT_MESSAGE } from '../services/activeTabContext';

export interface GuidedRecordingStatus {
  phase: 'idle' | 'recording' | 'paused' | 'stopped';
  message: string;
  selectedStepId?: string;
}

interface GuidedSession {
  tabId: number;
  origin: string;
  windowId: number;
  status: GuidedRecordingStatus;
  documents: Map<string, string>;
  revision: number;
  closed: boolean;
}

let session: GuidedSession | undefined;
const SESSION_KEY = 'guidedRecordingSession';
let loaded = false;
let loading: Promise<void> | undefined;
let persistence: Promise<void> = Promise.resolve();

// Browser-session memory only. Recorded steps and their persisted schemas stay unchanged.
async function restore() {
  if (loaded) return;
  loading ??= chrome.storage.session.get(SESSION_KEY).then((stored) => {
    const saved = stored[SESSION_KEY] as (Omit<GuidedSession, 'documents'> & { documents: Array<[string, string]> }) | undefined;
    if (saved && typeof saved.tabId === 'number' && typeof saved.origin === 'string'
      && typeof saved.windowId === 'number' && Array.isArray(saved.documents)
      && ['recording', 'paused', 'stopped'].includes(saved.status?.phase)) {
      session = { ...saved, documents: new Map(saved.documents) };
    }
    loaded = true;
  });
  await loading;
}

function persist() {
  const saved = session ? { ...session, status: { ...session.status }, documents: [...session.documents] } : null;
  persistence = persistence.catch(() => undefined).then(() => chrome.storage.session.set({ [SESSION_KEY]: saved }));
  return persistence;
}

export async function guidedStatus(): Promise<ExtensionResponse> {
  await restore();
  await persistence;
  return { success: true, guidedStatus: session?.status ?? {
    phase: 'idle', message: 'Gravação comum selecionada.',
  } };
}

export async function guidedPaused() {
  await restore();
  return session?.status.phase === 'paused';
}

export function guidedTabActivated(tabId: number, windowId: number) {
  if (!loaded) { void restore().then(() => guidedTabActivated(tabId, windowId)).catch(() => undefined); return; }
  if (session && !session.closed && session.tabId !== tabId && session.windowId === windowId)
    interruptGuidedRecording('A aba ativa mudou. Reabra o StepScript na aba de origem para retomar.');
}

export function guidedTabClosed(tabId: number) {
  if (!loaded) { void restore().then(() => guidedTabClosed(tabId)).catch(() => undefined); return; }
  if (!session || session.tabId !== tabId) return;
  session.closed = true;
  interruptGuidedRecording('A aba foi fechada. Encerre a sessão e revise os passos salvos.', tabId);
}

async function hideHighlight() {
  if (!session) return;
  try { await chrome.tabs.sendMessage(session.tabId, { type: 'CLEAR_GUIDED_HIGHLIGHT' }, { frameId: 0 }); }
  catch { /* The previous document may already be gone. */ }
}

export async function resetGuidedRecording(tabId: number, origin: string, windowId: number, enabled: boolean) {
  await restore();
  const wasGuided = Boolean(session);
  await hideHighlight();
  session = enabled ? { tabId, origin, windowId, documents: new Map(), revision: 0, closed: false,
    status: { phase: 'recording', message: 'Interaja com a página. Cada ação capturada aparece aqui.' } } : undefined;
  if (enabled || wasGuided) await persist();
}

export async function stopGuidedRecording() {
  await restore();
  if (!session) return;
  session.revision += 1;
  session.status = { phase: 'stopped', message: 'Gravação encerrada. Os passos continuam disponíveis para revisão.' };
  await hideHighlight();
  await persist();
}

// Invalidate synchronously, before asynchronous context checks or queued captures.
export function interruptGuidedRecording(message: string, tabId?: number, windowId?: number) {
  if (!session || (tabId !== undefined && session.tabId !== tabId)
    || (windowId !== undefined && session.windowId !== windowId)) return;
  session.revision += 1;
  session.status = { phase: session.status.phase === 'stopped' ? 'stopped' : 'paused', message };
  void persist().catch(() => undefined);
  void hideHighlight();
  void chrome.tabs.sendMessage(session.tabId, { type: 'DEACTIVATE_CLICK_RECORDER' }, { frameId: 0 }).catch(() => undefined);
}

export function guidedNavigation(tabId: number, url: string) {
  if (!loaded) { void restore().then(() => guidedNavigation(tabId, url)).catch(() => undefined); return; }
  if (!session || session.closed || session.tabId !== tabId) return;
  let sameOrigin = false;
  try { sameOrigin = new URL(url).origin === session.origin; } catch { /* Unsupported URL. */ }
  if (!sameOrigin) {
    interruptGuidedRecording('A origem mudou. Reabra o StepScript no site autorizado para retomar.', tabId);
    return;
  }
  session.revision += 1;
  session.status = { ...session.status, selectedStepId: undefined,
    message: session.status.phase === 'paused' ? 'Gravação pausada após navegação. Retome na aba autorizada.'
      : 'Página alterada. Interaja com o próximo elemento para continuar.' };
  void hideHighlight();
  void persist().catch(() => undefined);
}

export async function acceptGuidedCapture(sender: chrome.runtime.MessageSender, url: string) {
  await restore();
  if (!session) return true;
  const current = session;
  const revision = current.revision;
  if (session.status.phase !== 'recording' || sender.tab?.id !== session.tabId
    || sender.frameId !== 0 || !sender.documentId) return false;
  const context = await validateActiveTabContext();
  if (!context || context.tabId !== session.tabId || context.url !== url) return false;
  const frame = await chrome.webNavigation.getFrame({ tabId: session.tabId, frameId: 0 });
  return session === current && current.revision === revision && session.status.phase === 'recording' && frame?.documentId === sender.documentId
    && frame.url === url && frame.documentLifecycle === 'active';
}

export async function highlightGuidedStep(step: RecordedStep, documentId?: string) {
  await restore();
  const current = session;
  if (!current || current.status.phase !== 'recording' || !documentId || !('id' in step) || typeof step.id !== 'string') return;
  current.documents.set(step.id, documentId);
  current.status = { ...current.status, selectedStepId: step.id };
  await persist();
  await showStep(step, documentId);
}

async function showStep(step: RecordedStep, documentId: string) {
  const current = session;
  if (!current) return;
  const revision = current.revision;
  const unavailable = (message: string) => {
    if (session === current && current.revision === revision) {
      current.status = { ...current.status, message };
      void persist().catch(() => undefined);
    }
    return guidedStatus();
  };
  await hideHighlight();
  const context = await validateActiveTabContext();
  if (!context || context.tabId !== current.tabId || context.url !== step.url)
    return unavailable('Este passo pertence a outra página. Volte à aba e ao documento de origem para revisar.');
  const parsed = new URL(context.url);
  if (!(await chrome.permissions.contains({ origins: [`${parsed.protocol}//${parsed.hostname}/*`] })))
    return unavailable('A autorização do site não está disponível. Reabra o StepScript para autorizar.');
  const frame = await chrome.webNavigation.getFrame({ tabId: current.tabId, frameId: 0 });
  if (frame?.documentId !== documentId || frame.url !== step.url || frame.documentLifecycle !== 'active')
    return unavailable('O documento deste passo mudou. Revise a descrição no painel.');
  if (!('selectors' in step) || !('recommended' in step.selectors))
    return unavailable('Este passo não possui um elemento para destacar.');
  const candidates = [step.selectors.recommended, ...step.selectors.alternatives];
  const candidate = candidates.find((item) => ['css', 'testId', 'id'].includes(item.strategy)
    && item.isUnique);
  if (!candidate) return unavailable('Não há seletor único para destacar. Revise a descrição no painel.');
  if (session !== current || current.revision !== revision) return guidedStatus();
  try {
    const response = await chrome.tabs.sendMessage(current.tabId, {
      type: 'SHOW_GUIDED_HIGHLIGHT', payload: { url: step.url,
        selector: { strategy: candidate.strategy, value: candidate.value, attribute: candidate.attribute } },
    }, { documentId });
    return unavailable(response?.success ? 'Elemento do passo destacado. A interação continua sob seu controle.'
      : 'O elemento não está mais disponível ou visível. A gravação pode continuar.');
  } catch { return unavailable('O elemento não está disponível neste documento. Revise o passo no painel.'); }
}

export async function controlGuidedRecording(action: 'pause' | 'resume' | 'review', stepId?: string): Promise<ExtensionResponse> {
  await restore();
  const current = session;
  if (!current) return { success: false, error: 'Inicie uma gravação guiada para usar este controle.' };
  const stored = await chrome.storage.local.get(['recordingState', 'recordedSteps']);
  const state = stored.recordingState as RecordingState | undefined;
  if (action === 'pause') {
    interruptGuidedRecording('Gravação pausada. As ações realizadas agora não serão capturadas.');
    return guidedStatus();
  }
  if (action === 'resume') {
    const revision = current.revision;
    const context = await validateActiveTabContext();
    if (current.closed || !state?.isRecording || !context || context.tabId !== current.tabId
      || new URL(context.url).origin !== current.origin) return { success: false, error: STALE_TAB_CONTEXT_MESSAGE };
    const frame = await chrome.webNavigation.getFrame({ tabId: current.tabId, frameId: 0 });
    if (!frame?.documentId || frame.documentLifecycle !== 'active' || frame.url !== context.url)
      return { success: false, error: 'Aguarde o documento autorizado terminar de carregar.' };
    await chrome.scripting.executeScript({ target: { tabId: current.tabId, documentIds: [frame.documentId] }, files: ['assets/recorder.js'] });
    if (session !== current || current.revision !== revision) return { success: false, error: STALE_TAB_CONTEXT_MESSAGE };
    await chrome.tabs.sendMessage(current.tabId, { type: 'ACTIVATE_CLICK_RECORDER' }, { documentId: frame.documentId });
    if (session !== current || current.revision !== revision) {
      await chrome.tabs.sendMessage(current.tabId, { type: 'DEACTIVATE_CLICK_RECORDER' }, { documentId: frame.documentId }).catch(() => undefined);
      return { success: false, error: STALE_TAB_CONTEXT_MESSAGE };
    }
    current.status = { phase: 'recording', message: 'Gravação retomada. Interaja com o próximo elemento.' };
    await persist();
    return guidedStatus();
  }
  if (current.status.phase === 'recording') {
    interruptGuidedRecording('Revisão dos passos. A captura está pausada.');
  }
  const steps: RecordedStep[] = Array.isArray(stored.recordedSteps) ? stored.recordedSteps : [];
  const step = steps.find((item) => 'id' in item && item.id === stepId);
  const documentId = stepId ? current.documents.get(stepId) : undefined;
  await hideHighlight();
  current.status = { ...current.status, selectedStepId: stepId,
    message: 'Passo sem elemento no documento atual. Revise a descrição no painel.' };
  await persist();
  return step && documentId ? (await showStep(step, documentId) ?? guidedStatus()) : guidedStatus();
}

export async function guidedTargetLost(sender: chrome.runtime.MessageSender) {
  await restore();
  if (session && sender.tab?.id === session.tabId && sender.frameId === 0
    && sender.documentId === session.documents.get(session.status.selectedStepId ?? '')) {
    session.status = { ...session.status, message: 'O elemento destacado foi removido ou ocultado. A gravação pode continuar.' };
    await persist();
  }
  return guidedStatus();
}
