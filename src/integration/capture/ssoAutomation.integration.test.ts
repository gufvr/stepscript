import { describe, expect, it, vi } from 'vitest';
import { ssoInPage } from '../../automation/ssoInPage';
import { createSsoStartStep } from '../../automation/createSsoRecordedSteps';
import { generatePlaywrightTest } from '../../shared/playwright/generatePlaywrightTest';
import { generateCypressTest } from '../../shared/cypress/generateCypressTest';

describe('assisted SSO capture pipeline', () => {
  it('keeps review metadata sanitized and records only the confirmed source action for both exports', () => {
    document.body.innerHTML = '<a id="google" href="https://accounts.google.com/o/oauth2/auth?state=secret&code=private">Continue with Google</a>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    const inspected = ssoInPage('inspect', location.href);
    const option = inspected.ssoOptions?.[0];
    expect(option?.canStart).toBe(true);
    expect(option?.destination).toBe('https://accounts.google.com/o/oauth2/auth');
    expect(JSON.stringify(inspected)).not.toMatch(/secret|private/);

    const step = createSsoStartStep('https://app.example.test/login?state=private', option!);
    const playwright = generatePlaywrightTest([step]).code;
    const cypress = generateCypressTest([step]).code;
    expect(step.url).toBe('https://app.example.test/login');
    expect(playwright).toContain('Continue with Google');
    expect(cypress).toContain('Continue with Google');
    expect(`${playwright}${cypress}${JSON.stringify(step)}`).not.toMatch(/accounts\.google|state=|code=private|secret/);
  });

  it('does not click until the explicit start phase and invokes the reviewed option only once', () => {
    document.body.innerHTML = '<a id="google" href="https://accounts.google.com/o/oauth2/auth?state=secret">Continue with Google</a>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    const element = document.getElementById('google')!;
    const click = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('click', click);
    const option = ssoInPage('inspect', location.href).ssoOptions![0];
    expect(click).not.toHaveBeenCalled();
    expect(ssoInPage('start', location.href, option.fingerprint, option.destination).success).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });
});
