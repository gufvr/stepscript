export function safeAutomationUrl(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL de automação inválida.');
  parsed.search = '';
  if (!/^#[a-z][a-z0-9_-]{0,79}$/i.test(parsed.hash)
    || /token|secret|password|senha|auth|session|code/i.test(parsed.hash)) parsed.hash = '';
  return parsed.toString();
}
