import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureActiveTabContext,
  clearActiveTabContext,
  getActiveTabContext,
  persistActiveTabContext,
  invalidateActiveTabContext,
  invalidateContextForActivation,
  invalidateContextForClosedTab,
  updateActiveTabContextUrl,
  validateActiveTabContext,
} from './activeTabContext';

const get = vi.fn();
const set = vi.fn();
const query = vi.fn();

describe('activeTabContext', () => {
  beforeEach(() => {
    clearActiveTabContext();
    get.mockReset();
    set.mockReset();
    query.mockReset();
    query.mockResolvedValue([{ id: 12, windowId: 3, url: 'https://example.com/form' }]);
    set.mockResolvedValue(undefined);

    vi.stubGlobal('chrome', {
      storage: { session: { get, set } },
      tabs: { query },
    });
  });

  it('captures the action tab synchronously in memory', async () => {
    const context = captureActiveTabContext({
      id: 12,
      windowId: 3,
      url: 'https://example.com/form',
    } as chrome.tabs.Tab);

    expect(context).toEqual({
      tabId: 12,
      windowId: 3,
      url: 'https://example.com/form',
    });
    await expect(getActiveTabContext()).resolves.toEqual(context);
    expect(get).not.toHaveBeenCalled();
  });

  it('does not capture a tab whose protected URL is unavailable', () => {
    const context = captureActiveTabContext({
      id: 12,
      windowId: 3,
    } as chrome.tabs.Tab);

    expect(context).toBeUndefined();
  });

  it('persists a captured context for service worker restarts', async () => {
    const context = {
      tabId: 12,
      windowId: 3,
      url: 'https://example.com/form',
    };

    await expect(persistActiveTabContext(context)).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith({ activeTabContext: context });
  });

  it('contains persistence failures instead of rejecting', async () => {
    set.mockRejectedValue(new Error('Storage unavailable'));

    await expect(
      persistActiveTabContext({
        tabId: 12,
        windowId: 3,
        url: 'https://example.com/form',
      }),
    ).resolves.toBe(false);
    await expect(validateActiveTabContext()).resolves.toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });

  it('restores the context from session storage after memory is lost', async () => {
    get.mockResolvedValue({
      activeTabContext: {
        tabId: 12,
        windowId: 3,
        url: 'https://example.com/form',
      },
    });

    await expect(getActiveTabContext()).resolves.toEqual({
      tabId: 12,
      windowId: 3,
      url: 'https://example.com/form',
    });
  });

  function capture() {
    return captureActiveTabContext({ id: 12, windowId: 3, url: 'https://example.com/form' } as chrome.tabs.Tab)!;
  }

  it('refreshes the current URL only within the authorized origin', async () => {
    capture();
    query.mockResolvedValue([{ id: 12, windowId: 3, url: 'https://example.com/next#section' }]);
    await expect(validateActiveTabContext()).resolves.toMatchObject({ url: 'https://example.com/next#section' });
    expect(query).toHaveBeenCalledWith({ active: true, windowId: 3 });
    expect(set).toHaveBeenCalledWith({ activeTabContext: { tabId: 12, windowId: 3, url: 'https://example.com/next#section' } });
  });

  it.each([
    { id: 13, windowId: 3, url: 'https://example.com/form' },
    { id: 12, windowId: 3, url: 'https://other.example/form' },
    { id: 12, windowId: 3 },
    { id: 12, windowId: 3, url: 'https://example.com/form', pendingUrl: 'https://other.example/' },
  ])('invalidates inaccessible, changed or navigating tabs: %j', async (tab) => {
    capture();
    query.mockResolvedValue([tab]);
    await expect(validateActiveTabContext()).resolves.toBeUndefined();
    expect(set).toHaveBeenCalledWith({ activeTabContext: null });
    await expect(getActiveTabContext()).resolves.toBeUndefined();
  });

  it('invalidates activation only in the panel window and requires a new action after switching back', async () => {
    capture();
    await invalidateContextForActivation(13, 4);
    expect(await getActiveTabContext()).toBeDefined();
    await invalidateContextForActivation(13, 3);
    await invalidateContextForActivation(12, 3);
    expect(await getActiveTabContext()).toBeUndefined();
    capture();
    expect(await validateActiveTabContext()).toBeDefined();
  });

  it('ignores unrelated tab navigation/closure and invalidates the authorized closed tab', async () => {
    capture();
    await updateActiveTabContextUrl(99, 'https://other.example/');
    await invalidateContextForClosedTab(99);
    expect(await getActiveTabContext()).toBeDefined();
    await invalidateContextForClosedTab(12);
    expect(await getActiveTabContext()).toBeUndefined();
  });

  it('rejects cross-origin changes even before validating a tab', async () => {
    capture();
    await updateActiveTabContextUrl(12, 'https://other.example/');
    expect(await getActiveTabContext()).toBeUndefined();
  });

  it('waits for persistence and serializes invalidation without restoring the old context', async () => {
    let finish!: () => void;
    set.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }));
    const writing = persistActiveTabContext(capture());
    const invalidating = invalidateActiveTabContext();
    const reading = getActiveTabContext();
    expect(set).toHaveBeenCalledTimes(1);
    finish();
    await writing;
    await invalidating;
    expect(await reading).toBeUndefined();
    expect(set).toHaveBeenLastCalledWith({ activeTabContext: null });
  });

  it('does not restore a stale asynchronous session read after invalidation', async () => {
    let finish!: (value: unknown) => void;
    get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }));
    const reading = getActiveTabContext();
    await Promise.resolve();
    await invalidateActiveTabContext();
    finish({ activeTabContext: { tabId: 12, windowId: 3, url: 'https://example.com/form' } });
    expect(await reading).toBeUndefined();
  });
});
