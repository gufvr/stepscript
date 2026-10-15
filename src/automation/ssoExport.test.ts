import { describe, expect, it } from 'vitest';
import { createSsoStartStep } from './createSsoRecordedSteps';
import { generateSsoExport } from './ssoExport';

const option = { fingerprint: 'reviewed', provider: 'Google', actionLabel: 'Continue with Google',
  destination: 'https://accounts.google.com/o/oauth2/v2/auth', actionSelector: 'a#sso', actionTagName: 'a', canStart: true };

describe('SSO exports', () => {
  it.each(['playwright', 'cypress'] as const)('generates a %s source action and leaves external steps manual', (framework) => {
    const step = createSsoStartStep('https://app.example.test/login/QA_FAKE_CODE?state=secret', option);
    const code = generateSsoExport(framework, step);
    expect(code).toContain('https://app.example.test/login');
    expect(code).toContain('Continue with Google');
    expect(code).toContain('TODO StepScript: autenticação no provedor externo, MFA, CAPTCHA e consentimento são manuais.');
    expect(code).toContain('TODO StepScript: após o retorno');
    expect(code).not.toMatch(/QA_FAKE_CODE|state=secret|accounts\.google\.com/);
    expect(code).not.toMatch(/\.fill\(|\.type\(/);
  });
});
