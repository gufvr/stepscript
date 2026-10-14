import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '../styles/theme';
import { ReplayControls } from './ReplayControls';

function renderControls(stepCount: number, isRecording: boolean) {
  return render(<ThemeProvider theme={theme}>
    <ReplayControls stepCount={stepCount} isRecording={isRecording} />
  </ThemeProvider>);
}

describe('ReplayControls wizard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('offers automation without a previous recording', () => {
    vi.stubGlobal('chrome', { runtime: { sendMessage: vi.fn(async () => ({ success: true, replayStatus: { phase: 'idle', steps: [] } })) }, permissions: { request: vi.fn(async () => true) } });
    renderControls(0, false);
    const button = screen.getByRole('button', { name: 'Executar automação de passos' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'Escolher automação de passos' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Reproduzir passos gravados' })).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Busca de erros visíveis' })).toBeEnabled();
    expect(screen.getByRole('option', { name: /Busca de erros técnicos/ })).toBeEnabled();
  });

  it('runs a visible-error scan without credentials or recorded steps', async () => {
    const sendMessage = vi.fn(async (message: { type: string }) => message.type === 'GET_ACTIVE_TAB_CONTEXT'
      ? { success: true, activeTabContext: { url: 'https://example.com/login', tabId: 1, windowId: 1 } }
      : message.type === 'RUN_QUICK_AUTOMATION'
        ? { success: true, automationSteps: ['Erro visível: dados inválidos'] }
        : { success: true, replayStatus: { phase: 'idle', steps: [] } });
    vi.stubGlobal('chrome', { runtime: { sendMessage }, permissions: { request: vi.fn(async () => true) } });
    renderControls(0, false);
    fireEvent.click(screen.getByRole('button', { name: 'Executar automação de passos' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de automação' }), { target: { value: 'visible-errors' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar e executar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e executar' }));
    await waitFor(() => expect(screen.getByText('Erro visível: dados inválidos')).toBeInTheDocument());
    expect(sendMessage).toHaveBeenCalledWith({ type: 'RUN_QUICK_AUTOMATION', payload: { kind: 'visible-errors' } });
  });

  it('requires review of the detected login fields and sends the selected targets', async () => {
    const form = { fingerprint: 'login-form', label: 'Login', actionLabel: 'Entrar', requiresPassword: true,
      identifiers: [{ selector: '#email', label: 'Email' }, { selector: '#phone', label: 'Telefone' }],
      passwords: [{ selector: '#pass', label: 'Senha' }], actions: [{ selector: '#enter', label: 'Entrar' }] };
    const sendMessage = vi.fn(async (message: { type: string }) => message.type === 'GET_ACTIVE_TAB_CONTEXT'
      ? { success: true, activeTabContext: { url: 'https://example.com/login', tabId: 1, windowId: 1 } }
      : message.type === 'INSPECT_LOGIN_AUTOMATION'
        ? { success: true, loginForms: [form], loginDocumentId: 'document-1' }
        : message.type === 'RUN_QUICK_AUTOMATION'
          ? { success: true, automationSteps: ['Enviado'] }
          : { success: true, replayStatus: { phase: 'idle', steps: [] } });
    vi.stubGlobal('chrome', { runtime: { sendMessage }, permissions: { request: vi.fn(async () => true) } });
    renderControls(0, false);
    fireEvent.click(screen.getByRole('button', { name: 'Executar automação de passos' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Campo de identificador' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Confirmar e executar' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Campo de identificador' }), { target: { value: '#phone' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Usuário de teste' }), { target: { value: '5511999999999' } });
    fireEvent.change(screen.getByLabelText('Senha de teste'), { target: { value: 'test-only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e executar' }));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ type: 'RUN_QUICK_AUTOMATION', payload: {
      kind: 'login', username: '5511999999999', password: 'test-only', loginFingerprint: 'login-form', loginDocumentId: 'document-1',
      loginSelection: { identifierSelector: '#phone', passwordSelector: '#pass', actionSelector: '#enter' },
    } }));
  });
});
