import type { ActiveTabContext } from '../shared/recordingTypes';

const ACTIVE_TAB_CONTEXT_KEY = 'activeTabContext';
let activeTabContext: ActiveTabContext | undefined;
let contextLoaded = false;
let revision = 0;
let pendingPersistence: Promise<boolean> | undefined;

export const STALE_TAB_CONTEXT_MESSAGE =
  'Reabra o StepScript pelo ícone na aba que deseja gravar.';

function writeContext(context: ActiveTabContext | null) {
  const performWrite = async () => {
    try {
      await chrome.storage.session.set({ [ACTIVE_TAB_CONTEXT_KEY]: context });
      return true;
    } catch {
      return false;
    }
  };
  const result = pendingPersistence ? pendingPersistence.then(performWrite) : performWrite();
  pendingPersistence = result;
  void result.then((persisted) => {
    if (pendingPersistence !== result) return;
    pendingPersistence = undefined;
    if (!persisted) {
      activeTabContext = undefined;
      contextLoaded = true;
      revision += 1;
    }
  });
  return result;
}

export function captureActiveTabContext(tab: chrome.tabs.Tab) {
  if (!tab.id || tab.windowId === undefined || !tab.url) {
    void invalidateActiveTabContext();
    return undefined;
  }

  activeTabContext = {
    tabId: tab.id,
    windowId: tab.windowId,
    url: tab.url,
  };
  contextLoaded = true;
  revision += 1;
  return activeTabContext;
}

export function persistActiveTabContext(context: ActiveTabContext) {
  activeTabContext = context;
  contextLoaded = true;
  revision += 1;
  return writeContext(context);
}

export function invalidateActiveTabContext() {
  activeTabContext = undefined;
  contextLoaded = true;
  revision += 1;
  return writeContext(null);
}

export async function getActiveTabContext(): Promise<ActiveTabContext | undefined> {
  await pendingPersistence;
  if (contextLoaded) return activeTabContext;
  const readRevision = revision;

  try {
    const result = await chrome.storage.session.get(ACTIVE_TAB_CONTEXT_KEY);
    if (readRevision !== revision) {
      await pendingPersistence;
      return activeTabContext;
    }
    const context = result[ACTIVE_TAB_CONTEXT_KEY] as Partial<ActiveTabContext> | undefined;

    if (
      typeof context?.tabId !== 'number' ||
      typeof context.windowId !== 'number' ||
      typeof context.url !== 'string'
    ) {
      return undefined;
    }

    activeTabContext = {
      tabId: context.tabId,
      windowId: context.windowId,
      url: context.url,
    };
    contextLoaded = true;
    return activeTabContext;
  } catch {
    return undefined;
  }
}

export async function updateActiveTabContextUrl(tabId: number, url: string) {
  const context = await getActiveTabContext();
  if (!context || context.tabId !== tabId) return;
  try {
    const previous = new URL(context.url);
    const next = new URL(url);
    if (!['http:', 'https:'].includes(next.protocol) || next.origin !== previous.origin) {
      await invalidateActiveTabContext();
    } else if (url !== context.url) {
      await persistActiveTabContext({ ...context, url });
    }
  } catch {
    await invalidateActiveTabContext();
  }
}

export async function invalidateContextForActivation(tabId: number, windowId: number) {
  const context = await getActiveTabContext();
  if (context?.windowId === windowId && context.tabId !== tabId) {
    await invalidateActiveTabContext();
  }
}

export async function invalidateContextForClosedTab(tabId: number) {
  if ((await getActiveTabContext())?.tabId === tabId) {
    await invalidateActiveTabContext();
  }
}

export async function validateActiveTabContext() {
  const context = await getActiveTabContext();
  if (!context) return undefined;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId: context.windowId });
    if (activeTabContext !== context) return undefined;
    if (tab?.id !== context.tabId || !tab.url || (tab.pendingUrl && tab.pendingUrl !== tab.url)) {
      await invalidateActiveTabContext();
      return undefined;
    }
    await updateActiveTabContextUrl(context.tabId, tab.url);
    return await getActiveTabContext();
  } catch {
    await invalidateActiveTabContext();
    return undefined;
  }
}

export function clearActiveTabContext() {
  activeTabContext = undefined;
  contextLoaded = false;
  revision += 1;
  pendingPersistence = undefined;
}
