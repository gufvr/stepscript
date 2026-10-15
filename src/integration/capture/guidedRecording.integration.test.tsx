import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRecorderController, createFieldFillMessage } from '../../content/recorder';
import { createChromeExtensionHarness } from '../../test/chromeExtensionHarness';
import { createPracticePage } from '../support/practicePage';
import { renderSidePanel } from '../support/renderSidePanel';
import { useRecordingFlowTestContext } from '../support/recordingFlowTestContext';

describe('guided recording background and panel integration', () => {
  const context = useRecordingFlowTestContext();
  async function setup() {
    const user = userEvent.setup();
    context.harness = createChromeExtensionHarness({ url: location.href });
    context.harness.install();
    const frame = vi.fn(async () => ({ documentId: 'guided-document', documentLifecycle: 'active', url: location.href }));
    Object.assign(context.harness.chrome.webNavigation, { getFrame: frame });
    Object.assign(context.harness.chrome.permissions, { contains: vi.fn(async () => true) });
    await import('../../background');
    const controller = createRecorderController((message) => context.harness.sendFromTab(message));
    context.harness.connectRecorder(controller);
    context.practicePage = createPracticePage(controller);
    renderSidePanel();
    await user.click(await screen.findByRole('checkbox', { name: /Gravação guiada/ }));
    await user.click(screen.getByRole('button', { name: 'Iniciar Gravação' }));
    await context.harness.localSet({ recordingState: {
      ...(context.harness.getLocalValues().recordingState as object), currentDocumentId: 'guided-document',
    } });
    await screen.findByRole('region', { name: 'Gravação guiada' });
    return { user, controller, frame, panel: within(screen.getByRole('region', { name: 'Gravação guiada' })) };
  }

  it('shows live captures, pauses without clearing storage, resumes, protects passwords and reviews without replay', async () => {
    const { user, controller, panel } = await setup();
    await user.click(context.practicePage.username);
    await waitFor(() => expect(panel.getByText('Passo 1 de 1')).toBeInTheDocument());
    await context.harness.chrome.runtime.sendMessage({ type: 'START_ELEMENT_VISIBILITY_PICKER' });
    await user.click(panel.getByRole('button', { name: 'Pausar gravação' }));
    expect(controller.isActive).toBe(false);
    await screen.findByText('Status: Pausado');
    expect(screen.getByRole('button', { name: 'Verificar elemento visível' })).toBeDisabled();
    expect(await context.harness.chrome.storage.session.get('elementVisibilityPickerState')).toMatchObject({ elementVisibilityPickerState: { active: false } });
    const before = context.harness.getLocalValues().recordedSteps;
    await user.type(context.practicePage.username, 'NotCaptured');
    expect(context.harness.getLocalValues().recordedSteps).toEqual(before);
    expect(await context.harness.sendFromTab(createFieldFillMessage(context.practicePage.username))).toEqual({ success: false });
    await user.click(panel.getByRole('button', { name: 'Retomar gravação' }));
    expect(controller.isActive).toBe(true);
    await user.type(context.practicePage.password, 'QA_SECRET_GUIDED');
    await user.click(context.practicePage.login);
    await waitFor(() => expect(panel.getByText(/Passo \d+ de \d+/)).toBeInTheDocument());
    const stored = context.harness.getLocalValues();
    expect(JSON.stringify(stored)).not.toContain('QA_SECRET_GUIDED');
    expect(JSON.stringify(stored)).toContain('protected');
    const savedCount = (stored.recordedSteps as unknown[]).length;
    await user.click(panel.getByRole('button', { name: 'Revisar passos' }));
    expect(controller.isActive).toBe(false);
    await user.click(panel.getByRole('button', { name: 'Avançar passo' }));
    expect(context.harness.getLocalValues().recordedSteps).toHaveLength(savedCount);
    // All injected calls load the existing recorder; no replay executor was invoked.
    const injections = context.harness.executeScript.mock.calls as unknown as Array<[{ files?: string[] }]>;
    expect(injections.every(([injection]) => 'files' in injection)).toBe(true);
    await user.click(panel.getByRole('button', { name: 'Encerrar gravação' }));
    expect(context.harness.getLocalValues().recordingState).toEqual({ isRecording: false });
    expect(context.harness.getLocalValues().recordedSteps).toHaveLength(savedCount);
  });

  it('invalidates the guided session on tab change and rejects resume until the origin tab is authorized again', async () => {
    const { controller } = await setup();
    context.harness.activateTab(44, 'https://elsewhere.example/');
    await waitFor(() => expect(controller.isActive).toBe(false));
    const response = await context.harness.chrome.runtime.sendMessage({ type: 'CONTROL_GUIDED_RECORDING', payload: { action: 'resume' } });
    expect(response).toMatchObject({ success: false });
    expect(context.harness.getLocalValues().recordedSteps).toEqual([]);
    context.harness.activateTab(21, location.href); context.harness.openFromAction();
    await waitFor(async () => expect(await context.harness.chrome.runtime.sendMessage({ type: 'CONTROL_GUIDED_RECORDING', payload: { action: 'resume' } })).toMatchObject({ success: true }));
    expect(controller.isActive).toBe(true);
    context.harness.navigateActiveTab('https://external.example/');
    await waitFor(() => expect(controller.isActive).toBe(false));
  });

  it('does not capture navigation while paused and refuses highlight in a replacement document', async () => {
    const { user, panel, frame } = await setup();
    await user.click(context.practicePage.username);
    await waitFor(() => expect(context.harness.getLocalValues().recordedSteps).toHaveLength(1));
    await user.click(panel.getByRole('button', { name: 'Pausar gravação' }));
    context.harness.emitHistoryStateUpdated(`${location.href}#step2`);
    await waitFor(() => expect(context.harness.getLocalValues().recordingState).toMatchObject({ currentUrl: `${location.href}#step2` }));
    expect(context.harness.getLocalValues().recordedSteps).toHaveLength(1);
    context.harness.navigateActiveTab(location.href); context.harness.openFromAction();
    frame.mockResolvedValue({ documentId: 'replacement-document', documentLifecycle: 'active', url: location.href });
    const previousHighlights = context.harness.tabsSendMessage.mock.calls.filter(([, message]) => (message as { type: string }).type === 'SHOW_GUIDED_HIGHLIGHT').length;
    await user.click(panel.getByRole('button', { name: 'Revisar passos' }));
    expect(context.harness.tabsSendMessage.mock.calls.filter(([, message]) => (message as { type: string }).type === 'SHOW_GUIDED_HIGHLIGHT')).toHaveLength(previousHighlights);
    expect(panel.getByRole('status')).toHaveTextContent('O documento deste passo mudou');
  });

  it('restores pause and document references after the background restarts using browser-session memory only', async () => {
    const { user, panel, controller } = await setup();
    await user.click(context.practicePage.username);
    await waitFor(() => expect(context.harness.getLocalValues().recordedSteps).toHaveLength(1));
    await user.click(panel.getByRole('button', { name: 'Pausar gravação' }));
    const before = context.harness.getLocalValues();
    const temporary = await context.harness.chrome.storage.session.get('guidedRecordingSession');
    expect(temporary).toMatchObject({ guidedRecordingSession: { status: { phase: 'paused' } } });
    expect(JSON.stringify(temporary)).not.toContain('selectors');
    expect(JSON.stringify(temporary)).not.toContain('value');
    vi.resetModules();
    await import('../../background');
    expect(await context.harness.chrome.runtime.sendMessage({ type: 'GET_GUIDED_RECORDING_STATUS' })).toMatchObject({ guidedStatus: { phase: 'paused' } });
    expect(await context.harness.sendFromTab(createFieldFillMessage(context.practicePage.username))).toEqual({ success: false });
    expect(context.harness.getLocalValues()).toEqual(before);
    const steps = before.recordedSteps as Array<{ id: string }>;
    expect(await context.harness.chrome.runtime.sendMessage({ type: 'CONTROL_GUIDED_RECORDING', payload: { action: 'review', stepId: steps[0].id } })).toMatchObject({ success: true });
    expect(await context.harness.chrome.runtime.sendMessage({ type: 'CONTROL_GUIDED_RECORDING', payload: { action: 'resume' } })).toMatchObject({ success: true });
    expect(controller.isActive).toBe(true);
  });
});
