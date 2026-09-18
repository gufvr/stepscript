import type { ExtensionMessage, ExtensionResponse } from '../shared/messages';
import type { RecordingState } from '../shared/recordingTypes';
import { STALE_TAB_CONTEXT_MESSAGE } from './activeTabContext';

function getPermissionPattern(url: string) {
  const parsedUrl = new URL(url);

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('O StepScript funciona apenas em páginas HTTP ou HTTPS.');
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}/*`;
}

async function getActiveTab() {
  const response = (await chrome.runtime.sendMessage({
    type: 'GET_ACTIVE_TAB_CONTEXT',
  } satisfies ExtensionMessage)) as ExtensionResponse;
  const activeTab = response.activeTabContext;

  if (!activeTab) {
    throw new Error(STALE_TAB_CONTEXT_MESSAGE);
  }

  return { id: activeTab.tabId, url: activeTab.url };
}

export async function startRecordingSession(): Promise<RecordingState> {
  const activeTab = await getActiveTab();
  const permissionPattern = getPermissionPattern(activeTab.url);
  const granted = await chrome.permissions.request({ origins: [permissionPattern] });

  if (!granted) {
    throw new Error('Permissão negada. Autorize o site para iniciar a gravação.');
  }

  const origin = new URL(activeTab.url).origin;
  const latestTab = await getActiveTab();
  if (latestTab.id !== activeTab.id || latestTab.url !== activeTab.url) {
    throw new Error(STALE_TAB_CONTEXT_MESSAGE);
  }
  const message: ExtensionMessage = {
    type: 'START_RECORDING',
    payload: { tabId: activeTab.id, origin, url: activeTab.url },
  };
  const response = (await chrome.runtime.sendMessage(message)) as ExtensionResponse;

  if (!response.success) {
    throw new Error(response.error ?? 'Não foi possível iniciar a gravação.');
  }

  return {
    isRecording: true,
    tabId: activeTab.id,
    origin,
    currentUrl: activeTab.url,
  };
}

export async function stopRecordingSession(): Promise<RecordingState> {
  const response = (await chrome.runtime.sendMessage({
    type: 'STOP_RECORDING',
  } satisfies ExtensionMessage)) as ExtensionResponse;

  if (!response.success) {
    throw new Error(response.error ?? 'Não foi possível parar a gravação.');
  }

  return { isRecording: false };
}
