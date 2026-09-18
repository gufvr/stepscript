import { vi } from 'vitest'

type StorageValues = Record<string, unknown>

type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void

type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: chrome.storage.AreaName,
) => void

interface WebNavigationDetails {
  tabId: number
  frameId: number
  url: string
  timeStamp: number
  transitionQualifiers: string[]
  documentId?: string
  documentLifecycle?: string
  transitionType?: string
}

type WebNavigationListener = (details: WebNavigationDetails) => void

interface RecorderController {
  setActive(active: boolean): void
  setElementVisibilityPickerActive?(active: boolean): void
  setElementTextPickerActive?(active: boolean): void
}

interface ChromeExtensionHarnessOptions {
  local?: StorageValues
  session?: StorageValues
  tabId?: number
  url?: string
  permissionGranted?: boolean
}

function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value)
}

function selectStoredValues(values: StorageValues, keys: unknown): StorageValues {
  if (keys === null || keys === undefined) {
    return clone(values)
  }

  if (typeof keys === 'string') {
    return keys in values ? { [keys]: clone(values[keys]) } : {}
  }

  if (Array.isArray(keys)) {
    return Object.fromEntries(
      keys
        .filter((key): key is string => typeof key === 'string' && key in values)
        .map((key) => [key, clone(values[key])]),
    )
  }

  if (typeof keys === 'object') {
    return Object.fromEntries(
      Object.entries(keys as StorageValues).map(([key, fallback]) => [
        key,
        key in values ? clone(values[key]) : clone(fallback),
      ]),
    )
  }

  return {}
}

