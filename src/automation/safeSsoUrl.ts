// Keep only route names that cannot carry an account or authorization value.
// Unknown path segments are deliberately omitted rather than persisted.
const STATIC_SEGMENTS = new Set([
  'account', 'accounts', 'auth', 'authorize', 'callback', 'forms', 'idp', 'login',
  'oauth', 'oauth2', 'o', 'oidc', 'openid', 'protocol', 'saml', 'signin', 'sign-in',
  'sso', 'sso.html', 'v1', 'v2', 'v3',
]);

export function safeSsoUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new Error('URL SSO inválida.');
  const parts: string[] = [];
  for (const raw of url.pathname.split('/').filter(Boolean)) {
    let decoded: string;
    try { decoded = decodeURIComponent(raw); } catch { break; }
    if (!STATIC_SEGMENTS.has(decoded.toLowerCase())) break;
    parts.push(decoded.toLowerCase());
  }
  url.pathname = `/${parts.join('/')}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
