import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionMessage } from './shared/messages';
import type {
  RecordedColorChange,
  RecordedClick,
  RecordedFieldFill,
  RecordedKeyPress,
  RecordedRangeChange,
  RecordedSelectionChange,
} from './shared/recordingTypes';

const actionOnClicked = vi.fn();
const runtimeOnInstalled = vi.fn();
const runtimeOnStartup = vi.fn();
const runtimeOnMessage = vi.fn();
const navigationCommitted = vi.fn();
const navigationDOMContentLoaded = vi.fn();
const navigationCompleted = vi.fn();
const historyStateUpdated = vi.fn();
const referenceFragmentUpdated = vi.fn();
const openSidePanel = vi.fn();
const setPanelBehavior = vi.fn();
const getSessionStorage = vi.fn();
const setSessionStorage = vi.fn();
const getLocalStorage = vi.fn();
const setLocalStorage = vi.fn();
const executeScript = vi.fn();
const tabsSendMessage = vi.fn();
const tabsActivated = vi.fn();
const tabsRemoved = vi.fn();
const tabsUpdated = vi.fn();
const tabsQuery = vi.fn();

let localStorageData: Record<string, unknown>;
let sessionStorageData: Record<string, unknown>;

function createRecordedClick(id: string): RecordedClick {
  return {
    schemaVersion: 4,
    id,
    type: 'click',
    url: 'https://example.com/form',
    timestamp: 1,
    selectors: {
      recommended: {
        strategy: 'css',
        value: 'button',
        score: 40,
        isUnique: true,
        validation: {
          status: 'valid',
          matchCount: 1,
          matchesTarget: true,
        },
      },
      alternatives: [],
    },
    element: { tagName: 'button', text: id },
    description: {
      action: 'click',
      target: { type: 'button', name: id },
      source: 'text',
      text: `Clicou no botão "${id}"`,
      locale: 'pt-BR',
    },
  };
}

function createRecordedFieldFill(id: string): RecordedFieldFill {
  return {
    schemaVersion: 5,
    id,
    type: 'field-fill',
    url: 'https://example.com/form',
    timestamp: 1,
    selectors: {
      recommended: {
        strategy: 'label',
        value: 'Username',
        score: 85,
        isUnique: true,
        validation: {
          status: 'valid',
          matchCount: 1,
          matchesTarget: true,
        },
      },
      alternatives: [],
    },
    element: { tagName: 'input', inputType: 'text' },
    value: { kind: 'plain', value: 'tester' },
    description: {
      action: 'fieldFill',
      target: { type: 'field', name: 'Username' },
      source: 'label',
      text: 'Preencheu o campo "Username" com "tester"',
      locale: 'pt-BR',
    },
  };
}

function createRecordedSelection(id: string): RecordedSelectionChange {
  const click = createRecordedClick(id);

  return {
    schemaVersion: 6,
    id,
    type: 'selection-change',
    url: click.url,
    timestamp: click.timestamp,
    selectors: click.selectors,
    element: { tagName: 'input', inputType: 'checkbox' },
    control: { kind: 'checkbox', checked: true },
    description: {
      action: 'selectionChange',
      target: { type: 'checkbox', name: 'Remember me' },
      source: 'label',
      text: 'Marcou a caixa de seleção "Remember me"',
      locale: 'pt-BR',
    },
  };
}

function createRecordedKeyPress(id: string): RecordedKeyPress {
  const click = createRecordedClick(id);

  return {
    schemaVersion: 6,
    id,
    type: 'key-press',
    url: click.url,
    timestamp: click.timestamp,
    key: 'Enter',
    selectors: click.selectors,
    element: { tagName: 'button', text: 'Login' },
    description: {
      action: 'keyPress',
      target: { type: 'button', name: 'Login' },
      source: 'text',
      text: 'Pressionou Enter no botão "Login"',
      locale: 'pt-BR',
    },
  };
}

function createRecordedRangeChange(id: string): RecordedRangeChange {
  const click = createRecordedClick(id);

  return {
    schemaVersion: 7,
    id,
    type: 'range-change',
    url: click.url,
    timestamp: click.timestamp,
    selectors: click.selectors,
    element: { tagName: 'input', inputType: 'range' },
    value: { kind: 'plain', value: '7' },
    description: {
      action: 'rangeChange',
      target: { type: 'field', name: 'Experience' },
      source: 'label',
      text: 'Ajustou o controle deslizante "Experience" para "7"',
      locale: 'pt-BR',
    },
  };
}

function createRecordedColorChange(id: string): RecordedColorChange {
  const click = createRecordedClick(id);

  return {
    schemaVersion: 8,
    id,
    type: 'color-change',
    url: click.url,
    timestamp: click.timestamp,
    selectors: click.selectors,
    element: { tagName: 'input', inputType: 'color' },
    value: { kind: 'plain', value: '#663399' },
    description: {
      action: 'colorChange',
      target: { type: 'field', name: 'Color Picker' },
      source: 'label',
      text: 'Selecionou a cor "#663399" no seletor de cor "Color Picker"',
      locale: 'pt-BR',
    },
  };
}

