import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginInPage } from './loginInPage';

describe('adaptive login automation', () => {
  afterEach(() => { document.body.innerHTML = ''; history.replaceState(null, '', '/'); vi.restoreAllMocks(); });

  it('prefers the login section over another visible password form', () => {
    document.body.innerHTML = `
      <section id="login"><h2>Formulário de Login</h2><form><label for="email">Email</label><input id="email" type="email"><label>Senha<input type="password"></label><button type="submit">Entrar</button></form></section>
      <section id="register"><h2>Registro</h2><form><label for="reg-email">Email</label><input id="reg-email" type="email"><input type="password"><input type="password"><button>Registrar</button></form></section>`;
    history.replaceState(null, '', '#login');
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    const inspected = loginInPage('inspect', location.href, '', '', '');
    expect(inspected.loginForms).toHaveLength(1);
    expect(inspected.loginForms?.[0].requiresPassword).toBe(true);
    expect(inspected.loginForms?.[0].actionLabel).toBe('Entrar');
  });

  it('handles an OTP username step without requiring a password', () => {
    document.body.innerHTML = `<section id="otp-login"><h2>OTP Login Form</h2><form>
      <label for="username">Username</label><input id="username" type="text">
      <label>OTP<input maxlength="1"></label><button type="submit">Submit</button>
      <button type="button" id="fetch">Fetch OTP</button><button type="button">Resend OTP</button>
    </form></section>`;
    history.replaceState(null, '', '#otp-login');
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    const inspected = loginInPage('inspect', location.href, '', '', '');
    expect(inspected.loginForms).toHaveLength(1);
    expect(inspected.loginForms?.[0].requiresPassword).toBe(false);
    const click = vi.fn();
    document.getElementById('fetch')?.addEventListener('click', click);
    const filled = loginInPage('fill', location.href, inspected.loginForms![0].fingerprint, 'tester', '');
    expect(filled.success).toBe(true);
    expect(filled.automationExport?.kind).toBe('login');
    expect(click).not.toHaveBeenCalled();
    const submitted = loginInPage('submit', location.href, inspected.loginForms![0].fingerprint, '', '');
    expect(submitted.success).toBe(true);
    expect((document.getElementById('username') as HTMLInputElement).value).toBe('tester');
    expect(click).toHaveBeenCalledOnce();
  });

  it('refuses a changed form instead of selecting another action', () => {
    document.body.innerHTML = '<section><label for="username">Username</label><input id="username"><button>Login</button></section>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    expect(loginInPage('fill', location.href, 'stale', 'qa', '').success).toBe(false);
  });

  it('offers phone and email choices and uses only the reviewed target', () => {
    document.body.innerHTML = `<form id="login"><h2>Login</h2>
      <label for="email">Email</label><input id="email" type="email" autocomplete="username">
      <label for="phone">Telefone</label><input id="phone" type="tel" autocomplete="tel">
      <label for="pass">Senha</label><input id="pass" type="password">
      <button type="button" id="advance">Avançar</button><button type="button" id="enter">Entrar</button></form>`;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    const form = loginInPage('inspect', location.href, '', '', '').loginForms![0];
    expect(form.identifiers).toHaveLength(2);
    expect(form.actions).toHaveLength(2);
    const selection = { identifierSelector: form.identifiers[1].selector, passwordSelector: form.passwords[0].selector, actionSelector: form.actions[1].selector };
    expect(loginInPage('fill', location.href, form.fingerprint, '5511999999999', 'test-only', selection).success).toBe(true);
    expect((document.getElementById('email') as HTMLInputElement).value).toBe('');
    expect((document.getElementById('phone') as HTMLInputElement).value).toBe('5511999999999');
    const click = vi.fn();
    document.getElementById('enter')?.addEventListener('click', click);
    expect(loginInPage('submit', location.href, form.fingerprint, '', '', selection).success).toBe(true);
    expect(click).toHaveBeenCalledOnce();
  });

  it('supports an advance step followed by a password-only step', () => {
    document.body.innerHTML = `<form id="login"><h2>Login</h2><input autocomplete="username" id="user"><button type="button">Avançar</button></form>`;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    const first = loginInPage('inspect', location.href, '', '', '').loginForms![0];
    expect(first.requiresPassword).toBe(false);
    expect(loginInPage('fill', location.href, first.fingerprint, 'tester', '', {
      identifierSelector: first.identifiers[0].selector, actionSelector: first.actions[0].selector,
    }).success).toBe(true);
    document.body.innerHTML = `<form id="login"><h2>Login</h2><input type="password" id="password"><button type="button">Entrar</button></form>`;
    const second = loginInPage('inspect', location.href, '', '', '').loginForms![0];
    expect(second.identifiers).toHaveLength(0);
    expect(second.requiresPassword).toBe(true);
    const result = loginInPage('fill', location.href, second.fingerprint, '', 'test-only', {
      passwordSelector: second.passwords[0].selector, actionSelector: second.actions[0].selector,
    });
    expect(result.success).toBe(true);
    expect(result.automationExport).toMatchObject({ kind: 'login', identifierSelector: undefined, requiresPassword: true });
  });

  it('rejects an unreviewed action without filling fields or clicking', () => {
    document.body.innerHTML = `<form id="login"><h2>Login</h2><input id="user" autocomplete="username"><button id="enter">Entrar</button><button id="delete">Excluir</button></form>`;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    const form = loginInPage('inspect', location.href, '', '', '').loginForms![0];
    const click = vi.fn();
    document.getElementById('delete')?.addEventListener('click', click);
    expect(loginInPage('fill', location.href, form.fingerprint, 'tester', '', {
      identifierSelector: form.identifiers[0].selector, actionSelector: 'button[id="delete"]',
    }).success).toBe(false);
    expect((document.getElementById('user') as HTMLInputElement).value).toBe('');
    expect(click).not.toHaveBeenCalled();
  });
});