export function createChromeExtensionHarness(
  options: ChromeExtensionHarnessOptions = {},
) {
  const tabId = options.tabId ?? 21
  const url = options.url ?? 'https://qapracticehub.com/#forms'
  let activeTab = { id: tabId, windowId: 1, url }
  let actionListener: ((tab: chrome.tabs.Tab) => void) | undefined
  let activatedListener: ((info: { tabId: number; windowId: number }) => void) | undefined
  let removedListener: ((tabId: number) => void) | undefined
  let updatedListener: ((tabId: number, changes: { url: string }) => void) | undefined
  const localValues = clone(options.local ?? {})
  const sessionValues = {
    activeTabContext: {
      tabId,
      windowId: 1,
      url,
    },
    ...clone(options.session ?? {}),
  }
  const storageListeners = new Set<StorageListener>()
  const recorders = new Map<number, RecorderController>()
  let runtimeListener: RuntimeListener | undefined
  let committedListener: WebNavigationListener | undefined
  let domContentLoadedListener: WebNavigationListener | undefined
  let completedListener: WebNavigationListener | undefined
  let historyStateUpdatedListener: WebNavigationListener | undefined
  let referenceFragmentUpdatedListener: WebNavigationListener | undefined
  let originalClipboardDescriptor: PropertyDescriptor | undefined

  const notifyStorageListeners = (
    previous: StorageValues,
    next: StorageValues,
    areaName: chrome.storage.AreaName,
  ) => {
    const changes = Object.fromEntries(
      Object.keys(next).map((key) => [
        key,
        {
          oldValue: clone(previous[key]),
          newValue: clone(next[key]),
        },
      ]),
    )

    storageListeners.forEach((listener) => listener(changes, areaName))
  }

  const localGet = vi.fn(async (keys?: unknown) =>
    selectStoredValues(localValues, keys),
  )
  const localSet = vi.fn(async (values: StorageValues) => {
    const previous = clone(localValues)
    Object.assign(localValues, clone(values))
    notifyStorageListeners(previous, values, 'local')
  })
  const sessionGet = vi.fn(async (keys?: unknown) =>
    selectStoredValues(sessionValues, keys),
  )
  const sessionSet = vi.fn(async (values: StorageValues) => {
    const previous = clone(sessionValues)
    Object.assign(sessionValues, clone(values))
    notifyStorageListeners(previous, values, 'session')
  })
  const clipboardWrite = vi.fn(async (text: string) => {
    void text
  })
  const permissionRequest = vi.fn(async () => options.permissionGranted ?? true)
  const executeScript = vi.fn(async () => undefined)
  const tabsSendMessage = vi.fn(async (targetTabId: number, message: unknown) => {
    const type =
      typeof message === 'object' && message !== null && 'type' in message
        ? message.type
        : undefined
    const recorder = recorders.get(targetTabId)

    if (type === 'ACTIVATE_CLICK_RECORDER') {
      recorder?.setActive(true)
    }

    if (type === 'DEACTIVATE_CLICK_RECORDER') {
      recorder?.setActive(false)
    }

    if (type === 'ACTIVATE_ELEMENT_VISIBILITY_PICKER') {
      recorder?.setElementVisibilityPickerActive?.(true)
    }

    if (type === 'ACTIVATE_ELEMENT_TEXT_PICKER') {
      recorder?.setElementTextPickerActive?.(true)
    }

    if (type === 'DEACTIVATE_ELEMENT_VISIBILITY_PICKER') {
      recorder?.setElementVisibilityPickerActive?.(false)
    }

    return { success: true }
  })

  const chromeApi = {
    action: {
      onClicked: { addListener: vi.fn((listener: typeof actionListener) => { actionListener = listener }) },
    },
    permissions: {
      request: permissionRequest,
    },
    runtime: {
      lastError: undefined,
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: vi.fn((listener: RuntimeListener) => {
          runtimeListener = listener
        }),
        removeListener: vi.fn((listener: RuntimeListener) => {
          if (runtimeListener === listener) {
            runtimeListener = undefined
          }
        }),
      },
      onStartup: { addListener: vi.fn() },
      sendMessage: vi.fn((message: unknown) =>
        dispatchRuntimeMessage(message, {}),
      ),
    },
    scripting: {
      executeScript,
    },
    sidePanel: {
      open: vi.fn(async () => undefined),
      setPanelBehavior: vi.fn(async () => undefined),
    },
    storage: {
      local: {
        get: localGet,
        set: localSet,
      },
      onChanged: {
        addListener: vi.fn((listener: StorageListener) => {
          storageListeners.add(listener)
        }),
        removeListener: vi.fn((listener: StorageListener) => {
          storageListeners.delete(listener)
        }),
      },
      session: {
        get: sessionGet,
        set: sessionSet,
      },
    },
    tabs: {
      sendMessage: tabsSendMessage,
      query: vi.fn(async () => [clone(activeTab)]),
      onActivated: { addListener: vi.fn((listener: typeof activatedListener) => { activatedListener = listener }) },
      onRemoved: { addListener: vi.fn((listener: typeof removedListener) => { removedListener = listener }) },
      onUpdated: { addListener: vi.fn((listener: typeof updatedListener) => { updatedListener = listener }) },
    },
    webNavigation: {
      onCommitted: {
        addListener: vi.fn((listener: WebNavigationListener) => {
          committedListener = listener
        }),
      },
      onDOMContentLoaded: {
        addListener: vi.fn((listener: WebNavigationListener) => {
          domContentLoadedListener = listener
        }),
      },
      onCompleted: {
        addListener: vi.fn((listener: WebNavigationListener) => {
          completedListener = listener
        }),
      },
      onHistoryStateUpdated: {
        addListener: vi.fn((listener: WebNavigationListener) => {
          historyStateUpdatedListener = listener
        }),
      },
      onReferenceFragmentUpdated: {
        addListener: vi.fn((listener: WebNavigationListener) => {
          referenceFragmentUpdatedListener = listener
        }),
      },
    },
  }

  function dispatchRuntimeMessage(
    message: unknown,
    sender: chrome.runtime.MessageSender,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!runtimeListener) {
        reject(new Error('No background runtime listener is registered.'))
        return
      }

      let responded = false
      const keepChannelOpen = runtimeListener(message, sender, (response) => {
        responded = true
        resolve(response)
      })

      if (keepChannelOpen !== true && !responded) {
        resolve(undefined)
      }
    })
  }

  return {
    openFromAction() {
      actionListener?.(activeTab as chrome.tabs.Tab)
    },
    activateTab(nextTabId: number, nextUrl: string, windowId = 1) {
      activeTab = { id: nextTabId, windowId, url: nextUrl }
      activatedListener?.({ tabId: nextTabId, windowId })
    },
    closeActiveTab() {
      removedListener?.(activeTab.id)
      activeTab = { id: -1, windowId: 1, url: '' }
    },
    navigateActiveTab(nextUrl: string) {
      activeTab = { ...activeTab, url: nextUrl }
      updatedListener?.(activeTab.id, { url: nextUrl })
    },
    clipboardWrite,
    chrome: chromeApi,
    connectRecorder(controller: RecorderController, targetTabId = tabId) {
      recorders.set(targetTabId, controller)
    },
    dispose() {
      vi.unstubAllGlobals()

      if (originalClipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor)
      } else {
        Reflect.deleteProperty(navigator, 'clipboard')
      }
    },
    executeScript,
    emitCommitted(
      destinationUrl: string,
      details: Partial<Omit<WebNavigationDetails, 'url'>> = {},
    ) {
      if ((details.tabId ?? tabId) === activeTab.id && (details.frameId ?? 0) === 0) {
        activeTab = { ...activeTab, url: destinationUrl }
      }
      committedListener?.({
        tabId,
        frameId: 0,
        documentId: 'document-committed',
        documentLifecycle: 'active',
        timeStamp: Date.now(),
        transitionQualifiers: [],
        transitionType: 'link',
        ...details,
        url: destinationUrl,
      })
    },
    emitCompleted(
      destinationUrl: string,
      details: Partial<Omit<WebNavigationDetails, 'url'>> = {},
    ) {
      completedListener?.({
        tabId,
        frameId: 0,
        documentId: 'document-committed',
        documentLifecycle: 'active',
        timeStamp: Date.now(),
        transitionQualifiers: [],
        ...details,
        url: destinationUrl,
      })
    },
    emitDOMContentLoaded(
      destinationUrl: string,
      details: Partial<Omit<WebNavigationDetails, 'url'>> = {},
    ) {
      domContentLoadedListener?.({
        tabId,
        frameId: 0,
        documentId: 'document-committed',
        documentLifecycle: 'active',
        timeStamp: Date.now(),
        transitionQualifiers: [],
        ...details,
        url: destinationUrl,
      })
    },
    emitHistoryStateUpdated(
      destinationUrl: string,
      details: Partial<Omit<WebNavigationDetails, 'url'>> = {},
    ) {
      historyStateUpdatedListener?.({
        tabId,
        frameId: 0,
        timeStamp: Date.now(),
        transitionQualifiers: [],
        ...details,
        url: destinationUrl,
      })
    },
    emitReferenceFragmentUpdated(
      destinationUrl: string,
      details: Partial<Omit<WebNavigationDetails, 'url'>> = {},
    ) {
      referenceFragmentUpdatedListener?.({
        tabId,
        frameId: 0,
        timeStamp: Date.now(),
        transitionQualifiers: [],
        ...details,
        url: destinationUrl,
      })
    },
    getLocalValues() {
      return clone(localValues)
    },
    install() {
      vi.stubGlobal('chrome', chromeApi)
      originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
        navigator,
        'clipboard',
      )
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: clipboardWrite },
      })
    },
    localGet,
    localSet,
    permissionRequest,
    sendFromTab(message: unknown, targetTabId = tabId) {
      const recordingState = localValues.recordingState as
        | { currentDocumentId?: string; currentUrl?: string }
        | undefined
      return dispatchRuntimeMessage(message, {
        tab: {
          id: targetTabId,
          url: recordingState?.currentUrl,
        } as chrome.tabs.Tab,
        frameId: 0,
        documentId: recordingState?.currentDocumentId,
        url: recordingState?.currentUrl,
      })
    },
    tabsSendMessage,
  }
}
