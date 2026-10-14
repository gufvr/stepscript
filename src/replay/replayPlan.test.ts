import { describe, expect, it } from 'vitest';
import { createReplayPlan } from './replayPlan';

const origin = 'https://example.test';
const selector = {
  recommended: { strategy: 'testId', value: 'email', score: 100, isUnique: true,
    validation: { status: 'valid', matchCount: 1, matchesTarget: true } },
  alternatives: [],
};
const common = { id: 'step', timestamp: 1, url: `${origin}/login`, selectors: selector };

describe('createReplayPlan', () => {
  it('keeps ordinary fields, Tab, and assertions while skipping actions and protected values', () => {
    const steps = [
      { ...common, schemaVersion: 5, type: 'field-fill', element: { tagName: 'input', inputType: 'email' }, value: { kind: 'plain', value: 'qa@example.test' } },
      { ...common, schemaVersion: 5, type: 'field-fill', element: { tagName: 'input', inputType: 'password' }, value: { kind: 'protected', reason: 'password' } },
      { ...common, schemaVersion: 4, type: 'click' },
      { ...common, schemaVersion: 4, type: 'focus-navigation', key: 'Tab', direction: 'forward' },
      { ...common, schemaVersion: 11, type: 'assertion', assertion: { kind: 'url', operator: 'equals', expected: `${origin}/login` } },
      { ...common, schemaVersion: 12, type: 'assertion', assertion: { kind: 'element', operator: 'visible' } },
      { ...common, schemaVersion: 13, type: 'assertion', assertion: { kind: 'element', operator: 'text-equals', expected: 'Bem-vindo' } },
    ];
    const plan = createReplayPlan(steps, origin);
    expect(plan.map((step) => step.operation?.kind ?? 'skipped')).toEqual([
      'fill', 'skipped', 'skipped', 'focus', 'url', 'visible', 'text',
    ]);
    expect(JSON.stringify(plan)).not.toContain('password');
  });

  it('rejects ambiguous selectors, other origins and unnormalized text', () => {
    const ambiguous = { recommended: { ...selector.recommended, validation: { status: 'ambiguous', matchCount: 2, matchesTarget: true } }, alternatives: [] };
    const steps = [
      { ...common, schemaVersion: 5, type: 'field-fill', selectors: ambiguous, element: { tagName: 'input', inputType: 'text' }, value: { kind: 'plain', value: 'safe' } },
      { ...common, schemaVersion: 11, type: 'assertion', assertion: { kind: 'url', operator: 'equals', expected: 'https://other.test/' } },
      { ...common, schemaVersion: 13, type: 'assertion', assertion: { kind: 'element', operator: 'text-equals', expected: 'a  b' } },
      { ...common, schemaVersion: 5, type: 'field-fill', url: 'https://other.test/', element: { tagName: 'input', inputType: 'text' }, value: { kind: 'plain', value: 'safe' } },
    ];
    expect(createReplayPlan(steps, origin).every((step) => !step.operation && step.reason)).toBe(true);
  });

  it('skips steps captured at another URL on the same origin', () => {
    const plan = createReplayPlan([{
      ...common, url: `${origin}/dashboard`, schemaVersion: 5, type: 'field-fill',
      element: { tagName: 'input', inputType: 'text' }, value: { kind: 'plain', value: 'safe' },
    }], origin, `${origin}/login`);
    expect(plan[0]).toMatchObject({ reason: 'Passo gravado em outra URL.' });
  });
});
