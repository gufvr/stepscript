import { afterEach, describe, expect, it, vi } from 'vitest';
import { ssoInPage } from './ssoInPage';

describe('assisted SSO page inspection', () => {
  afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('detects a known provider and sanitizes destination parameters', () => {
    document.body.innerHTML = '<a id="google" href="https://accounts.google.com/o/oauth2/v2/auth?state=private&client_id=123#secret">Continue with Google</a>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    const result = ssoInPage('inspect', location.href);
    expect(result.ssoOptions).toHaveLength(1);
    expect(result.ssoOptions?.[0]).toMatchObject({ provider: 'Google', canStart: true, destination: 'https://accounts.google.com/o/oauth2/v2/auth' });
    expect(JSON.stringify(result)).not.toContain('private');
  });

  it('shows unrecognized external destinations for manual completion only', () => {
    document.body.innerHTML = '<a href="https://idp-unknown.example/saml/login?token=private">Continue with Acme SSO</a>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    const option = ssoInPage('inspect', location.href).ssoOptions?.[0];
    expect(option).toMatchObject({ provider: 'Provedor não identificado', canStart: false });
    expect(option?.manualReason).toMatch(/manualmente/);
    expect(option?.destination).not.toContain('token=');
  });

  it('redacts personal display text and secret-like selectors before review', () => {
    document.body.innerHTML = '<a id="oauth-secret-session" href="https://accounts.google.com/o/oauth2/auth?state=private">Continue with Google user@example.test</a>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    const option = ssoInPage('inspect', location.href).ssoOptions?.[0];
    expect(option?.actionLabel).not.toContain('user@example.test');
    expect(option?.actionSelector).not.toContain('oauth-secret-session');
    expect(option?.destination).not.toContain('private');
  });

  it('starts only the reviewed action and refuses a changed destination', () => {
    document.body.innerHTML = '<a id="google" href="https://accounts.google.com/o/oauth2/v2/auth?state=secret">Continue with Google</a>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    const option = ssoInPage('inspect', location.href).ssoOptions![0];
    const click = vi.fn();
    document.getElementById('google')?.addEventListener('click', (event) => { event.preventDefault(); click(); });
    expect(ssoInPage('start', location.href, option.fingerprint, 'https://accounts.google.com/elsewhere').success).toBe(false);
    expect(click).not.toHaveBeenCalled();
    expect(ssoInPage('start', location.href, option.fingerprint, option.destination).success).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it('does not expose destinations that cannot be resolved safely', () => {
    document.body.innerHTML = '<a href="javascript:void(0)">Continue with Google</a>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    expect(ssoInPage('inspect', location.href).ssoOptions).toEqual([]);
  });

  it('removes dynamic path segments from reviewed destinations and reports a failed click', () => {
    document.body.innerHTML = '<button id="google" data-url="https://accounts.google.com/o/oauth2/v2/auth/QA_FAKE_CODE?state=secret">Continue with Google</button>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 24 } as DOMRect);
    const option = ssoInPage('inspect', location.href).ssoOptions![0];
    expect(option.destination).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(JSON.stringify(option)).not.toMatch(/QA_FAKE_CODE|secret/);
    vi.spyOn(document.getElementById('google')!, 'click').mockImplementation(() => { throw new Error('Synthetic click failure'); });
    expect(ssoInPage('start', location.href, option.fingerprint, option.destination)).toMatchObject({ success: false });
  });
});
