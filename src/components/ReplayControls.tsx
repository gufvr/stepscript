import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import type { ReplayStatus, ReplayStepResult } from '../replay/replaySession';
import { generateAutomationExport, type AutomationFramework } from '../automation/automationExport';
import { generatePlaywrightTest } from '../shared/playwright/generatePlaywrightTest';
import { generateCypressTest } from '../shared/cypress/generateCypressTest';
import { downloadTextFile } from '../services/downloadTextFile';

const Card = styled.section`
  display: grid;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`;
const Button = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 10px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  &:disabled { cursor: not-allowed; opacity: .55; }
`;
const Message = styled.p`
  margin: 0;
  font-size: .85rem;
  line-height: 1.45;
`;
const ResultList = styled.ol`
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 24px;
  font-size: .85rem;
`;
const Wizard = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;
const Field = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;
const Choice = styled.select`
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`;

const ResultActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;
const ExportButton = styled(Button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1 1 155px;
  min-width: 0;
  min-height: 38px;
`;
const GeneratorLogo = styled.img`
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
`;
const ClearResultsButton = styled(Button)`
  flex: 0 1 auto;
  min-height: 38px;
  color: ${({ theme }) => theme.colors.dangerText};
`;

async function send(message: ExtensionMessage): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ExtensionResponse>;
}

const stateLabel: Record<ReplayStepResult['status'], string> = {
  pending: 'Pendente', running: 'Executando', passed: 'Executado',
  skipped: 'Ignorado', failed: 'Falhou', interrupted: 'Interrompido',
};

