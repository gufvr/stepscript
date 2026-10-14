import type { ExtensionResponse, LoginAutomationSelection } from '../shared/messages';

// Self-contained: chrome.scripting serializes this function into the selected document.
export function loginInPage(
  mode: 'inspect' | 'fill' | 'submit', expectedUrl: string, fingerprint: string,
  username: string, password: string, selection?: LoginAutomationSelection,
): ExtensionResponse {
  if (location.href !== expectedUrl) return { success: false, error: 'A URL mudou. Analise a página novamente.' };
  const visible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const textOf = (element: Element) => (element.textContent || (element as HTMLInputElement).value || '').replace(/\s+/g, ' ').trim();
  const nameOf = (element: Element) => [
    element.getAttribute('aria-label'), element.getAttribute('autocomplete'), element.getAttribute('placeholder'),
    element.getAttribute('name'), element.id,
    ...(element.getAttribute('aria-labelledby')?.split(/\s+/).map((id) => document.getElementById(id)?.textContent) ?? []),
    ...(element instanceof HTMLInputElement ? [...element.labels ?? []].map((label) => label.textContent) : []),
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  const selectorFor = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    const options = ['data-testid', 'data-cy', 'data-test', 'id', 'name'].flatMap((attribute) => {
      const value = element.getAttribute(attribute);
      return value ? [`${tag}[${attribute}=${JSON.stringify(value)}]`] : [];
    });
    const unique = (selector: string) => {
      try { const matches = document.querySelectorAll(selector); return matches.length === 1 && matches[0] === element; }
      catch { return false; }
    };
    const stable = options.find(unique);
    if (stable) return stable;
    const parts: string[] = [];
    for (let current: Element | null = element; current && current !== document.body; current = current.parentElement) {
      const siblings = current.parentElement ? [...current.parentElement.children].filter((child) => child.tagName === current!.tagName) : [];
      parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(current) + 1})`);
    }
    const path = `body > ${parts.join(' > ')}`;
    return unique(path) ? path : undefined;
  };
  const loginWords = /\b(login|log in|sign in|entrar|acessar|autenticar|otp|codigo|account|conta)\b/i;
  const identifierWords = /\b(user(name)?|usuario|email|e mail|login|telefone|phone|mobile|celular|account|conta)\b/i;
  const otpWords = /\b(otp|one time|verification code|codigo|verificacao|token|pin)\b/i;
  const actionWords = /^(login|log in|sign in|entrar|acessar|continuar|continue|next|avancar|proximo|submit|fetch otp|obter otp|buscar otp|enviar codigo|gerar otp)$/i;
  const inputVisible = (input: HTMLInputElement) => visible(input) && !input.disabled && !input.readOnly;
  const allInputs = [...document.querySelectorAll<HTMLInputElement>('input')].filter(inputVisible);
  const potentialIdentifiers = allInputs.filter((input) => ['text', 'email', 'tel', ''].includes(input.getAttribute('type') ?? 'text'))
    .filter((input) => input.maxLength !== 1 && !otpWords.test(normalize(nameOf(input))));
  const potentialPasswords = allInputs.filter((input) => input.type === 'password');
  const hashTarget = (() => {
    try { return location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; }
    catch { return null; }
  })();
  const rootOf = (input: HTMLInputElement) => {
    const form = input.closest('form');
    if (form) return form;
    if (hashTarget?.contains(input)) return hashTarget.closest('section, article, [role="form"]') ?? hashTarget;
    const section = input.closest('section, article, [role="form"]');
    if (section) return section;
    let ancestor = input.parentElement;
    for (let depth = 0; ancestor && ancestor !== document.body && depth < 6; depth += 1, ancestor = ancestor.parentElement) {
      if (ancestor.querySelectorAll('input').length > 12) continue;
      if ([...ancestor.querySelectorAll('button, input[type="submit"]')].some((button) => actionWords.test(normalize(textOf(button))))) return ancestor;
    }
    return null;
  };
  type Candidate = {
    root: Element; label: string; fingerprint: string;
    identifiers: { element: HTMLInputElement; selector: string; label: string }[];
    passwords: { element: HTMLInputElement; selector: string; label: string }[];
    actions: { element: HTMLElement; selector: string; label: string }[];
  };
  const roots = [...new Set([...potentialIdentifiers, ...potentialPasswords].map(rootOf).filter((root): root is Element => Boolean(root)))];
  const candidates: Candidate[] = [];
  for (const root of roots) {
    const passwords = potentialPasswords.filter((input) => root.contains(input));
    if (passwords.length > 1) continue; // Registration and password-change forms need manual review.
    const identifiers = potentialIdentifiers.filter((input) => root.contains(input))
      .sort((left, right) => Number(right.type === 'email' || right.type === 'tel' || identifierWords.test(normalize(nameOf(right))))
        - Number(left.type === 'email' || left.type === 'tel' || identifierWords.test(normalize(nameOf(left)))));
    const buttons = [...root.querySelectorAll<HTMLElement>('button, input[type="submit"]')]
      .filter((button) => visible(button) && !(button as HTMLButtonElement).disabled);
    const heading = textOf(root.querySelector('h1, h2, h3, legend') ?? root.closest('section, article')?.querySelector('h1, h2, h3, legend') ?? root);
    const context = normalize(`${heading.slice(0, 120)} ${root.id} ${root.getAttribute('aria-label') ?? ''}`);
    const actions = buttons.filter((button) => actionWords.test(normalize(textOf(button))))
      .filter((button) => !/^(submit|continue|next|continuar|avancar|proximo)$/i.test(normalize(textOf(button))) || loginWords.test(context))
      .sort((left, right) => Number(/otp|codigo/i.test(normalize(textOf(right)))) - Number(/otp|codigo/i.test(normalize(textOf(left)))));
    if ((!identifiers.length && !passwords.length) || !actions.length) continue;
    if (!loginWords.test(`${context} ${actions.map((button) => normalize(textOf(button))).join(' ')}`)) continue;
    const identified = identifiers.map((element) => ({ element, selector: selectorFor(element), label: nameOf(element) || element.type }));
    const secrets = passwords.map((element) => ({ element, selector: selectorFor(element), label: nameOf(element) || 'Senha' }));
    const choices = actions.map((element) => ({ element, selector: selectorFor(element), label: textOf(element) }));
    if ([...identified, ...secrets, ...choices].some((choice) => !choice.selector)) continue;
    const label = (heading.slice(0, 100) || `${identified[0]?.label ?? 'Senha'} — ${choices[0].label}`).trim();
    const fingerprint = [root.tagName, root.id, root.getAttribute('name'), identified[0]?.selector, secrets[0]?.selector, choices[0].selector].join('|');
    candidates.push({ root, label, fingerprint, identifiers: identified as Candidate['identifiers'], passwords: secrets as Candidate['passwords'], actions: choices as Candidate['actions'] });
  }
  const preferred = hashTarget ? candidates.filter(({ root }) => root === hashTarget || root.contains(hashTarget) || hashTarget.contains(root)) : [];
  const available = preferred.length ? preferred : candidates;
  if (mode === 'inspect') return { success: true, loginForms: available.map((form) => ({
    fingerprint: form.fingerprint, label: form.label, actionLabel: form.actions[0].label,
    requiresPassword: form.passwords.length > 0,
    identifiers: form.identifiers.map(({ selector, label }) => ({ selector, label })),
    passwords: form.passwords.map(({ selector, label }) => ({ selector, label })),
    actions: form.actions.map(({ selector, label }) => ({ selector, label })),
  })) };
  const selected = available.find((candidate) => candidate.fingerprint === fingerprint);
  if (!selected) return { success: false, error: 'O formulário mudou. Analise a página novamente.' };
  const identifier = selected.identifiers.find(({ selector }) => selector === (selection?.identifierSelector ?? selected.identifiers[0]?.selector));
  const secret = selected.passwords.find(({ selector }) => selector === (selection?.passwordSelector ?? selected.passwords[0]?.selector));
  const action = selected.actions.find(({ selector }) => selector === (selection?.actionSelector ?? selected.actions[0]?.selector));
  if (!action || (selected.identifiers.length && !identifier) || (selected.passwords.length && !secret)
    || (selection?.identifierSelector && !identifier) || (selection?.passwordSelector && !secret)) {
    return { success: false, error: 'Os campos escolhidos mudaram. Analise a página novamente.' };
  }
  if (mode === 'submit') {
    action.element.click();
    return { success: true, automationSteps: [`Ação “${action.label}” acionada uma vez. Confira a resposta da página.`] };
  }
  if (identifier && !username.trim()) return { success: false, error: 'Informe um identificador de teste.' };
  if (secret && !password) return { success: false, error: 'Informe uma senha de teste.' };
  const setValue = (element: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const metadata = identifier ? normalize([identifier.element.autocomplete, nameOf(identifier.element)].join(' ')).replace(/[^a-z0-9]+/g, ' ') : '';
  const identifierSensitiveReason = /\b(password|senha|passwd|pwd|passcode)\b/.test(metadata) ? 'password' as const
    : /\b(otp|one time code|codigo verificacao|verification code)\b/.test(metadata) ? 'one-time-code' as const
      : /\b(cvv|cvc|card number|numero cartao|cartao credito|credit card)\b/.test(metadata) ? 'payment' as const
        : /\b(cpf|cnpj|ssn|social security|documento identidade)\b/.test(metadata) ? 'personal-id' as const
          : /\b(api key|apikey|secret|token|access token|pin)\b/.test(metadata) ? 'secret' as const : undefined;
  const automationExport = {
    kind: 'login' as const, url: expectedUrl,
    identifierSelector: identifier?.selector, identifierInputType: identifier?.element.type, identifierSensitiveReason,
    passwordSelector: secret?.selector, actionSelector: action.selector,
    actionTagName: action.element.tagName.toLowerCase(), actionLabel: action.label.slice(0, 80),
    requiresPassword: Boolean(secret),
  };
  if (identifier) setValue(identifier.element, username);
  if (secret) setValue(secret.element, password);
  return { success: true, automationExport, automationSteps: [
    `Formulário identificado: ${selected.label}.`,
    ...(identifier ? ['Identificador de teste preenchido.'] : []),
    ...(secret ? ['Senha usada somente nesta execução; valor não salvo.'] : ['Este formulário não possui campo de senha.']),
  ] };
}