function dispatchMessage(
  message: ExtensionMessage,
  sender: {
    tab?: { id: number };
    frameId?: number;
    documentId?: string;
    url?: string;
  } = {},
) {
  const handleMessage = runtimeOnMessage.mock.calls[0][0];

  return new Promise((resolve) => {
    expect(handleMessage(message, sender, resolve)).toBe(true);
  });
}

describe('extension action', () => {
  beforeEach(async () => {
    vi.resetModules();
    actionOnClicked.mockReset();
    runtimeOnInstalled.mockReset();
    runtimeOnStartup.mockReset();
    runtimeOnMessage.mockReset();
    navigationCommitted.mockReset();
    navigationDOMContentLoaded.mockReset();
    navigationCompleted.mockReset();
    historyStateUpdated.mockReset();
    referenceFragmentUpdated.mockReset();
    openSidePanel.mockReset();
    setPanelBehavior.mockReset();
    getSessionStorage.mockReset();
    setSessionStorage.mockReset();
    getLocalStorage.mockReset();
    setLocalStorage.mockReset();
    executeScript.mockReset();
    tabsSendMessage.mockReset();
    tabsActivated.mockReset();
    tabsRemoved.mockReset();
    tabsUpdated.mockReset();
    tabsQuery.mockReset();
    tabsQuery.mockResolvedValue([{ id: 21, windowId: 4, url: 'https://example.com/form' }]);
    localStorageData = {};
    sessionStorageData = {};
    openSidePanel.mockResolvedValue(undefined);
    getSessionStorage.mockImplementation((keys: string | string[]) => {
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      return Promise.resolve(
        Object.fromEntries(
          requestedKeys.map((key) => [key, sessionStorageData[key]]),
        ),
      );
    });
    setSessionStorage.mockImplementation((values: Record<string, unknown>) => {
      Object.assign(sessionStorageData, values);
      return Promise.resolve();
    });
    getLocalStorage.mockImplementation((keys: string | string[]) => {
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      return Promise.resolve(
        Object.fromEntries(
          requestedKeys.map((key) => [key, localStorageData[key]]),
        ),
      );
    });
    setLocalStorage.mockImplementation((values: Record<string, unknown>) => {
      Object.assign(localStorageData, values);
      return Promise.resolve();
    });
    executeScript.mockResolvedValue(undefined);
    tabsSendMessage.mockResolvedValue({ success: true });

    vi.stubGlobal('chrome', {
      action: { onClicked: { addListener: actionOnClicked } },
      runtime: {
        onInstalled: { addListener: runtimeOnInstalled },
        onStartup: { addListener: runtimeOnStartup },
        onMessage: { addListener: runtimeOnMessage },
      },
      sidePanel: { open: openSidePanel, setPanelBehavior },
      storage: {
        session: { get: getSessionStorage, set: setSessionStorage },
        local: { get: getLocalStorage, set: setLocalStorage },
      },
      scripting: { executeScript },
      tabs: {
        sendMessage: tabsSendMessage, query: tabsQuery,
        onActivated: { addListener: tabsActivated },
        onRemoved: { addListener: tabsRemoved },
        onUpdated: { addListener: tabsUpdated },
      },
      webNavigation: {
        onCommitted: { addListener: navigationCommitted },
        onDOMContentLoaded: { addListener: navigationDOMContentLoaded },
        onCompleted: { addListener: navigationCompleted },
        onHistoryStateUpdated: { addListener: historyStateUpdated },
        onReferenceFragmentUpdated: { addListener: referenceFragmentUpdated },
      },
    });

    await import('./background');
  });

  it('begins context persistence before opening synchronously while the write is pending', () => {
    setSessionStorage.mockReturnValue(new Promise(() => undefined));
    const handleActionClick = actionOnClicked.mock.calls[0][0];

    const result = handleActionClick({
      id: 21,
      windowId: 4,
      url: 'https://example.com/form',
    });

    expect(result).toBeUndefined();
    expect(openSidePanel).toHaveBeenCalledWith({ tabId: 21 });
    expect(setSessionStorage).toHaveBeenCalledWith({
      activeTabContext: {
        tabId: 21,
        windowId: 4,
        url: 'https://example.com/form',
      },
    });
    expect(setSessionStorage.mock.invocationCallOrder[0]).toBeLessThan(
      openSidePanel.mock.invocationCallOrder[0],
    );
  });

  it('contains a rejected side panel promise', async () => {
    openSidePanel.mockRejectedValue(new Error('User gesture unavailable'));
    const handleActionClick = actionOnClicked.mock.calls[0][0];

    expect(() =>
      handleActionClick({
        id: 21,
        windowId: 4,
        url: 'https://example.com/form',
      }),
    ).not.toThrow();

    await Promise.resolve();
  });

  it('invalidates previous context and does not open when activeTab did not expose a URL', () => {
    const handleActionClick = actionOnClicked.mock.calls[0][0];

    handleActionClick({ id: 21, windowId: 4 });

    expect(setSessionStorage).toHaveBeenCalledWith({ activeTabContext: null });
    expect(openSidePanel).not.toHaveBeenCalled();
  });

  it('stores focus navigation in the active tab recording', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [],
    };
    const message: ExtensionMessage = {
      type: 'RECORDED_FOCUS_NAVIGATION',
      payload: {
        schemaVersion: 4,
        id: 'focus-password',
        type: 'focus-navigation',
        url: 'https://example.com/form',
        timestamp: 1,
        key: 'Tab',
        direction: 'forward',
        selectors: {
          recommended: {
            strategy: 'label',
            value: 'Password',
            score: 85,
            isUnique: true,
            validation: {
              status: 'valid',
              matchCount: 1,
              matchesTarget: true,
            },
          },
          alternatives: [],
        },
        element: { tagName: 'input', inputType: 'password' },
        description: {
          action: 'focusNavigation',
          target: { type: 'field', name: 'Password' },
          source: 'label',
          text: 'Navegou para o campo "Password"',
          locale: 'pt-BR',
        },
      },
    };
    const response = await dispatchMessage(message, { tab: { id: 21 } });

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([message.payload]);
  });

  it('stores a schema 5 field fill in the active tab recording', async () => {
    const fill = createRecordedFieldFill('fill-username');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [],
    };

    const response = await dispatchMessage(
      { type: 'RECORDED_FIELD_FILL', payload: fill },
      { tab: { id: 21 } },
    );

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([fill]);
  });

  it('serializes schema 6 selection and key steps', async () => {
    const selection = createRecordedSelection('select-remember');
    const keyPress = createRecordedKeyPress('key-login');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [],
    };

    const selectionResponse = dispatchMessage(
      { type: 'RECORDED_SELECTION_CHANGE', payload: selection },
      { tab: { id: 21 } },
    );
    const keyResponse = dispatchMessage(
      { type: 'RECORDED_KEY_PRESS', payload: keyPress },
      { tab: { id: 21 } },
    );

    await expect(Promise.all([selectionResponse, keyResponse])).resolves.toEqual(
      [{ success: true }, { success: true }],
    );
    expect(localStorageData.recordedSteps).toEqual([selection, keyPress]);
  });

  it('stores a schema 7 range change in the active tab recording', async () => {
    const rangeChange = createRecordedRangeChange('range-experience');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [],
    };

    const response = await dispatchMessage(
      { type: 'RECORDED_RANGE_CHANGE', payload: rangeChange },
      { tab: { id: 21 } },
    );

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([rangeChange]);
  });

  it('stores a schema 8 color change in the active tab recording', async () => {
    const colorChange = createRecordedColorChange('color-theme');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [],
    };

    const response = await dispatchMessage(
      { type: 'RECORDED_COLOR_CHANGE', payload: colorChange },
      { tab: { id: 21 } },
    );

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([colorChange]);
  });

  it('deletes one step and preserves mixed recordings in order', async () => {
    const first = createRecordedClick('first');
    const legacy = { type: 'click', selector: { css: 'a' } };
    const last = createRecordedClick('last');
    localStorageData = {
      recordingState: { isRecording: false },
      recordedSteps: [first, legacy, last],
    };

    const response = await dispatchMessage({
      type: 'DELETE_RECORDED_STEP',
      payload: { stepIndex: 1 },
    });

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([first, last]);
    expect(localStorageData.recordingState).toEqual({ isRecording: false });
  });

  it('rejects deletion when a stable id no longer matches the index', async () => {
    const current = createRecordedClick('current');
    localStorageData = { recordedSteps: [current] };

    const response = await dispatchMessage({
      type: 'DELETE_RECORDED_STEP',
      payload: { stepIndex: 0, expectedId: 'stale-id' },
    });

    expect(response).toEqual({
      success: false,
      error: 'A lista de passos foi atualizada. Tente novamente.',
    });
    expect(localStorageData.recordedSteps).toEqual([current]);
  });

  it('updates only the description override and normalizes its text', async () => {
    const step = createRecordedClick('editable');
    localStorageData = { recordedSteps: [step] };

    const response = await dispatchMessage({
      type: 'UPDATE_RECORDED_STEP_DESCRIPTION',
      payload: {
        stepIndex: 0,
        expectedId: 'editable',
        expectedReference: JSON.stringify(step),
        text: '  Efetuou\n  o login  ',
      },
    });

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([
      {
        ...step,
        descriptionOverride: {
          text: 'Efetuou o login',
          locale: 'pt-BR',
        },
      },
    ]);
    expect(step).not.toHaveProperty('descriptionOverride');
  });

  it('edits a legacy step without migrating its original fields', async () => {
    const legacy = {
      type: 'click',
      selector: { css: 'button' },
      element: { tagName: 'button', text: 'Legado' },
    };
    localStorageData = { recordedSteps: [legacy] };

    const response = await dispatchMessage({
      type: 'UPDATE_RECORDED_STEP_DESCRIPTION',
      payload: {
        stepIndex: 0,
        expectedReference: JSON.stringify(legacy),
        text: 'Executou o passo legado',
      },
    });

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([
      {
        ...legacy,
        descriptionOverride: {
          text: 'Executou o passo legado',
          locale: 'pt-BR',
        },
      },
    ]);
  });

  it('rejects invalid text and stale description edits', async () => {
    const step = createRecordedClick('current');
    localStorageData = { recordedSteps: [step] };

    await expect(
      dispatchMessage({
        type: 'UPDATE_RECORDED_STEP_DESCRIPTION',
        payload: {
          stepIndex: 0,
          expectedId: 'current',
          expectedReference: JSON.stringify(step),
          text: '   ',
        },
      }),
    ).resolves.toEqual({
      success: false,
      error: 'A descrição não pode ficar vazia.',
    });
    await expect(
      dispatchMessage({
        type: 'UPDATE_RECORDED_STEP_DESCRIPTION',
        payload: {
          stepIndex: 0,
          expectedId: 'current',
          expectedReference: '{"stale":true}',
          text: 'Nova descrição',
        },
      }),
    ).resolves.toEqual({
      success: false,
      error: 'A lista de passos foi atualizada. Abra a edição novamente.',
    });
    expect(localStorageData.recordedSteps).toEqual([step]);
  });

  it('moves adjacent mixed-schema steps without changing their contents', async () => {
    const current = createRecordedClick('current');
    const legacy = {
      type: 'click',
      selector: { css: 'button.legacy' },
      element: { tagName: 'button', text: 'Legado' },
    };
    const navigation = {
      schemaVersion: 10,
      id: 'navigation',
      type: 'navigation',
      fromUrl: 'https://example.com/start',
      toUrl: 'https://example.com/account',
    };
    localStorageData = { recordedSteps: [current, legacy, navigation] };

    const response = await dispatchMessage({
      type: 'MOVE_RECORDED_STEP',
      payload: {
        fromIndex: 2,
        toIndex: 1,
        expectedStepReference: JSON.stringify(navigation),
        expectedTargetReference: JSON.stringify(legacy),
        expectedId: 'navigation',
      },
    });

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([
      current,
      navigation,
      legacy,
    ]);
  });

  it('rejects invalid or stale step movements without changing storage', async () => {
    const first = createRecordedClick('first');
    const second = createRecordedClick('second');
    const third = createRecordedClick('third');
    localStorageData = { recordedSteps: [first, second, third] };

    await expect(
      dispatchMessage({
        type: 'MOVE_RECORDED_STEP',
        payload: {
          fromIndex: 0,
          toIndex: 2,
          expectedStepReference: JSON.stringify(first),
          expectedTargetReference: JSON.stringify(third),
        },
      }),
    ).resolves.toEqual({
      success: false,
      error: 'A movimentação solicitada é inválida.',
    });
    await expect(
      dispatchMessage({
        type: 'MOVE_RECORDED_STEP',
        payload: {
          fromIndex: 1,
          toIndex: 0,
          expectedStepReference: JSON.stringify(second),
          expectedTargetReference: JSON.stringify(first),
          expectedId: 'stale-step',
          expectedTargetId: 'first',
        },
      }),
    ).resolves.toEqual({
      success: false,
      error: 'A lista de passos foi atualizada. Tente mover novamente.',
    });
    await expect(
      dispatchMessage({
        type: 'MOVE_RECORDED_STEP',
        payload: {
          fromIndex: 1,
          toIndex: 0,
          expectedStepReference: JSON.stringify(second),
          expectedTargetReference: '{"stale":true}',
          expectedId: 'second',
          expectedTargetId: 'first',
        },
      }),
    ).resolves.toEqual({
      success: false,
      error: 'A lista de passos foi atualizada. Tente mover novamente.',
    });
    expect(localStorageData.recordedSteps).toEqual([first, second, third]);
  });

  it('clears every step without stopping an active recording', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [createRecordedClick('first')],
    };

    const response = await dispatchMessage({ type: 'CLEAR_RECORDED_STEPS' });

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([]);
    expect(localStorageData.recordingState).toMatchObject({
      isRecording: true,
      tabId: 21,
    });
  });

  it('appends a schema 11 assertion from the background current URL', async () => {
    const existingStep = createRecordedClick('existing');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/account?tab=security#password',
      },
      recordedSteps: [existingStep],
    };

    const response = await dispatchMessage({
      type: 'ADD_CURRENT_URL_ASSERTION',
    });

    expect(response).toEqual({ success: true });
    expect(localStorageData.recordedSteps).toEqual([
      existingStep,
      expect.objectContaining({
        schemaVersion: 11,
        type: 'assertion',
        url: 'https://example.com/account?tab=security#password',
        timestamp: expect.any(Number),
        id: expect.any(String),
        assertion: {
          kind: 'url',
          operator: 'equals',
          expected: 'https://example.com/account?tab=security#password',
        },
        description: {
          action: 'urlAssertion',
          text: 'Verificou que a URL é "/account?tab=security#password"',
          locale: 'pt-BR',
        },
      }),
    ]);
  });

  it('rejects URL assertions while stopped or when background state is invalid', async () => {
    localStorageData = {
      recordingState: {
        isRecording: false,
        currentUrl: 'https://example.com/account',
      },
      recordedSteps: [],
    };

    await expect(
      dispatchMessage({ type: 'ADD_CURRENT_URL_ASSERTION' }),
    ).resolves.toEqual({
      success: false,
      error: 'Inicie uma gravação para verificar a URL atual.',
    });

    localStorageData.recordingState = {
      isRecording: true,
      tabId: 21,
      origin: 'https://example.com',
      currentUrl: 'https://other.example/account',
    };

    await expect(
      dispatchMessage({ type: 'ADD_CURRENT_URL_ASSERTION' }),
    ).resolves.toEqual({
      success: false,
      error: 'Não foi possível identificar uma URL atual válida.',
    });
    expect(localStorageData.recordedSteps).toEqual([]);
  });

  it('coordinates selection and constructs a validated schema 12 assertion in the background', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/form',
      },
      recordedSteps: [],
    };

    await expect(
      dispatchMessage({ type: 'START_ELEMENT_VISIBILITY_PICKER' }),
    ).resolves.toMatchObject({ success: true, pickerState: { active: true, tabId: 21 } });
    expect(tabsSendMessage).toHaveBeenCalledWith(21, {
      type: 'ACTIVATE_ELEMENT_VISIBILITY_PICKER',
    }, { frameId: 0 });

    const response = await dispatchMessage(
      {
        type: 'SELECT_ELEMENT_VISIBILITY_ASSERTION',
        payload: {
          selectors: {
            recommended: {
              strategy: 'testId',
              attribute: 'data-testid',
              value: 'login-submit',
              score: 100,
              isUnique: true,
              validation: {
                status: 'valid',
                matchCount: 1,
                matchesTarget: true,
              },
            },
            alternatives: [],
          },
          element: { tagName: 'button', text: 'Entrar' },
        },
      },
      { tab: { id: 21 } },
    );

    expect(response).toMatchObject({
      success: true,
      pickerState: { active: false, outcome: 'success' },
    });
    expect(localStorageData.recordedSteps).toEqual([
      expect.objectContaining({
        schemaVersion: 12,
        type: 'assertion',
        url: 'https://example.com/form',
        assertion: { kind: 'element', operator: 'visible' },
        description: expect.objectContaining({
          action: 'elementVisibilityAssertion',
          text: 'Verificou que o botão "Entrar" está visível',
        }),
      }),
    ]);
  });

  it('coordinates selection and constructs a validated schema 13 text assertion', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/form',
        currentDocumentId: 'document-current',
      },
      recordedSteps: [],
    };

    await expect(
      dispatchMessage({ type: 'START_ELEMENT_TEXT_PICKER' }),
    ).resolves.toMatchObject({
      success: true,
      pickerState: { active: true, mode: 'text', tabId: 21 },
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(
      21,
      { type: 'ACTIVATE_ELEMENT_TEXT_PICKER' },
      { frameId: 0 },
    );

    const response = await dispatchMessage(
      {
        type: 'SELECT_ELEMENT_TEXT_ASSERTION',
        payload: {
          selectors: {
            recommended: {
              strategy: 'testId',
              attribute: 'data-testid',
              value: 'order-status',
              score: 100,
              isUnique: true,
              validation: {
                status: 'valid',
                matchCount: 1,
                matchesTarget: true,
              },
            },
            alternatives: [],
          },
          element: { tagName: 'p', text: 'Pedido aprovado' },
          expectedText: '  Pedido\n  aprovado  ',
        },
      },
      {
        tab: { id: 21 },
        frameId: 0,
        documentId: 'document-current',
        url: 'https://example.com/form',
      },
    );

    expect(response).toMatchObject({
      success: true,
      pickerState: { active: false, outcome: 'success' },
    });
    expect(localStorageData.recordedSteps).toEqual([
      expect.objectContaining({
        schemaVersion: 13,
        type: 'assertion',
        assertion: {
          kind: 'element',
          operator: 'text-equals',
          expected: 'Pedido aprovado',
        },
        description: expect.objectContaining({
          action: 'elementTextAssertion',
          text: 'Verificou que o elemento "Pedido aprovado" tem o texto exato "Pedido aprovado"',
        }),
      }),
    ]);
  });

  it('rejects unsafe text assertions before persisting them', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/form',
        currentDocumentId: 'document-current',
      },
      recordedSteps: [],
    };
    sessionStorageData.elementVisibilityPickerState = {
      active: true,
      mode: 'text',
      tabId: 21,
      updatedAt: 1,
    };
    const validPayload = {
      selectors: {
        recommended: {
          strategy: 'testId' as const,
          attribute: 'data-testid' as const,
          value: 'order-status',
          score: 100,
          isUnique: true,
          validation: {
            status: 'valid' as const,
            matchCount: 1,
            matchesTarget: true,
          },
        },
        alternatives: [],
      },
      element: { tagName: 'p', text: 'Pedido aprovado' },
      expectedText: 'Pedido aprovado',
    };
    const validSender = {
      tab: { id: 21 },
      frameId: 0,
      documentId: 'document-current',
      url: 'https://example.com/form',
    };

    const attempts: Array<[unknown, typeof validSender]> = [
      [{ ...validPayload, expectedText: '   ' }, validSender],
      [{ ...validPayload, expectedText: 'x'.repeat(201) }, validSender],
      [
        { ...validPayload, element: { tagName: 'input', inputType: 'text' } },
        validSender,
      ],
      [validPayload, { ...validSender, frameId: 2 }],
      [validPayload, { ...validSender, documentId: 'document-forged' }],
      [validPayload, { ...validSender, url: 'https://other.example/form' }],
    ];

    for (const [payload, sender] of attempts) {
      await expect(
        dispatchMessage(
          { type: 'SELECT_ELEMENT_TEXT_ASSERTION', payload } as ExtensionMessage,
          sender,
        ),
      ).resolves.toMatchObject({ success: false });
    }

    sessionStorageData.elementVisibilityPickerState = {
      active: true,
      mode: 'visibility',
      tabId: 21,
      updatedAt: 2,
    };
    await expect(
      dispatchMessage(
        { type: 'SELECT_ELEMENT_TEXT_ASSERTION', payload: validPayload },
        validSender,
      ),
    ).resolves.toMatchObject({ success: false });

    sessionStorageData.elementVisibilityPickerState = {
      active: true,
      mode: 'text',
      tabId: 21,
      updatedAt: 3,
    };
    await expect(
      dispatchMessage(
        {
          type: 'SELECT_ELEMENT_TEXT_ASSERTION',
          payload: {
            ...validPayload,
            selectors: {
              recommended: {
                ...validPayload.selectors.recommended,
                isUnique: false,
                validation: {
                  status: 'ambiguous',
                  matchCount: 2,
                  matchesTarget: true,
                },
              },
              alternatives: [],
            },
          },
        },
        validSender,
      ),
    ).resolves.toMatchObject({ success: false });

    expect(localStorageData.recordedSteps).toEqual([]);
  });

  it('rejects forged visibility selections from another tab or an ambiguous selector', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/form',
      },
      recordedSteps: [],
    };
    sessionStorageData.elementVisibilityPickerState = {
      active: true,
      tabId: 21,
      updatedAt: 1,
    };
    const message: ExtensionMessage = {
      type: 'SELECT_ELEMENT_VISIBILITY_ASSERTION',
      payload: {
        selectors: {
          recommended: {
            strategy: 'css',
            value: 'button',
            score: 1,
            isUnique: false,
            validation: {
              status: 'ambiguous',
              matchCount: 2,
              matchesTarget: true,
            },
          },
          alternatives: [],
        },
        element: { tagName: 'button', text: 'Entrar' },
      },
    };

    await expect(dispatchMessage(message, { tab: { id: 99 } })).resolves.toMatchObject({
      success: false,
    });
    await expect(dispatchMessage(message, { tab: { id: 21 } })).resolves.toMatchObject({
      success: false,
    });
    expect(localStorageData.recordedSteps).toEqual([]);
  });

  it('serializes a capture followed by a URL assertion without losing order', async () => {
    const first = createRecordedClick('first');
    const captured = createRecordedClick('captured');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/current',
      },
      recordedSteps: [first],
    };

    const capture = dispatchMessage(
      { type: 'RECORDED_CLICK', payload: captured },
      { tab: { id: 21 } },
    );
    const assertion = dispatchMessage({
      type: 'ADD_CURRENT_URL_ASSERTION',
    });

    await expect(Promise.all([capture, assertion])).resolves.toEqual([
      { success: true },
      { success: true },
    ]);
    expect(
      (localStorageData.recordedSteps as Array<Record<string, unknown>>).map(
        ({ type }) => type,
      ),
    ).toEqual(['click', 'click', 'assertion']);
  });

  it('serializes a capture followed by deletion without losing the capture', async () => {
    const first = createRecordedClick('first');
    const second = createRecordedClick('second');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [first],
    };

    const capture = dispatchMessage(
      { type: 'RECORDED_CLICK', payload: second },
      { tab: { id: 21 } },
    );
    const deletion = dispatchMessage({
      type: 'DELETE_RECORDED_STEP',
      payload: { stepIndex: 0, expectedId: 'first' },
    });

    await expect(Promise.all([capture, deletion])).resolves.toEqual([
      { success: true },
      { success: true },
    ]);
    expect(localStorageData.recordedSteps).toEqual([second]);
  });

  it('serializes a capture followed by editing without losing either change', async () => {
    const first = createRecordedClick('first');
    const second = createRecordedClick('second');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [first],
    };

    const capture = dispatchMessage(
      { type: 'RECORDED_CLICK', payload: second },
      { tab: { id: 21 } },
    );
    const edit = dispatchMessage({
      type: 'UPDATE_RECORDED_STEP_DESCRIPTION',
      payload: {
        stepIndex: 0,
        expectedId: 'first',
        expectedReference: JSON.stringify(first),
        text: 'Primeiro passo editado',
      },
    });

    await expect(Promise.all([capture, edit])).resolves.toEqual([
      { success: true },
      { success: true },
    ]);
    expect(localStorageData.recordedSteps).toEqual([
      {
        ...first,
        descriptionOverride: {
          text: 'Primeiro passo editado',
          locale: 'pt-BR',
        },
      },
      second,
    ]);
  });

  it('serializes a capture followed by movement without losing the capture', async () => {
    const first = createRecordedClick('first');
    const second = createRecordedClick('second');
    const captured = createRecordedClick('captured');
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
      },
      recordedSteps: [first, second],
    };

    const capture = dispatchMessage(
      { type: 'RECORDED_CLICK', payload: captured },
      { tab: { id: 21 } },
    );
    const movement = dispatchMessage({
      type: 'MOVE_RECORDED_STEP',
      payload: {
        fromIndex: 1,
        toIndex: 0,
        expectedStepReference: JSON.stringify(second),
        expectedTargetReference: JSON.stringify(first),
        expectedId: 'second',
        expectedTargetId: 'first',
      },
    });

    await expect(Promise.all([capture, movement])).resolves.toEqual([
      { success: true },
      { success: true },
    ]);
    expect(localStorageData.recordedSteps).toEqual([
      second,
      first,
      captured,
    ]);
  });

  it('stores a top-frame fragment navigation for the recorded tab', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/#forms',
      },
      recordedSteps: [],
    };
    const listener = referenceFragmentUpdated.mock.calls[0][0];

    listener({
      tabId: 21,
      frameId: 0,
      url: 'https://example.com/#buttons',
      timeStamp: 10,
      transitionQualifiers: [],
    });

    await vi.waitFor(() =>
      expect(localStorageData.recordedSteps).toHaveLength(1),
    );
    expect(localStorageData.recordedSteps).toEqual([
      expect.objectContaining({
        schemaVersion: 9,
        type: 'navigation',
        fromUrl: 'https://example.com/#forms',
        toUrl: 'https://example.com/#buttons',
        trigger: 'fragment',
        description: expect.objectContaining({
          text: 'Navegou para "/#buttons"',
        }),
      }),
    ]);
    expect(localStorageData.recordingState).toMatchObject({
      currentUrl: 'https://example.com/#buttons',
    });
  });

  it('serializes History API changes and deduplicates the final URL', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/start',
      },
      recordedSteps: [],
    };
    const historyListener = historyStateUpdated.mock.calls[0][0];
    const fragmentListener = referenceFragmentUpdated.mock.calls[0][0];

    historyListener({
      tabId: 21,
      frameId: 0,
      url: 'https://example.com/products',
      timeStamp: 20,
      transitionQualifiers: [],
    });
    historyListener({
      tabId: 21,
      frameId: 0,
      url: 'https://example.com/previous',
      timeStamp: 30,
      transitionQualifiers: ['forward_back'],
    });
    fragmentListener({
      tabId: 21,
      frameId: 0,
      url: 'https://example.com/previous',
      timeStamp: 31,
      transitionQualifiers: ['forward_back'],
    });

    await vi.waitFor(() =>
      expect(localStorageData.recordedSteps).toHaveLength(2),
    );
    expect(
      (localStorageData.recordedSteps as Array<Record<string, unknown>>).map(
        ({ fromUrl, toUrl, trigger }) => ({ fromUrl, toUrl, trigger }),
      ),
    ).toEqual([
      {
        fromUrl: 'https://example.com/start',
        toUrl: 'https://example.com/products',
        trigger: 'history-api',
      },
      {
        fromUrl: 'https://example.com/products',
        toUrl: 'https://example.com/previous',
        trigger: 'history-traversal',
      },
    ]);
  });

  it('ignores subframes, other tabs and events while stopped', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        currentUrl: 'https://example.com/start',
      },
      recordedSteps: [],
    };
    const listener = historyStateUpdated.mock.calls[0][0];

    listener({
      tabId: 21,
      frameId: 2,
      url: 'https://example.com/frame',
      timeStamp: 1,
      transitionQualifiers: [],
    });
    listener({
      tabId: 99,
      frameId: 0,
      url: 'https://example.com/other-tab',
      timeStamp: 2,
      transitionQualifiers: [],
    });

    await vi.waitFor(() => expect(getLocalStorage).toHaveBeenCalledTimes(1));
    localStorageData.recordingState = { isRecording: false };
    listener({
      tabId: 21,
      frameId: 0,
      url: 'https://example.com/stopped',
      timeStamp: 3,
      transitionQualifiers: [],
    });

    await vi.waitFor(() => expect(getLocalStorage).toHaveBeenCalledTimes(2));
    expect(localStorageData.recordedSteps).toEqual([]);
    expect(setLocalStorage).not.toHaveBeenCalled();
  });

  it('establishes a baseline for an older active state without migrating steps', async () => {
    localStorageData = {
      recordingState: { isRecording: true, tabId: 21 },
      recordedSteps: [createRecordedClick('existing')],
    };
    const listener = historyStateUpdated.mock.calls[0][0];

    listener({
      tabId: 21,
      frameId: 0,
      url: 'https://example.com/current',
      timeStamp: 1,
      transitionQualifiers: [],
    });

    await vi.waitFor(() =>
      expect(localStorageData.recordingState).toMatchObject({
        currentUrl: 'https://example.com/current',
      }),
    );
    expect(localStorageData.recordedSteps).toEqual([
      createRecordedClick('existing'),
    ]);
  });

  it('stores one schema 10 step per committed document, including reloads', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/start',
      },
      recordedSteps: [],
    };
    const listener = navigationCommitted.mock.calls[0][0];
    const nextDocument = {
      tabId: 21,
      frameId: 0,
      documentId: 'document-next',
      documentLifecycle: 'active',
      url: 'https://example.com/next',
      timeStamp: 100,
      transitionType: 'link',
      transitionQualifiers: [],
    };

    listener(nextDocument);
    listener(nextDocument);
    listener({
      ...nextDocument,
      documentId: 'document-reload',
      timeStamp: 200,
      transitionType: 'reload',
    });

    await vi.waitFor(() =>
      expect(localStorageData.recordedSteps).toHaveLength(2),
    );
    expect(
      (localStorageData.recordedSteps as Array<Record<string, unknown>>).map(
        ({ schemaVersion, fromUrl, toUrl, trigger }) => ({
          schemaVersion,
          fromUrl,
          toUrl,
          trigger,
        }),
      ),
    ).toEqual([
      {
        schemaVersion: 10,
        fromUrl: 'https://example.com/start',
        toUrl: 'https://example.com/next',
        trigger: 'document',
      },
      {
        schemaVersion: 10,
        fromUrl: 'https://example.com/next',
        toUrl: 'https://example.com/next',
        trigger: 'reload',
      },
    ]);
    expect(localStorageData.recordingState).toEqual({
      isRecording: true,
      tabId: 21,
      origin: 'https://example.com',
      currentUrl: 'https://example.com/next',
      currentDocumentId: 'document-reload',
    });
  });

  it('reinjects once when the committed document becomes ready', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/next',
        currentDocumentId: 'document-next',
      },
      recordedSteps: [],
    };
    const readyDetails = {
      tabId: 21,
      frameId: 0,
      documentId: 'document-next',
      documentLifecycle: 'active',
      url: 'https://example.com/next',
      timeStamp: 120,
    };

    navigationDOMContentLoaded.mock.calls[0][0](readyDetails);
    navigationCompleted.mock.calls[0][0](readyDetails);

    await vi.waitFor(() =>
      expect(localStorageData.recordingState).toMatchObject({
        recorderDocumentId: 'document-next',
      }),
    );
    expect(executeScript).toHaveBeenCalledOnce();
    expect(executeScript).toHaveBeenCalledWith({
      target: { tabId: 21 },
      files: ['assets/recorder.js'],
    });
    expect(tabsSendMessage).toHaveBeenCalledOnce();
    expect(tabsSendMessage).toHaveBeenCalledWith(21, {
      type: 'ACTIVATE_CLICK_RECORDER',
    });
  });

  it('retries reinjection on completion after DOM-ready injection fails', async () => {
    executeScript.mockRejectedValueOnce(new Error('Document not ready'));
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/next',
        currentDocumentId: 'document-next',
      },
      recordedSteps: [],
    };
    const details = {
      tabId: 21,
      frameId: 0,
      documentId: 'document-next',
      documentLifecycle: 'active',
      url: 'https://example.com/next',
      timeStamp: 120,
    };

    navigationDOMContentLoaded.mock.calls[0][0](details);
    navigationCompleted.mock.calls[0][0](details);

    await vi.waitFor(() => expect(executeScript).toHaveBeenCalledTimes(2));
    expect(tabsSendMessage).toHaveBeenCalledOnce();
    expect(localStorageData.recordingState).toMatchObject({
      recorderDocumentId: 'document-next',
    });
  });

  it('ignores documents outside the recorded tab, frame, lifecycle or origin', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/start',
      },
      recordedSteps: [],
    };
    const listener = navigationCommitted.mock.calls[0][0];
    const details = {
      tabId: 21,
      frameId: 0,
      documentId: 'ignored-document',
      documentLifecycle: 'active',
      url: 'https://example.com/ignored',
      timeStamp: 100,
      transitionType: 'link',
      transitionQualifiers: [],
    };

    listener({ ...details, tabId: 99 });
    listener({ ...details, frameId: 2 });
    listener({ ...details, documentLifecycle: 'prerender' });
    listener({ ...details, url: 'https://other.example/ignored' });

    await vi.waitFor(() => expect(getLocalStorage).toHaveBeenCalledTimes(2));
    expect(localStorageData.recordedSteps).toEqual([]);
    expect(setLocalStorage).not.toHaveBeenCalled();
    expect(executeScript).not.toHaveBeenCalled();
  });

  it('does not resume a stale document or a stopped recording', async () => {
    localStorageData = {
      recordingState: {
        isRecording: true,
        tabId: 21,
        origin: 'https://example.com',
        currentUrl: 'https://example.com/current',
        currentDocumentId: 'document-current',
      },
      recordedSteps: [],
    };
    const listener = navigationCompleted.mock.calls[0][0];
    const details = {
      tabId: 21,
      frameId: 0,
      documentId: 'document-stale',
      documentLifecycle: 'active',
      url: 'https://example.com/stale',
      timeStamp: 120,
    };

    listener(details);
    await vi.waitFor(() => expect(getLocalStorage).toHaveBeenCalledTimes(1));
    localStorageData.recordingState = { isRecording: false };
    listener({ ...details, documentId: 'document-current' });

    await vi.waitFor(() => expect(getLocalStorage).toHaveBeenCalledTimes(2));
    expect(executeScript).not.toHaveBeenCalled();
    expect(tabsSendMessage).not.toHaveBeenCalled();
  });
});
