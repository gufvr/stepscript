import type { ReplayOperation } from './replayPlan';

// Chrome serializes this function into the tab's isolated world. Keep it self-contained.
export function executeReplayOperation(operation: ReplayOperation, expectedUrl: string): { success: boolean; error?: string; url: string } {
  const fail = (error: string) => ({ success: false, error, url: location.href });
  if (location.href !== expectedUrl) return fail('A URL mudou antes de executar o passo.');
  if (operation.kind === 'url')
    return location.href === operation.expected ? { success: true, url: location.href } : fail('A URL atual é diferente da esperada.');

  const selector = operation.selector;
  const all = (query: string) => Array.from(document.querySelectorAll<HTMLElement>(query));
  const normalized = (value: string) => value.replace(/\s+/g, ' ').trim();
  const name = (element: HTMLElement) => normalized(
    element.getAttribute('aria-label') ||
    (element instanceof HTMLInputElement ? element.labels?.[0]?.textContent : '') ||
    element.textContent || '',
  );
  let matches: HTMLElement[];
  try {
    if (selector.strategy === 'testId') matches = all(`[${selector.attribute ?? 'data-testid'}="${CSS.escape(selector.value)}"]`);
    else if (selector.strategy === 'id') matches = all(`[id="${CSS.escape(selector.value)}"]`);
    else if (selector.strategy === 'css') matches = all(selector.value);
    else if (selector.strategy === 'label') matches = all('input, textarea, select').filter((element) =>
      element.getAttribute('aria-label') === selector.value ||
      (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) &&
      Array.from(element.labels ?? []).some((label) => normalized(label.textContent ?? '') === selector.value));
    else if (selector.strategy === 'role') {
      const role = selector.role ?? selector.value;
      const query = role === 'textbox' ? 'input, textarea, [role="textbox"]' :
        role === 'combobox' ? 'select, [role="combobox"]' :
        role === 'checkbox' ? 'input[type="checkbox"], [role="checkbox"]' :
        'input[type="radio"], [role="radio"]';
      matches = all(query).filter((element) => !selector.name || name(element) === selector.name);
    } else matches = all('*').filter((element) => normalized(element.innerText || '') === selector.value);
  } catch { return fail('O seletor não pôde ser usado nesta página.'); }

  if (matches.length !== 1) return fail('O seletor não encontrou um elemento único.');
  const element = matches[0];
  const visible = () => {
    const style = getComputedStyle(element);
    return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  if (operation.kind === 'visible') return visible() ? { success: true, url: location.href } : fail('O elemento não está visível.');
  if (operation.kind === 'text') {
    if (!visible() || ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(element.tagName)) return fail('O elemento não tem texto visível.');
    return normalized(element.innerText) === operation.expected ? { success: true, url: location.href } : fail('O texto visível é diferente do esperado.');
  }
  if (!visible()) return fail('O controle não está visível.');
  if (operation.kind === 'focus') {
    if (!element.matches('input, textarea, select, button, a[href], [tabindex]:not([tabindex="-1"])')) return fail('O destino de Tab não aceita foco.');
    element.focus();
    return document.activeElement === element ? { success: true, url: location.href } : fail('Não foi possível focar o destino de Tab.');
  }
  if (operation.kind === 'fill') {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) ||
        element.disabled || element.readOnly ||
        !['', 'text', 'email', 'search', 'tel', 'url'].includes(element instanceof HTMLInputElement ? element.type : '') ||
        /password|one-time-code|cc-|credit-card/i.test(element.getAttribute('autocomplete') ?? '')) return fail('Campo não é seguro para preenchimento.');
    element.focus();
    const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, operation.value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true, url: location.href };
  }
  if (operation.kind === 'check') {
    if (!(element instanceof HTMLInputElement) || element.disabled ||
        !['checkbox', 'radio'].includes(element.type) ||
        (element.type === 'radio' && !operation.checked)) return fail('Controle de seleção incompatível.');
    element.checked = operation.checked;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true, url: location.href };
  }
  if (!(element instanceof HTMLSelectElement) || element.disabled || element.multiple !== operation.multiple ||
      !operation.values.every((value) => Array.from(element.options).some((option) => option.value === value)))
    return fail('Opções de seleção incompatíveis.');
  for (const option of element.options) option.selected = operation.values.includes(option.value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return { success: true, url: location.href };
}
