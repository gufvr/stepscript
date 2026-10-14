import type { ResolvedSelector } from '../shared/selectors/resolveRecommendedSelector';
import { resolveRecommendedSelector } from '../shared/selectors/resolveRecommendedSelector';

export type ReplayOperation =
  | { kind: 'fill'; selector: ResolvedSelector; value: string }
  | { kind: 'select'; selector: ResolvedSelector; values: string[]; multiple: boolean }
  | { kind: 'check'; selector: ResolvedSelector; checked: boolean }
  | { kind: 'focus'; selector: ResolvedSelector }
  | { kind: 'url'; expected: string }
  | { kind: 'visible'; selector: ResolvedSelector }
  | { kind: 'text'; selector: ResolvedSelector; expected: string };

export interface ReplayPlanStep {
  index: number;
  label: string;
  operation?: ReplayOperation;
  reason?: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function selectorFor(step: Record<string, unknown>): ResolvedSelector | undefined {
  const candidate = record(record(step.selectors)?.recommended);
  const validation = record(candidate?.validation);
  if (candidate?.isUnique !== true || validation?.status !== 'valid' ||
      validation.matchCount !== 1 || validation.matchesTarget !== true ||
      (Array.isArray(candidate.warnings) && candidate.warnings.includes('dynamic-id'))) return undefined;
  const selector = resolveRecommendedSelector(step);
  if (!selector || selector.value.length > 500 ||
      (selector.strategy === 'role' && !['textbox', 'checkbox', 'radio', 'combobox'].includes(selector.role ?? ''))) return undefined;
  return selector;
}

function label(step: Record<string, unknown>, index: number): string {
  const description = record(step.descriptionOverride);
  if (typeof description?.text === 'string' && description.text.trim()) return description.text.slice(0, 120);
  const type = step.type === 'assertion' ? 'Verificação' :
    step.type === 'field-fill' ? 'Preenchimento' :
    step.type === 'selection-change' ? 'Seleção' :
    step.type === 'focus-navigation' ? 'Tab' : 'Ação';
  return `${index + 1}. ${type}`;
}

export function createReplayPlan(steps: readonly unknown[], origin: string, currentUrl?: string): ReplayPlanStep[] {
  return steps.map((raw, index) => {
    const step = record(raw);
    const item: ReplayPlanStep = { index, label: step ? label(step, index) : `${index + 1}. Ação` };
    const skip = (reason: string) => ({ ...item, reason });
    if (!step || typeof step.url !== 'string') return skip('Registro incompleto.');
    try {
      if (new URL(step.url).origin !== origin) return skip('Passo de outra origem.');
    } catch { return skip('URL inválida.'); }
    if (currentUrl && step.url !== currentUrl) return skip('Passo gravado em outra URL.');

    if (step.type === 'field-fill' && step.schemaVersion === 5) {
      const selector = selectorFor(step);
      const element = record(step.element);
      const value = record(step.value);
      if (!selector || !element || !value || value.kind !== 'plain' || value.truncated ||
          typeof value.value !== 'string' || value.value.length > 1000 ||
          !['input', 'textarea'].includes(String(element.tagName).toLowerCase()) ||
          !['', 'text', 'email', 'search', 'tel', 'url'].includes(String(element.inputType ?? '').toLowerCase())) {
        return skip('Campo sensível, truncado ou seletor incompatível.');
      }
      return { ...item, operation: { kind: 'fill', selector, value: value.value } };
    }

    if (step.type === 'selection-change' && step.schemaVersion === 6) {
      const selector = selectorFor(step);
      const control = record(step.control);
      if (!selector || !control) return skip('Seleção sem seletor único válido.');
      if (control.kind === 'checkbox' && typeof control.checked === 'boolean')
        return { ...item, operation: { kind: 'check', selector, checked: control.checked } };
      if (control.kind === 'radio' && control.checked === true)
        return { ...item, operation: { kind: 'check', selector, checked: true } };
      if (control.kind === 'select' && typeof control.multiple === 'boolean') {
        const selection = record(control.selection);
        const options = selection?.options;
        if (selection?.kind === 'plain' && !selection.truncated && Array.isArray(options) &&
            options.length > 0 && options.length <= 20 && options.every((option) =>
              typeof record(option)?.value === 'string' && String(record(option)?.value).length <= 200) &&
            (control.multiple || options.length === 1)) {
          return { ...item, operation: { kind: 'select', selector, multiple: control.multiple, values: options.map((option) => String(record(option)?.value)) } };
        }
      }
      return skip('Seleção protegida ou incompatível.');
    }

    if (step.type === 'focus-navigation' && step.schemaVersion === 4 && step.key === 'Tab' &&
        ['forward', 'backward'].includes(String(step.direction))) {
      const selector = selectorFor(step);
      return selector ? { ...item, operation: { kind: 'focus', selector } } : skip('Tab sem destino único válido.');
    }

    if (step.type === 'assertion' && step.schemaVersion === 11) {
      const assertion = record(step.assertion);
      if (assertion?.kind === 'url' && assertion.operator === 'equals' && typeof assertion.expected === 'string') {
        try {
          if (new URL(assertion.expected).origin === origin) return { ...item, operation: { kind: 'url', expected: assertion.expected } };
        } catch { /* Invalid assertions remain skipped. */ }
      }
      return skip('Verificação de URL inválida.');
    }

    if (step.type === 'assertion' && [12, 13].includes(Number(step.schemaVersion))) {
      const selector = selectorFor(step);
      const assertion = record(step.assertion);
      if (!selector || assertion?.kind !== 'element') return skip('Verificação sem seletor único válido.');
      if (step.schemaVersion === 12 && assertion.operator === 'visible')
        return { ...item, operation: { kind: 'visible', selector } };
      if (step.schemaVersion === 13 && assertion.operator === 'text-equals' &&
          typeof assertion.expected === 'string' && assertion.expected.length > 0 &&
          assertion.expected.length <= 200 && assertion.expected === assertion.expected.replace(/\s+/g, ' ').trim())
        return { ...item, operation: { kind: 'text', selector, expected: assertion.expected } };
      return skip('Verificação de texto inválida.');
    }
    return skip('Ação não suportada nesta primeira versão.');
  });
}
