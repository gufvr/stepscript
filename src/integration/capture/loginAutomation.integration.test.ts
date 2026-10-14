import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginInPage } from '../../automation/loginInPage';
import { createLoginRecordedSteps } from '../../automation/createLoginRecordedSteps';
import { generateAutomationExport } from '../../automation/automationExport';

describe('reviewed login automation pipeline', () => {
  afterEach(() => { document.body.innerHTML = ''; history.replaceState(null, '', '/'); vi.restoreAllMocks(); });

  it('uses the chosen identifier and protects the password across recording and exports', () => {
    document.body.innerHTML = `<form id="login"><h2>Login</h2>
      <label for="email">Email</label><input id="email" type="email">
      <label for="phone">Telefone</label><input id="phone" type="tel">
      <label for="password">Senha</label><input id="password" type="password">
      <button type="button" id="enter">Entrar</button></form>`;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    const form = loginInPage('inspect', location.href, '', '', '').loginForms![0];
    const selection = { identifierSelector: form.identifiers[1].selector, passwordSelector: form.passwords[0].selector, actionSelector: form.actions[0].selector };
    const filled = loginInPage('fill', location.href, form.fingerprint, '5511999999999', 'sensitive-test-only', selection);
    expect(filled.success).toBe(true);
    const click = vi.fn();
    document.getElementById('enter')?.addEventListener('click', click);
    expect(loginInPage('submit', location.href, form.fingerprint, '', '', selection).success).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    const plan = filled.automationExport;
    if (plan?.kind !== 'login') throw new Error('Missing login plan');
    const steps = createLoginRecordedSteps(plan, '5511999999999');
    expect(steps[0]).toMatchObject({ selectors: { recommended: { value: selection.identifierSelector } }, value: { kind: 'plain', value: '5511999999999' } });
    expect(steps[1]).toMatchObject({ value: { kind: 'protected', reason: 'password' } });
    for (const output of [JSON.stringify(steps), generateAutomationExport('playwright', plan), generateAutomationExport('cypress', plan)]) {
      expect(output).not.toContain('sensitive-test-only');
    }
  });
});
