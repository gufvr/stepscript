import type { ExtensionResponse, SsoAutomationOption } from '../shared/messages';

// Serialized into the authorized source page; it never reads credentials or external pages.
export function ssoInPage(
  mode: 'inspect' | 'start', expectedUrl: string, fingerprint = '', reviewedDestination = '',
): ExtensionResponse {
  if (location.href !== expectedUrl) return { success: false, error: 'A página mudou. Analise novamente.' };
  const visible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const redactDisplayText = (value: string) => value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/\b(?:\+?\d[\d ().-]{7,}\d)\b/g, '[redacted]')
    .replace(/\b(?:continue|sign in|log in|login|entrar|continuar)\s+as\s+[^.,;]+/gi, '[redacted account]')
    .replace(/\b[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\b/gi, '[redacted]')
    .replace(/\b[a-f\d]{32,}\b/gi, '[redacted]');
  const textOf = (element: Element) => redactDisplayText([element.getAttribute('aria-label'), element.getAttribute('title'), element.textContent]
    .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 180));
  const selectorFor = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    for (const attribute of ['data-testid', 'data-cy', 'id', 'name', 'aria-label']) {
      const value = element.getAttribute(attribute);
      if (!value || value.length > 100 || /password|passwd|token|secret|cookie|session|auth.?code|credential|mfa|otp/i.test(value)
        || /[a-f\d]{32,}/i.test(value) || /\b[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\b/i.test(value)
        || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) continue;
      const selector = `${tag}[${attribute}=${JSON.stringify(value)}]`;
      try { if (document.querySelectorAll(selector).length === 1) return selector; } catch { /* try another selector */ }
    }
    const parts: string[] = [];
    for (let current: Element | null = element; current && current !== document.body; current = current.parentElement) {
      const siblings = current.parentElement ? [...current.parentElement.children].filter((child) => child.tagName === current!.tagName) : [];
      parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`);
    }
    const selector = `body > ${parts.join(' > ')}`;
    try { return document.querySelectorAll(selector).length === 1 ? selector : ''; } catch { return ''; }
  };
  const safeDestination = (value: string) => {
    try {
      const url = new URL(value, location.href);
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      url.search = '';
      url.hash = '';
      url.pathname = url.pathname.replace(/\/(?:[a-f\d]{32,}|[a-z\d_-]{40,}|[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}|[^/]+@[^/]+)(?=\/|$)/ig, '/[redacted]');
      return url.toString();
    } catch { return ''; }
  };
  const providerFromHost = (hostname: string) => {
    const host = hostname.toLowerCase();
    if (host === 'accounts.google.com' || host === 'oauth2.googleapis.com' || host === 'accounts.youtube.com') return 'Google';
    if (host === 'login.microsoftonline.com' || host === 'login.live.com' || host === 'login.microsoft.com') return 'Microsoft';
    if (/(^|\.)(okta\.com|oktapreview\.com|okta-emea\.com|okta-gov\.com)$/.test(host)) return 'Okta';
    return '';
  };
  const providerFromText = (value: string) => {
    const text = normalize(value);
    if (/\bgoogle\b/.test(text)) return 'Google';
    if (/\b(microsoft|office 365|microsoft 365|azure ad)\b/.test(text)) return 'Microsoft';
    if (/\bokta\b/.test(text)) return 'Okta';
    return '';
  };
  const elements = [...document.querySelectorAll<HTMLElement>('a[href], button, [role="button"]')].filter(visible);
  const options: SsoAutomationOption[] = [];
  for (const element of elements) {
    const label = textOf(element);
    const direct = element instanceof HTMLAnchorElement ? element.href
      : element.getAttribute('data-href') || element.getAttribute('data-url') || element.getAttribute('formaction') || '';
    if (!direct) continue;
    let target: URL;
    try { target = new URL(direct, location.href); } catch { continue; }
    const intentText = normalize(`${label} ${element.getAttribute('data-provider') ?? ''} ${element.getAttribute('data-auth-provider') ?? ''}`);
    const protocolText = normalize(`${target.pathname} ${[...target.searchParams.keys()].join(' ')}`);
    const queryKeys = new Set([...target.searchParams.keys()].map((key) => key.toLowerCase()));
    const oauthQueryEvidence = queryKeys.has('client_id') && (queryKeys.has('response_type') || queryKeys.has('redirect_uri'));
    const authEvidence = /\b(sso|single sign on|oauth|openid|saml|sign in with|log in with|login with|continue with|entrar com|acessar com|continuar com)\b/.test(intentText)
      || /oauth|openid|saml|sso|authorize|authorization/.test(protocolText) || oauthQueryEvidence || queryKeys.has('samlrequest');
    if (!authEvidence) continue;
    const hostProvider = providerFromHost(target.hostname);
    const textProvider = providerFromText(intentText);
    const provider = hostProvider || textProvider || 'Provedor não identificado';
    const destination = safeDestination(target.toString());
    if (!destination) continue;
    const external = target.origin !== location.origin;
    const knownProviderHost = Boolean(hostProvider);
    const canStart = external && target.protocol === 'https:' && knownProviderHost && (!textProvider || textProvider === hostProvider);
    const manualReason = canStart ? undefined
      : !external ? 'O destino permanece no site atual; confira o fluxo manualmente.'
        : !knownProviderHost ? 'O provedor externo não foi reconhecido com segurança; continue manualmente.'
          : textProvider && textProvider !== hostProvider ? 'O provedor indicado não corresponde ao domínio do destino; continue manualmente.'
            : 'O destino não pôde ser validado; continue manualmente.';
    const actionSelector = selectorFor(element);
    if (!actionSelector) continue;
    const fingerprint = [actionSelector, destination, provider, label].join('|');
    options.push({ fingerprint, provider, actionLabel: label || 'Abrir autenticação federada', destination,
      actionSelector, actionTagName: element.tagName.toLowerCase(), canStart, ...(manualReason ? { manualReason } : {}) });
  }
  if (mode === 'inspect') return { success: true, ssoOptions: options };
  const chosen = options.find((option) => option.fingerprint === fingerprint && option.destination === reviewedDestination);
  if (!chosen) return { success: false, error: 'A opção SSO ou o destino mudou. Analise novamente antes de iniciar.' };
  if (!chosen.canStart) return { success: false, error: chosen.manualReason ?? 'Este fluxo precisa ser iniciado manualmente.' };
  const action = document.querySelector(chosen.actionSelector);
  if (!(action instanceof HTMLElement) || !visible(action)) return { success: false, error: 'A opção SSO não está mais disponível.' };
  action.click();
  return { success: true, ssoOptions: [chosen], automationSteps: [`Início do SSO ${chosen.provider} acionado uma vez. Conclua a autenticação manualmente e volte ao site de origem.`] };
}
