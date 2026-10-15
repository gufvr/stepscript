import { describe, expect, it } from 'vitest';
import { safeSsoUrl } from './safeSsoUrl';

describe('safeSsoUrl', () => {
  it('keeps known route names while removing secrets from query, fragment and path', () => {
    expect(safeSsoUrl('https://app.example.test/auth/callback/QA_FAKE_CODE_123?code=secret#access_token=private'))
      .toBe('https://app.example.test/auth/callback');
    expect(safeSsoUrl('https://app.example.test/login?state=secret')).toBe('https://app.example.test/login');
    expect(safeSsoUrl('https://app.example.test/forms#login')).toBe('https://app.example.test/forms');
    expect(safeSsoUrl('https://app.example.test/auth/%51%41_FAKE_CODE/other')).toBe('https://app.example.test/auth');
  });

  it('does not retain unknown or malformed path segments', () => {
    expect(safeSsoUrl('https://app.example.test/unknown-route/short-secret')).toBe('https://app.example.test/');
    expect(safeSsoUrl('https://app.example.test/login/%ZZ')).toBe('https://app.example.test/login');
    expect(() => safeSsoUrl('https://name:password@app.example.test/login')).toThrow();
  });
});
