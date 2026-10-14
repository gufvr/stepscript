import type { ExtensionResponse } from '../shared/messages';
import { validateActiveTabContext } from '../services/activeTabContext';
import { getReplayStatus } from '../replay/replaySession';
import { loginInPage } from './loginInPage';
import type { LoginAutomationSelection } from '../shared/messages';

export type QuickAutomationKind = 'inspect-login' | 'login' | 'visible-errors' | 'technical-errors';

export async function runQuickAutomation(payload: {
  kind: QuickAutomationKind;
  username?: string;
  password?: string;
  loginFingerprint?: string;
  loginDocumentId?: string;
  loginSelection?: LoginAutomationSelection;
}): Promise<ExtensionResponse> {
  if (!['inspect-login', 'login', 'visible-errors', 'technical-errors'].includes(payload.kind))
    return { success: false, error: 'Tipo de automação inválido.' };
  if (getReplayStatus().replayStatus?.phase === 'running')
    return { success: false, error: 'Interrompa a execução em andamento.' };
  const context = await validateActiveTabContext();
  if (!context || !/^https?:\/\//.test(context.url))
    return { success: false, error: 'Reabra o StepScript pelo ícone na aba desejada.' };
  const parsedUrl = new URL(context.url);
  if (!await chrome.permissions.contains({ origins: [`${parsedUrl.protocol}//${parsedUrl.hostname}/*`] }))
    return { success: false, error: 'Autorize o site para executar a automação.' };
  if (payload.kind !== 'inspect-login') {
    const state = await chrome.storage.local.get('recordingState');
    if ((state.recordingState as { isRecording?: boolean } | undefined)?.isRecording)
      return { success: false, error: 'Pare a gravação antes de executar a automação.' };
  }
  const frame = await chrome.webNavigation.getFrame({ tabId: context.tabId, frameId: 0 });
  if (!frame?.documentId || frame.documentLifecycle !== 'active' || frame.url !== context.url)
    return { success: false, error: 'A página mudou. Reabra o StepScript e tente novamente.' };
  if (payload.kind === 'login' && (!payload.loginFingerprint || !payload.loginSelection?.actionSelector
    || payload.loginDocumentId !== frame.documentId
    || (payload.loginSelection.identifierSelector && !payload.username?.trim())
    || (payload.loginSelection.passwordSelector && !payload.password)))
    return { success: false, error: 'O formulário mudou. Inspecione novamente antes de executar.' };

  try {
    if (payload.kind === 'login') {
      const filled = await chrome.scripting.executeScript({
        target: { tabId: context.tabId, documentIds: [frame.documentId] },
        func: loginInPage,
        args: ['fill', context.url, payload.loginFingerprint ?? '', payload.username ?? '', payload.password ?? '', payload.loginSelection],
      });
      const fillResult = filled[0]?.result;
      if (!fillResult?.success) return fillResult ?? { success: false, error: 'Não foi possível preparar este login.' };
      const latest = await validateActiveTabContext();
      const latestFrame = latest && await chrome.webNavigation.getFrame({ tabId: latest.tabId, frameId: 0 });
      if (!latest || latest.tabId !== context.tabId || latest.url !== context.url || latestFrame?.documentId !== frame.documentId)
        return { success: false, error: 'A página mudou antes do envio. Inspecione novamente.' };
      try {
        const submitted = await chrome.scripting.executeScript({
          target: { tabId: context.tabId, documentIds: [frame.documentId] },
          func: loginInPage,
          args: ['submit', context.url, payload.loginFingerprint ?? '', '', '', payload.loginSelection],
        });
        const submitResult = submitted[0]?.result;
        if (!submitResult?.success) return submitResult ?? { success: false, error: 'O formulário mudou antes do envio.' };
        return { success: true, automationExport: fillResult.automationExport,
          automationSteps: [...(fillResult.automationSteps ?? []), ...(submitResult.automationSteps ?? [])] };
      } catch {
        const currentFrame = await chrome.webNavigation.getFrame({ tabId: context.tabId, frameId: 0 }).catch(() => undefined);
        if (currentFrame?.documentId === frame.documentId) {
          return { success: false, error: 'Não foi possível confirmar o envio. Confira a página antes de tentar novamente.' };
        }
        return { success: true, automationExport: fillResult.automationExport,
          automationSteps: [...(fillResult.automationSteps ?? []), 'A página navegou durante o envio; confira o resultado antes de repetir.'] };
      }
    }
    const result = payload.kind === 'inspect-login'
      ? await chrome.scripting.executeScript({
        target: { tabId: context.tabId, documentIds: [frame.documentId] },
        func: loginInPage,
        args: ['inspect', context.url, '', '', ''],
      })
      : await chrome.scripting.executeScript({
        target: { tabId: context.tabId, documentIds: [frame.documentId] },
        func: runInPage,
        args: [payload.kind, context.url],
      });
    const outcome = result[0]?.result;
    if (!outcome) return { success: false, error: 'Não foi possível inspecionar esta página.' };
    return payload.kind === 'inspect-login' ? { ...outcome, loginDocumentId: frame.documentId } : outcome;
  } catch {
    return { success: false, error: 'A página mudou ou bloqueou a automação.' };
  }
}

// Serialized by chrome.scripting into the authorized main frame. Never stores credentials.
export function runInPage(kind: 'visible-errors' | 'technical-errors', expectedUrl: string): ExtensionResponse {
  if (location.href !== expectedUrl) return { success: false, error: 'A URL mudou. Confirme novamente.' };
  const visible = (element: Element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  if (kind === 'visible-errors') {
    const found = [...document.querySelectorAll('[role="alert"], [aria-invalid="true"], .error, .invalid-feedback, [data-error]')]
      .filter(visible)
      .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 180))
      .filter(Boolean)
      .slice(0, 20);
    return { success: true, automationExport: { kind: 'visible-errors', url: expectedUrl, foundErrors: found.length > 0 }, automationSteps: found.length ? found.map((message) => `Erro visível: ${message}`) : ['Nenhuma mensagem de erro visível encontrada nos elementos comuns de validação.'] };
  }
  if (kind === 'technical-errors') {
    const resources = [
      ...performance.getEntriesByType('navigation'),
      ...performance.getEntriesByType('resource'),
    ] as PerformanceResourceTiming[];
    const failed = resources.filter((entry) => entry.responseStatus >= 400).slice(0, 20);
    return { success: true, automationExport: { kind: 'technical-errors', url: expectedUrl, foundErrors: failed.length > 0 }, automationSteps: failed.length
      ? failed.map((entry) => `Recurso HTTP ${entry.responseStatus}: ${new URL(entry.name).pathname.slice(0, 120)}`)
      : ['Nenhum erro HTTP observável nos recursos desta página. Console e respostas sem Timing-Allow-Origin não são acessíveis nesta verificação.'] };
  }
  return { success: false, error: 'Tipo de automação incompatível com esta página.' };
}
