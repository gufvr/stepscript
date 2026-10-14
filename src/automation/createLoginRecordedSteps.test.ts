import { describe, expect, it } from 'vitest';
import { createLoginRecordedSteps } from './createLoginRecordedSteps';

const plan = {
  kind: 'login' as const,
  url: 'https://example.test/login',
  identifierSelector: 'input[name="email"]',
  identifierInputType: 'email',
  passwordSelector: 'input[type="password"]',
  actionSelector: 'button[type="submit"]',
  actionTagName: 'button',
  actionLabel: 'Entrar',
  requiresPassword: true,
};

describe('createLoginRecordedSteps', () => {
  it('records the identifier and submit action while protecting the password', () => {
    const steps = createLoginRecordedSteps(plan, 'qa@example.test');
    expect(steps.map((step) => step.type)).toEqual(['field-fill', 'field-fill', 'click']);
    expect(steps[0]).toMatchObject({ value: { kind: 'plain', value: 'qa@example.test' } });
    expect(steps[1]).toMatchObject({ value: { kind: 'protected', reason: 'password' } });
    expect(steps[2]).toMatchObject({ element: { text: 'Entrar' } });
    expect(JSON.stringify(steps)).not.toContain('fake-password');
  });

  it('handles login forms without a password', () => {
    const steps = createLoginRecordedSteps({ ...plan, requiresPassword: false, passwordSelector: undefined }, 'tester');
    expect(steps.map((step) => step.type)).toEqual(['field-fill', 'click']);
  });

  it('protects identifiers classified as sensitive by the same capture policy', () => {
    const steps = createLoginRecordedSteps({ ...plan, identifierSensitiveReason: 'personal-id' }, '123456789');
    expect(steps[0]).toMatchObject({ value: { kind: 'protected', reason: 'personal-id' } });
    expect(JSON.stringify(steps)).not.toContain('123456789');
  });

  it('does not persist query or token fragments from a login URL', () => {
    const steps = createLoginRecordedSteps({ ...plan, url: 'https://example.test/login?token=private#access_token' }, 'qa');
    expect(steps.map((step) => step.url)).toEqual(Array(3).fill('https://example.test/login'));
    expect(JSON.stringify(steps)).not.toContain('private');
  });
});
