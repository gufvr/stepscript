import type { ExtensionResponse, SsoAutomationOption } from '../shared/messages';
import { validateActiveTabContext } from '../services/activeTabContext';
import { getReplayStatus } from '../replay/replaySession';
import { ssoInPage } from './ssoInPage';

export interface SsoAutomationContext {
  tabId: number;
  url: string;
  origin: string;
  documentId: string;
}

export async function runSsoAutomation(
  request: { kind: 'inspect' } | { kind: 'start'; fingerprint: string; destination: string; documentId: string },
  beforeStart?: (context: SsoAutomationContext, option: SsoAutomationOption) => Promise<void>,
): Promise<ExtensionResponse> {
  if (getReplayStatus().replayStatus?.phase === 'running') return { success: false, error: 'Interrompa a execução em andamento.' };
  const context = await validateActiveTabContext();
  if (!context || !/^https?:\/\//.test(context.url)) return { success: false, error: 'Reabra o StepScript na aba do site de origem.' };
  const sourceUrl = new URL(context.url);
  if (!await chrome.permissions.contains({ origins: [`${sourceUrl.protocol}//${sourceUrl.hostname}/*`] }))
    return { success: false, error: 'Autorize o site de origem para analisar as opções SSO.' };
  const state = await chrome.storage.local.get('recordingState');
  if ((state.recordingState as { isRecording?: boolean } | undefined)?.isRecording)
    return { success: false, error: 'Pare a gravação antes de iniciar SSO assistido.' };
  const frame = await chrome.webNavigation.getFrame({ tabId: context.tabId, frameId: 0 });
  if (!frame?.documentId || frame.documentLifecycle !== 'active' || frame.url !== context.url)
    return { success: false, error: 'A página mudou. Reabra o StepScript e analise novamente.' };
  const executionContext = { tabId: context.tabId, url: context.url, origin: sourceUrl.origin, documentId: frame.documentId };
  if (request.kind === 'inspect') {
    const inspected = await chrome.scripting.executeScript({
      target: { tabId: context.tabId, documentIds: [frame.documentId] }, func: ssoInPage,
      args: ['inspect', context.url, '', ''],
    });
    const result = inspected[0]?.result;
    return result ? { ...result, ssoDocumentId: frame.documentId } : { success: false, error: 'Não foi possível inspecionar as opções SSO.' };
  }
  if (request.documentId !== frame.documentId) return { success: false, error: 'A página mudou desde a revisão SSO. Analise novamente.' };
  const inspected = await chrome.scripting.executeScript({
    target: { tabId: context.tabId, documentIds: [frame.documentId] }, func: ssoInPage,
    args: ['inspect', context.url, '', ''],
  });
  const options = inspected[0]?.result?.ssoOptions ?? [];
  const chosen = options.find((option) => option.fingerprint === request.fingerprint && option.destination === request.destination);
  if (!chosen) return { success: false, error: 'A opção SSO ou o destino mudou. Analise novamente antes de iniciar.' };
  if (!chosen.canStart) return { success: false, error: chosen.manualReason ?? 'Este fluxo precisa ser iniciado manualmente.' };
  await beforeStart?.(executionContext, chosen);
  const started = await chrome.scripting.executeScript({
    target: { tabId: context.tabId, documentIds: [frame.documentId] }, func: ssoInPage,
    args: ['start', context.url, request.fingerprint, request.destination],
  });
  const result = started[0]?.result;
  if (!result?.success) return result ?? { success: false, error: 'Não foi possível iniciar a opção SSO.' };
  return result;
}
