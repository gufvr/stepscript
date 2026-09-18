import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createChromeExtensionHarness } from '../../test/chromeExtensionHarness';
import { useRecordingFlowTestContext } from '../support/recordingFlowTestContext';
import { renderSidePanel } from '../support/renderSidePanel';

describe('recording start context regression', () => {
  const context = useRecordingFlowTestContext();

  it('blocks a switched tab without changing recordings and recovers after a new action', async () => {
    const user = userEvent.setup();
    const existing = { id: 'existing', schemaVersion: 1, type: 'click', url: 'https://qapracticehub.com/#forms', timestamp: 1 };
    context.harness = createChromeExtensionHarness({ local: { recordedSteps: [existing] } });
    context.harness.install();
    await import('../../background');
    renderSidePanel();
    await screen.findByRole('button', { name: 'Iniciar Gravação' });
    await act(async () => { context.harness.activateTab(22, 'https://other.example/form') });
    await user.click(screen.getByRole('button', { name: 'Iniciar Gravação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reabra o StepScript pelo ícone');
    expect(context.harness.permissionRequest).not.toHaveBeenCalled();
    expect(context.harness.executeScript).not.toHaveBeenCalled();
    expect(context.harness.getLocalValues().recordedSteps).toEqual([existing]);
    await act(async () => { context.harness.openFromAction() });
    await user.click(screen.getByRole('button', { name: 'Iniciar Gravação' }));
    await waitFor(() => expect(context.harness.getLocalValues().recordingState).toMatchObject({ isRecording: true, tabId: 22, currentUrl: 'https://other.example/form' }));
    expect(context.harness.permissionRequest).toHaveBeenCalledWith({ origins: ['https://other.example/*'] });
  });

  it('uses the latest same-origin URL and blocks cross-origin navigation with the panel open', async () => {
    const user = userEvent.setup();
    context.harness = createChromeExtensionHarness();
    context.harness.install();
    await import('../../background');
    renderSidePanel();
    await screen.findByRole('button', { name: 'Iniciar Gravação' });
    await act(async () => { context.harness.navigateActiveTab('https://qapracticehub.com/#selection') });
    await user.click(screen.getByRole('button', { name: 'Iniciar Gravação' }));
    await waitFor(() => expect(context.harness.getLocalValues().recordingState).toMatchObject({ currentUrl: 'https://qapracticehub.com/#selection' }));
    await user.click(screen.getByRole('button', { name: 'Parar Gravação' }));
    context.harness.permissionRequest.mockClear();
    context.harness.executeScript.mockClear();
    await act(async () => { context.harness.navigateActiveTab('https://other.example/form') });
    await user.click(screen.getByRole('button', { name: 'Iniciar Gravação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reabra o StepScript pelo ícone');
    expect(context.harness.permissionRequest).not.toHaveBeenCalled();
    expect(context.harness.executeScript).not.toHaveBeenCalled();
  });
});