export function ReplayControls({ stepCount, isRecording }: { stepCount: number; isRecording: boolean }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [kind, setKind] = useState<'login' | 'sso' | 'visible-errors' | 'technical-errors' | 'saved'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginForms, setLoginForms] = useState<NonNullable<ExtensionResponse['loginForms']>>([]);
  const [loginDocumentId, setLoginDocumentId] = useState<string>();
  const [selectedLogin, setSelectedLogin] = useState('');
  const [selectedIdentifier, setSelectedIdentifier] = useState('');
  const [selectedPassword, setSelectedPassword] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [ssoOptions, setSsoOptions] = useState<NonNullable<ExtensionResponse['ssoOptions']>>([]);
  const [ssoDocumentId, setSsoDocumentId] = useState<string>();
  const [selectedSso, setSelectedSso] = useState('');
  const [ssoFlow, setSsoFlow] = useState<ExtensionResponse['ssoFlow']>();
  const [automationSteps, setAutomationSteps] = useState<string[]>();
  const [automationExport, setAutomationExport] = useState<ExtensionResponse['automationExport']>();
  const [exportFeedback, setExportFeedback] = useState<string>();
  const [preview, setPreview] = useState<ExtensionResponse['replayPreview']>();
  const [status, setStatus] = useState<ReplayStatus>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void send({ type: 'GET_REPLAY_STATUS' }).then((response) => {
      if (active && response.replayStatus) setStatus(response.replayStatus);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (status?.phase !== 'running') return;
    const interval = window.setInterval(() => {
      void send({ type: 'GET_REPLAY_STATUS' }).then((response) => {
        if (response.replayStatus) setStatus(response.replayStatus);
      }).catch(() => undefined);
    }, 350);
    return () => window.clearInterval(interval);
  }, [status?.phase]);

  useEffect(() => {
    if (ssoFlow?.phase !== 'started' && ssoFlow?.phase !== 'external') return;
    const interval = window.setInterval(() => {
      void send({ type: 'GET_SSO_FLOW_STATUS' }).then((response) => {
        if (response.ssoFlow) setSsoFlow(response.ssoFlow);
      }).catch(() => undefined);
    }, 700);
    return () => window.clearInterval(interval);
  }, [ssoFlow?.phase]);

  const running = status?.phase === 'running';
  const unavailableReason = isRecording
    ? 'Pare a gravação para reproduzir os passos capturados.'
    : stepCount === 0
      ? 'Grave passos para habilitar esta opção; os outros modos não precisam de gravação.'
      : undefined;

  async function inspectLogin() {
    setError(undefined);
    setPending(true);
    setLoginForms([]);
    setSelectedLogin('');
    setSelectedIdentifier('');
    setSelectedPassword('');
    setSelectedAction('');
    try {
      const current = await send({ type: 'GET_ACTIVE_TAB_CONTEXT' });
      const url = current.activeTabContext?.url;
      if (!url) throw new Error('Reabra o StepScript pelo ícone na aba desejada.');
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use uma página HTTP ou HTTPS.');
      const granted = await chrome.permissions.request({ origins: [`${parsed.protocol}//${parsed.hostname}/*`] });
      if (!granted) throw new Error('Autorize o site para analisar os formulários.');
      const response = await send({ type: 'INSPECT_LOGIN_AUTOMATION' });
      if (!response.success) throw new Error(response.error ?? 'Não foi possível analisar os formulários.');
      const forms = response.loginForms ?? [];
      setLoginForms(forms);
      setLoginDocumentId(response.loginDocumentId);
      setSelectedLogin(forms[0]?.fingerprint ?? '');
      setSelectedIdentifier(forms[0]?.identifiers[0]?.selector ?? '');
      setSelectedPassword(forms[0]?.passwords[0]?.selector ?? '');
      setSelectedAction(forms[0]?.actions[0]?.selector ?? '');
      if (!forms.length) setError('Nenhum formulário de login compatível foi encontrado nesta seção.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível analisar os formulários.'); }
    finally { setPending(false); }
  }

  async function inspectSso() {
    setError(undefined);
    setPending(true);
    setSsoOptions([]);
    setSelectedSso('');
    setSsoDocumentId(undefined);
    try {
      const current = await send({ type: 'GET_ACTIVE_TAB_CONTEXT' });
      const url = current.activeTabContext?.url;
      if (!url) throw new Error('Reabra o StepScript pelo ícone na aba desejada.');
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use uma página HTTP ou HTTPS.');
      const granted = await chrome.permissions.request({ origins: [`${parsed.protocol}//${parsed.hostname}/*`] });
      if (!granted) throw new Error('Autorize o site de origem para analisar as opções SSO.');
      const response = await send({ type: 'INSPECT_SSO_AUTOMATION' });
      if (!response.success) throw new Error(response.error ?? 'Não foi possível analisar as opções SSO.');
      const options = response.ssoOptions ?? [];
      setSsoOptions(options);
      setSsoDocumentId(response.ssoDocumentId);
      setSelectedSso(options[0]?.fingerprint ?? '');
      if (!options.length) setError('Nenhuma opção SSO com destino explícito foi detectada nesta página.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível analisar as opções SSO.'); }
    finally { setPending(false); }
  }

  async function startSso() {
    const option = ssoOptions.find((candidate) => candidate.fingerprint === selectedSso);
    if (!option?.canStart || !ssoDocumentId) return;
    setError(undefined);
    setPending(true);
    try {
      const response = await send({ type: 'START_SSO_AUTOMATION', payload: {
        fingerprint: option.fingerprint, destination: option.destination, documentId: ssoDocumentId,
      } });
      if (!response.success) throw new Error(response.error ?? 'Não foi possível iniciar o SSO.');
      setAutomationSteps(response.automationSteps ?? ['Início do fluxo registrado. Conclua a autenticação manualmente.']);
      const currentStatus = await send({ type: 'GET_SSO_FLOW_STATUS' });
      setSsoFlow(currentStatus.ssoFlow);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar o SSO.'); }
    finally { setPending(false); }
  }

  async function runQuick() {
    setError(undefined);
    setAutomationSteps(undefined);
    setAutomationExport(undefined);
    setPending(true);
    try {
      const current = await send({ type: 'GET_ACTIVE_TAB_CONTEXT' });
      const url = current.activeTabContext?.url;
      if (!url) throw new Error('Reabra o StepScript pelo ícone na aba desejada.');
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use uma página HTTP ou HTTPS.');
      const granted = await chrome.permissions.request({ origins: [`${parsed.protocol}//${parsed.hostname}/*`] });
      if (!granted) throw new Error('Autorize o site para continuar.');
      const response = await send({ type: 'RUN_QUICK_AUTOMATION', payload: {
        kind: kind as 'login' | 'visible-errors' | 'technical-errors',
        ...(kind === 'login' ? { username, password, loginFingerprint: selectedLogin, loginDocumentId,
          loginSelection: { identifierSelector: selectedIdentifier || undefined, passwordSelector: selectedPassword || undefined, actionSelector: selectedAction } } : {}),
      } });
      if (!response.success) throw new Error(response.error ?? 'Não foi possível executar a automação.');
      setAutomationSteps(response.automationSteps ?? []);
      setAutomationExport(response.automationExport);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível executar a automação.'); }
    finally { setUsername(''); setPassword(''); setPending(false); }
  }

  async function prepare() {
    setError(undefined);
    setAutomationExport(undefined);
    setPending(true);
    try {
      const response = await send({ type: 'PREPARE_REPLAY' });
      if (!response.success || !response.replayPreview) throw new Error(response.error ?? 'Não foi possível preparar a execução.');
      setPreview(response.replayPreview);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível preparar a execução.'); }
    finally { setPending(false); }
  }

  async function start() {
    if (!preview) return;
    setError(undefined);
    setPending(true);
    try {
      const response = await send({ type: 'START_REPLAY', payload: { token: preview.token } });
      if (!response.success) throw new Error(response.error ?? 'Não foi possível iniciar a execução.');
      setPreview(undefined);
      setStatus(response.replayStatus);
    } catch (caught) {
      setPreview(undefined);
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar a execução.');
    } finally { setPending(false); }
  }

  async function exportResult(framework: AutomationFramework) {
    setExportFeedback(undefined);
    try {
      let code: string;
      if (automationExport) code = generateAutomationExport(framework, automationExport);
      else if (status?.phase === 'completed') {
        const local = await chrome.storage.local.get('recordedSteps');
        const steps = Array.isArray(local.recordedSteps) ? local.recordedSteps : [];
        if (!steps.length) throw new Error('Os passos gravados não estão mais disponíveis.');
        code = framework === 'playwright' ? generatePlaywrightTest(steps).code : generateCypressTest(steps).code;
      } else throw new Error('Conclua uma automação antes de exportar.');
      downloadTextFile({ content: code, fileName: framework === 'playwright'
        ? 'stepscript-automation-playwright.spec.ts' : 'stepscript-automation-cypress.cy.ts' });
      setExportFeedback(`Arquivo ${framework === 'playwright' ? 'Playwright' : 'Cypress'} exportado. Revise os TODOs antes de executar.`);
    } catch (caught) { setExportFeedback(caught instanceof Error ? caught.message : 'Não foi possível exportar o teste.'); }
  }

  const selectedForm = loginForms.find((form) => form.fingerprint === selectedLogin);
  const hasAutomationResults = automationSteps !== undefined || Boolean(automationExport)
    || Boolean(status && status.phase !== 'idle') || Boolean(ssoFlow && ssoFlow.phase !== 'idle');
  const canExportResult = Boolean(automationExport) || status?.phase === 'completed'
    || Boolean(ssoFlow && ssoFlow.phase !== 'idle');

  function clearAutomationResults() {
    setAutomationSteps(undefined);
    setAutomationExport(undefined);
    setStatus(undefined);
    setSsoFlow(undefined);
    setPreview(undefined);
    setUsername('');
    setPassword('');
    setError(undefined);
    setExportFeedback('Resultados da automação limpos. Os passos gravados foram preservados.');
  }

  return <Card aria-label="Automação de passos">
    <strong>Automação de passos</strong>
    <Message>Escolha um teste para a aba atual. Não é preciso gravar antes.</Message>
    <Button type="button" disabled={pending || running} onClick={() => { setWizardOpen(true); setUsername(''); setPassword(''); setError(undefined); setAutomationSteps(undefined); setAutomationExport(undefined); setExportFeedback(undefined); if (kind === 'sso') void inspectSso(); else void inspectLogin(); }}>Executar automação de passos</Button>
    {wizardOpen && <Wizard role="dialog" aria-label="Escolher automação de passos" aria-modal="false">
      <Message>Tipo de automação</Message>
      <Choice aria-label="Tipo de automação" value={kind} onChange={(event) => { setKind(event.target.value as typeof kind); setUsername(''); setPassword(''); setError(undefined); setAutomationSteps(undefined); setAutomationExport(undefined); setExportFeedback(undefined); }}>
        <option value="login">Login</option>
        <option value="sso">SSO assistido</option>
        <option value="visible-errors">Busca de erros visíveis</option>
        <option value="technical-errors">Busca de erros técnicos (HTTP observável)</option>
        <option value="saved" disabled={Boolean(unavailableReason)}>Reproduzir passos gravados</option>
      </Choice>
      {kind === 'sso' && <>
        <Message>Revise provedor, ação e destino antes de iniciar. Após confirmar, o StepScript apenas abre o provedor; autenticação, MFA, CAPTCHA e consentimentos ficam sob sua ação. Páginas externas não são analisadas.</Message>
        {!ssoOptions.length && <Button type="button" disabled={pending} onClick={() => void inspectSso()}>Analisar opções SSO</Button>}
        {ssoOptions.length > 0 && <>
          <Choice aria-label="Opção SSO" value={selectedSso} onChange={(event) => setSelectedSso(event.target.value)}>
            {ssoOptions.map((option) => <option key={option.fingerprint} value={option.fingerprint}>{option.provider} — {option.actionLabel}</option>)}
          </Choice>
          {ssoOptions.filter((option) => option.fingerprint === selectedSso).map((option) => <div key={option.fingerprint}>
            <Message>Destino revisado:</Message><code>{option.destination}</code>
            {!option.canStart && <Message role="status">{option.manualReason ?? 'Continue manualmente.'}</Message>}
          </div>)}
          <Button type="button" disabled={pending || !ssoOptions.find((option) => option.fingerprint === selectedSso)?.canStart || !ssoDocumentId || isRecording}
            onClick={() => void startSso()}>Confirmar e iniciar SSO</Button>
        </>}
        {ssoFlow && ssoFlow.phase !== 'idle' && <Message role="status" aria-live="polite">{ssoFlow.message}</Message>}
      </>}
      {kind === 'login' && <>
        <Message>Formulário detectado na seção atual. Use apenas dados de teste; o StepScript acionará o botão uma vez após sua confirmação.</Message>
        {loginForms.length > 1 && <Choice aria-label="Formulário de login" value={selectedLogin} onChange={(event) => {
          const form = loginForms.find((candidate) => candidate.fingerprint === event.target.value);
          setSelectedLogin(event.target.value);
          setSelectedIdentifier(form?.identifiers[0]?.selector ?? '');
          setSelectedPassword(form?.passwords[0]?.selector ?? '');
          setSelectedAction(form?.actions[0]?.selector ?? '');
          setPassword('');
        }}>
          {loginForms.map((form) => <option key={form.fingerprint} value={form.fingerprint}>{form.label} — {form.actionLabel}</option>)}
        </Choice>}
        {loginForms.length === 1 && <Message>Detectado: {loginForms[0].label} · Ação: {loginForms[0].actionLabel}</Message>}
        {!loginForms.length && <Button type="button" disabled={pending} onClick={() => void inspectLogin()}>Analisar página novamente</Button>}
        {selectedForm && <>
          <Message>Revise os campos e a ação detectados antes de confirmar:</Message>
          {selectedForm.identifiers.length > 0 && <>
            <Choice aria-label="Campo de identificador" value={selectedIdentifier} onChange={(event) => setSelectedIdentifier(event.target.value)}>
              {selectedForm.identifiers.map((target) => <option key={target.selector} value={target.selector}>{target.label} · {target.selector}</option>)}
            </Choice>
            <Field aria-label="Usuário de teste" placeholder="Usuário, e-mail ou telefone de teste" autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} />
          </>}
          {selectedForm.passwords.length > 0 && <>
            <Choice aria-label="Campo de senha" value={selectedPassword} onChange={(event) => { setSelectedPassword(event.target.value); setPassword(''); }}>
              {selectedForm.passwords.map((target) => <option key={target.selector} value={target.selector}>{target.label} · {target.selector}</option>)}
            </Choice>
            <Field aria-label="Senha de teste" placeholder="Senha de teste" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} />
          </>}
          <Choice aria-label="Ação de login" value={selectedAction} onChange={(event) => setSelectedAction(event.target.value)}>
            {selectedForm.actions.map((target) => <option key={target.selector} value={target.selector}>{target.label} · {target.selector}</option>)}
          </Choice>
        </>}
      </>}
      {kind === 'technical-errors' && <Message>Verifica a resposta da página e de recursos HTTP quando o navegador expõe seus status. Não lê o console completo nem respostas de rede ocultas.</Message>}
      {kind === 'saved' && <Message>Reproduz apenas passos compatíveis, após uma segunda confirmação. {unavailableReason}</Message>}
      {isRecording && <Message>Pare a gravação antes de executar qualquer automação.</Message>}
      {kind !== 'sso' && <Button type="button" disabled={pending || isRecording || (kind === 'saved' && Boolean(unavailableReason)) || (kind === 'login' && (!selectedForm || !selectedAction || (selectedForm.identifiers.length > 0 && (!selectedIdentifier || !username.trim())) || (selectedForm.passwords.length > 0 && (!selectedPassword || !password))))} onClick={() => { if (kind === 'saved') void prepare(); else void runQuick(); }}>Confirmar e executar</Button>}
      <Button type="button" disabled={pending} onClick={() => { setWizardOpen(false); setUsername(''); setPassword(''); setPreview(undefined); }}>Fechar</Button>
    </Wizard>}
    {automationSteps && <div role="status" aria-live="polite"><Message>Resultado da automação:</Message><ResultList>{automationSteps.map((step, index) => <li key={index}>{step}</li>)}</ResultList></div>}
    {hasAutomationResults && <div aria-label="Ações dos resultados da automação">
      {canExportResult && !running && <Message>Exportar o resultado como teste (valores sensíveis não são incluídos):</Message>}
      <ResultActions>
        {canExportResult && !running && <>
          <ExportButton type="button" disabled={pending} onClick={() => void exportResult('playwright')}>
            <GeneratorLogo src="/icons/playwright-logo.svg" alt="" aria-hidden="true" />
            Exportar Playwright
          </ExportButton>
          <ExportButton type="button" disabled={pending} onClick={() => void exportResult('cypress')}>
            <GeneratorLogo src="/icons/cypress-logo.svg" alt="" aria-hidden="true" />
            Exportar Cypress
          </ExportButton>
        </>}
        <ClearResultsButton type="button" aria-label="Limpar resultados da automação" disabled={pending || running} onClick={clearAutomationResults}>Limpar</ClearResultsButton>
      </ResultActions>
    </div>}
    {exportFeedback && <Message role="status">{exportFeedback}</Message>}
    {preview && <div role="dialog" aria-label="Confirmar execução de passos" aria-modal="false">
      <Message>Executar na aba autorizada: {preview.origin}. {preview.steps.filter((step) => step.status === 'pending').length} passos compatíveis. Campos sensíveis e ações incompatíveis serão ignorados.</Message>
      <ResultList>{preview.steps.map((step) => <li key={step.index}>{step.label}: {stateLabel[step.status]}{step.message ? ` — ${step.message}` : ''}</li>)}</ResultList>
      <Button type="button" disabled={pending} onClick={() => void start()}>Confirmar execução</Button>{' '}
      <Button type="button" disabled={pending} onClick={() => {
        setPreview(undefined);
        void send({ type: 'CANCEL_REPLAY' });
      }}>Cancelar</Button>
    </div>}
    {running && <Button type="button" onClick={() => void send({ type: 'CANCEL_REPLAY' }).then((response) => setStatus(response.replayStatus))}>Interromper execução</Button>}
    {error && <Message role="alert">{error}</Message>}
    {status && status.phase !== 'idle' && <div role="status" aria-live="polite">
      <Message>{status.message ?? (running ? 'Executando os passos na aba autorizada.' : 'Resultado da execução:')}</Message>
      <ResultList>{status.steps.map((step) => <li key={step.index}>{step.label}: {stateLabel[step.status]}{step.message ? ` — ${step.message}` : ''}</li>)}</ResultList>
    </div>}
  </Card>;
}
