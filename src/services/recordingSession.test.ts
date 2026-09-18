import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionMessage } from '../shared/messages';
import type { ActiveTabContext } from '../shared/recordingTypes';
import { startRecordingSession } from './recordingSession';

const requestPermission = vi.fn();
const sendMessage = vi.fn();

function provideActiveTab(context?: ActiveTabContext) {
  sendMessage.mockImplementation((message: ExtensionMessage) => {
    if (message.type === 'GET_ACTIVE_TAB_CONTEXT') {
      return Promise.resolve({
        success: Boolean(context),
        activeTabContext: context,
      });
    }

    return Promise.resolve({ success: true });
  });
}

describe('recordingSession', () => {
  beforeEach(() => {
    requestPermission.mockReset();
    sendMessage.mockReset();

    vi.stubGlobal('chrome', {
      permissions: { request: requestPermission },
      runtime: { sendMessage },
    });
  });

  it('requests only the captured site and starts its tab', async () => {
    provideActiveTab({
      tabId: 42,
      windowId: 2,
      url: 'https://example.com/account',
    });
    requestPermission.mockResolvedValue(true);

    await expect(startRecordingSession()).resolves.toEqual({
      isRecording: true,
      tabId: 42,
      origin: 'https://example.com',
      currentUrl: 'https://example.com/account',
    });
    expect(requestPermission).toHaveBeenCalledWith({
      origins: ['https://example.com/*'],
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'START_RECORDING',
      payload: {
        tabId: 42,
        origin: 'https://example.com',
        url: 'https://example.com/account',
      },
    });
  });

  it('does not start when the permission is denied', async () => {
    provideActiveTab({
      tabId: 42,
      windowId: 2,
      url: 'https://example.com',
    });
    requestPermission.mockResolvedValue(false);

    await expect(startRecordingSession()).rejects.toThrow('Permissão negada');
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'START_RECORDING' }),
    );
  });

  it('requests localhost access without coupling it to a development port', async () => {
    provideActiveTab({
      tabId: 8,
      windowId: 2,
      url: 'http://localhost:5173/form',
    });
    requestPermission.mockResolvedValue(true);

    await expect(startRecordingSession()).resolves.toMatchObject({
      tabId: 8,
      origin: 'http://localhost:5173',
    });
    expect(requestPermission).toHaveBeenCalledWith({
      origins: ['http://localhost/*'],
    });
  });

  it('rejects browser internal pages before requesting permission', async () => {
    provideActiveTab({
      tabId: 42,
      windowId: 2,
      url: 'brave://extensions',
    });

    await expect(startRecordingSession()).rejects.toThrow(
      'O StepScript funciona apenas em páginas HTTP ou HTTPS.',
    );
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('explains how to restore access when no context is available', async () => {
    provideActiveTab();

    await expect(startRecordingSession()).rejects.toThrow(
      'Reabra o StepScript pelo ícone',
    );
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('does not start when the tab changes while permission is requested', async () => {
    provideActiveTab({ tabId: 42, windowId: 2, url: 'https://example.com/form' });
    requestPermission.mockImplementation(async () => {
      provideActiveTab();
      return true;
    });
    await expect(startRecordingSession()).rejects.toThrow('Reabra o StepScript pelo ícone');
    expect(sendMessage).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'START_RECORDING' }));
  });
});
