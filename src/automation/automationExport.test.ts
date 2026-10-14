import { describe, expect, it } from 'vitest';
import { generateAutomationExport } from './automationExport';

describe('automation exports', () => {
  it('generates login tests without copying credentials or URL query values', () => {
    const plan = { kind: 'login' as const, url: 'https://example.test/login?token=private#form',
      identifierSelector: 'input[data-testid="user"]', passwordSelector: 'input[data-testid="password"]',
      actionSelector: 'button[data-testid="submit"]', requiresPassword: true };
    for (const framework of ['playwright', 'cypress'] as const) {
      const code = generateAutomationExport(framework, plan);
      expect(code).toContain('TEST_USERNAME');
      expect(code).toContain('TEST_PASSWORD');
      expect(code).toContain('button[data-testid=');
      expect(code).not.toContain('token=private');
      expect(code).toContain('TODO: assert the expected result');
    }
  });

  it('omits password setup for passwordless OTP flows', () => {
    const plan = { kind: 'login' as const, url: 'https://example.test/#otp-login',
      identifierSelector: 'input[id="username"]', actionSelector: 'button[id="fetch-otp"]', requiresPassword: false };
    expect(generateAutomationExport('playwright', plan)).not.toContain('TEST_PASSWORD');
    expect(generateAutomationExport('cypress', plan)).not.toContain('TEST_PASSWORD');
    expect(generateAutomationExport('playwright', plan)).toContain('#otp-login');
  });

  it('omits username setup for a second step with only a password', () => {
    const plan = { kind: 'login' as const, url: 'https://example.test/login',
      passwordSelector: 'input[id="password"]', actionSelector: 'button[id="enter"]', requiresPassword: true };
    for (const framework of ['playwright', 'cypress'] as const) {
      const code = generateAutomationExport(framework, plan);
      expect(code).toContain('TEST_PASSWORD');
      expect(code).not.toContain('TEST_USERNAME');
    }
  });

  it('exports observed visible-error checks with a reproduction TODO', () => {
    const plan = { kind: 'visible-errors' as const, url: 'https://example.test/form', foundErrors: true };
    expect(generateAutomationExport('playwright', plan)).toContain('toBeVisible');
    expect(generateAutomationExport('cypress', plan)).toContain('should("exist")');
  });
});
