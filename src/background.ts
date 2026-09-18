import type { ExtensionMessage, ExtensionResponse } from './shared/messages';
import type {
  ElementAssertionPickerMode,
  ElementTextSelection,
  ElementVisibilityPickerState,
  ElementVisibilitySelection,
  RecordedElementTextAssertion,
  RecordedElementVisibilityAssertion,
  RecordedStep,
  RecordedUrlAssertion,
  RecordingState,
} from './shared/recordingTypes';
import { createElementTextAssertionDescription } from './shared/descriptions/createElementTextAssertionDescription';
import { createElementVisibilityAssertionDescription } from './shared/descriptions/createElementVisibilityAssertionDescription';
import { createUrlAssertionDescription } from './shared/descriptions/createUrlAssertionDescription';
import { validateStepDescriptionText } from './shared/descriptions/descriptionOverride';
import { getRecordedStepReference } from './shared/recordedStepIdentity';
import {
  captureActiveTabContext,
  persistActiveTabContext,
  invalidateContextForActivation,
  invalidateContextForClosedTab,
  updateActiveTabContextUrl,
  validateActiveTabContext,
  STALE_TAB_CONTEXT_MESSAGE,
} from './services/activeTabContext';
import {
  createRecordedDocumentNavigation,
  createRecordedNavigation,
  type CommittedDocumentNavigationDetails,
  type SameDocumentNavigationDetails,
  type SameDocumentNavigationSource,
} from './services/navigationCapture';

const RECORDING_STATE_KEY = 'recordingState';
const RECORDED_STEPS_KEY = 'recordedSteps';
const ELEMENT_VISIBILITY_PICKER_KEY = 'elementVisibilityPickerState';

type RecordedStepMessage = Extract<
  ExtensionMessage,
  {
    type:
      | 'RECORDED_CLICK'
      | 'RECORDED_FOCUS_NAVIGATION'
      | 'RECORDED_FIELD_FILL'
      | 'RECORDED_RANGE_CHANGE'
      | 'RECORDED_COLOR_CHANGE'
      | 'RECORDED_SELECTION_CHANGE'
      | 'RECORDED_KEY_PRESS';
  }
>;

type RecordedStepActionMessage = Extract<
  ExtensionMessage,
  {
    type:
      | 'DELETE_RECORDED_STEP'
      | 'UPDATE_RECORDED_STEP_DESCRIPTION'
      | 'MOVE_RECORDED_STEP'
      | 'CLEAR_RECORDED_STEPS'
      | 'ADD_CURRENT_URL_ASSERTION';
  }
>;

let recordedStepOperationQueue: Promise<void> = Promise.resolve();

async function setElementVisibilityPickerState(
  state: ElementVisibilityPickerState,
) {
  await chrome.storage.session.set({ [ELEMENT_VISIBILITY_PICKER_KEY]: state });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const SELECTOR_STRATEGIES = new Set([
  'testId',
  'role',
  'label',
  'id',
  'text',
  'css',
]);

function sanitizeSelectorCandidate(value: unknown) {
  if (
    !isRecord(value) ||
    typeof value.strategy !== 'string' ||
    !SELECTOR_STRATEGIES.has(value.strategy) ||
    typeof value.value !== 'string' ||
    !value.value ||
    value.value.length > 1000 ||
    typeof value.score !== 'number' ||
    !Number.isFinite(value.score) ||
    typeof value.isUnique !== 'boolean' ||
    !isRecord(value.validation) ||
    !['valid', 'ambiguous', 'invalid'].includes(String(value.validation.status)) ||
    typeof value.validation.matchCount !== 'number' ||
    !Number.isInteger(value.validation.matchCount) ||
    typeof value.validation.matchesTarget !== 'boolean'
  ) {
    return undefined;
  }

  return {
    strategy: value.strategy as 'testId' | 'role' | 'label' | 'id' | 'text' | 'css',
    value: value.value,
    score: value.score,
    isUnique: value.isUnique,
    ...(typeof value.attribute === 'string' &&
    ['data-testid', 'data-cy', 'data-test'].includes(value.attribute)
      ? { attribute: value.attribute as 'data-testid' | 'data-cy' | 'data-test' }
      : {}),
    ...(Array.isArray(value.warnings) && value.warnings.includes('dynamic-id')
      ? { warnings: ['dynamic-id' as const] }
      : {}),
    ...(typeof value.role === 'string' ? { role: value.role.slice(0, 100) } : {}),
    ...(typeof value.name === 'string' ? { name: value.name.slice(0, 200) } : {}),
    validation: {
      status: value.validation.status as 'valid' | 'ambiguous' | 'invalid',
      matchCount: value.validation.matchCount,
      matchesTarget: value.validation.matchesTarget,
    },
  };
}

function sanitizeElementVisibilitySelection(
  value: unknown,
): ElementVisibilitySelection | undefined {
  if (!isRecord(value) || !isRecord(value.selectors) || !isRecord(value.element)) {
    return undefined;
  }

  const recommended = sanitizeSelectorCandidate(value.selectors.recommended);
  if (
    !recommended ||
    !recommended.isUnique ||
    recommended.validation.status !== 'valid' ||
    recommended.validation.matchCount !== 1 ||
    !recommended.validation.matchesTarget ||
    !Array.isArray(value.selectors.alternatives) ||
    value.selectors.alternatives.length > 10 ||
    typeof value.element.tagName !== 'string' ||
    !/^[a-z][a-z0-9-]{0,39}$/i.test(value.element.tagName)
  ) {
    return undefined;
  }

  const alternatives = value.selectors.alternatives
    .map(sanitizeSelectorCandidate)
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  if (alternatives.length !== value.selectors.alternatives.length) return undefined;

  return {
    selectors: { recommended, alternatives },
    element: {
      tagName: value.element.tagName.toLocaleLowerCase('en-US'),
      ...(typeof value.element.text === 'string'
        ? { text: value.element.text.replace(/\s+/g, ' ').trim().slice(0, 200) }
        : {}),
      ...(typeof value.element.inputType === 'string'
        ? { inputType: value.element.inputType.slice(0, 30) }
        : {}),
    },
  };
}

function normalizeExactText(value: unknown) {
  if (typeof value !== 'string') return undefined;

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized && normalized.length <= 200 ? normalized : undefined;
}

function sanitizeElementTextSelection(
  value: unknown,
): ElementTextSelection | undefined {
  const selection = sanitizeElementVisibilitySelection(value);
  const expectedText = isRecord(value)
    ? normalizeExactText(value.expectedText)
    : undefined;

  if (
    !selection ||
    !expectedText ||
    ['input', 'textarea', 'select', 'option'].includes(selection.element.tagName)
  ) {
    return undefined;
  }

  return {
    ...selection,
    element: { ...selection.element, text: expectedText },
    expectedText,
  };
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => undefined);
});

chrome.action.onClicked.addListener((tab) => {
  const context = captureActiveTabContext(tab);

  if (!context) return;

  // Start the session write first, but keep open() in the native action gesture.
  // Context readers await the write before allowing recording to start.
  void persistActiveTabContext(context);
  void chrome.sidePanel.open({ tabId: context.tabId }).catch(() => undefined);
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void invalidateContextForActivation(tabId, windowId).catch(() => undefined);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  void invalidateContextForClosedTab(tabId).catch(() => undefined);
});
chrome.tabs.onUpdated.addListener((tabId, changes) => {
  if (changes.url) {
    void updateActiveTabContextUrl(tabId, changes.url).catch(() => undefined);
  }
});

async function startRecording(
  tabId: number,
  origin: string,
  url: string,
): Promise<ExtensionResponse> {
  const context = await validateActiveTabContext();
  if (!context || context.tabId !== tabId || context.url !== url || new URL(context.url).origin !== origin) {
    return { success: false, error: STALE_TAB_CONTEXT_MESSAGE };
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['assets/recorder.js'],
    });
    await chrome.tabs.sendMessage(tabId, { type: 'ACTIVATE_CLICK_RECORDER' });

    const state: RecordingState = {
      isRecording: true,
      tabId,
      origin,
      currentUrl: url,
    };
    await chrome.storage.local.set({
      [RECORDING_STATE_KEY]: state,
      [RECORDED_STEPS_KEY]: [],
    });
    await setElementVisibilityPickerState({ active: false, updatedAt: Date.now() });

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Não foi possível ativar a gravação nesta página.',
    };
  }
}

async function stopRecording(): Promise<ExtensionResponse> {
  const result = await chrome.storage.local.get(RECORDING_STATE_KEY);
  const currentState = result[RECORDING_STATE_KEY] as RecordingState | undefined;

  if (currentState?.tabId) {
    try {
      await chrome.tabs.sendMessage(currentState.tabId, {
        type: 'DEACTIVATE_CLICK_RECORDER',
      });
    } catch {
      // The tab may have navigated or closed. Persisting the stopped state is enough.
    }
  }

  await chrome.storage.local.set({
    [RECORDING_STATE_KEY]: { isRecording: false } satisfies RecordingState,
  });
  await setElementVisibilityPickerState({
    active: false,
    outcome: 'cancelled',
    message: 'Seleção de elemento cancelada.',
    updatedAt: Date.now(),
  });
  return { success: true };
}

async function startElementPicker(
  mode: ElementAssertionPickerMode,
): Promise<ExtensionResponse> {
  const result = await chrome.storage.local.get(RECORDING_STATE_KEY);
  const state = result[RECORDING_STATE_KEY] as RecordingState | undefined;
  if (
    !state?.isRecording ||
    !state.tabId ||
    !state.currentUrl ||
    !isHttpOrigin(state.currentUrl, state.origin)
  ) {
    return { success: false, error: 'Inicie uma gravação para selecionar um elemento.' };
  }

  const pickerState: ElementVisibilityPickerState = {
    active: true,
    mode,
    tabId: state.tabId,
    updatedAt: Date.now(),
  };
  await setElementVisibilityPickerState(pickerState);

  try {
    const response = (await chrome.tabs.sendMessage(state.tabId, {
      type:
        mode === 'text'
          ? 'ACTIVATE_ELEMENT_TEXT_PICKER'
          : 'ACTIVATE_ELEMENT_VISIBILITY_PICKER',
    }, { frameId: 0 })) as ExtensionResponse | undefined;
    if (!response?.success) throw new Error();
    return { success: true, pickerState };
  } catch {
    const failedState: ElementVisibilityPickerState = {
      active: false,
      outcome: 'error',
      message: 'Não foi possível iniciar a seleção nesta página.',
      updatedAt: Date.now(),
    };
    await setElementVisibilityPickerState(failedState);
    return { success: false, error: failedState.message, pickerState: failedState };
  }
}

function startElementVisibilityPicker() {
  return startElementPicker('visibility');
}

function startElementTextPicker() {
  return startElementPicker('text');
}

async function cancelElementVisibilityPicker(
  sender?: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const result = await chrome.storage.session.get(ELEMENT_VISIBILITY_PICKER_KEY);
  const state = result[ELEMENT_VISIBILITY_PICKER_KEY] as
    | ElementVisibilityPickerState
    | undefined;
  if (sender?.tab?.id && state?.tabId !== sender.tab.id) {
    return { success: false, error: 'A seleção ativa pertence a outra aba.' };
  }

  if (state?.tabId) {
    try {
      await chrome.tabs.sendMessage(state.tabId, {
        type: 'DEACTIVATE_ELEMENT_VISIBILITY_PICKER',
      }, { frameId: 0 });
    } catch {
      // The document may have navigated or closed.
    }
  }

  const pickerState: ElementVisibilityPickerState = {
    active: false,
    outcome: 'cancelled',
    message: 'Seleção de elemento cancelada.',
    updatedAt: Date.now(),
  };
  await setElementVisibilityPickerState(pickerState);
  return { success: true, pickerState };
}

async function addElementVisibilityAssertion(
  payload: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const selection = sanitizeElementVisibilitySelection(payload);
  const [local, session] = await Promise.all([
    chrome.storage.local.get([RECORDING_STATE_KEY, RECORDED_STEPS_KEY]),
    chrome.storage.session.get(ELEMENT_VISIBILITY_PICKER_KEY),
  ]);
  const state = local[RECORDING_STATE_KEY] as RecordingState | undefined;
  const picker = session[ELEMENT_VISIBILITY_PICKER_KEY] as
    | ElementVisibilityPickerState
    | undefined;

  if (
    !selection ||
    !state?.isRecording ||
    !state.currentUrl ||
    state.tabId !== sender.tab?.id ||
    (sender.frameId !== undefined && sender.frameId !== 0) ||
    (state.currentDocumentId !== undefined &&
      sender.documentId !== undefined &&
      state.currentDocumentId !== sender.documentId) ||
    !picker?.active ||
    (picker.mode !== undefined && picker.mode !== 'visibility') ||
    picker.tabId !== sender.tab?.id ||
    !isHttpOrigin(state.currentUrl, state.origin)
  ) {
    return { success: false, error: 'Não foi possível validar o elemento selecionado.' };
  }

  const assertion: RecordedElementVisibilityAssertion = {
    schemaVersion: 12,
    id: crypto.randomUUID(),
    type: 'assertion',
    url: state.currentUrl,
    timestamp: Date.now(),
    assertion: { kind: 'element', operator: 'visible' },
    selectors: selection.selectors,
    element: selection.element,
    description: createElementVisibilityAssertionDescription(selection),
  };
  const storedSteps = local[RECORDED_STEPS_KEY];
  const steps: RecordedStep[] = Array.isArray(storedSteps) ? storedSteps : [];
  await chrome.storage.local.set({ [RECORDED_STEPS_KEY]: [...steps, assertion] });

  const pickerState: ElementVisibilityPickerState = {
    active: false,
    outcome: 'success',
    message: 'Verificação de visibilidade adicionada.',
    updatedAt: Date.now(),
  };
  await setElementVisibilityPickerState(pickerState);
  return { success: true, pickerState };
}

async function addElementTextAssertion(
  payload: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const selection = sanitizeElementTextSelection(payload);
  const [local, session] = await Promise.all([
    chrome.storage.local.get([RECORDING_STATE_KEY, RECORDED_STEPS_KEY]),
    chrome.storage.session.get(ELEMENT_VISIBILITY_PICKER_KEY),
  ]);
  const state = local[RECORDING_STATE_KEY] as RecordingState | undefined;
  const picker = session[ELEMENT_VISIBILITY_PICKER_KEY] as
    | ElementVisibilityPickerState
    | undefined;

  if (
    !selection ||
    !state?.isRecording ||
    !state.currentUrl ||
    state.tabId !== sender.tab?.id ||
    sender.frameId !== 0 ||
    (state.currentDocumentId !== undefined &&
      state.currentDocumentId !== sender.documentId) ||
    !picker?.active ||
    picker.mode !== 'text' ||
    picker.tabId !== sender.tab?.id ||
    !sender.url ||
    !isHttpOrigin(sender.url, state.origin) ||
    !isHttpOrigin(state.currentUrl, state.origin)
  ) {
    return { success: false, error: 'Não foi possível validar o texto selecionado.' };
  }

  const assertion: RecordedElementTextAssertion = {
    schemaVersion: 13,
    id: crypto.randomUUID(),
    type: 'assertion',
    url: state.currentUrl,
    timestamp: Date.now(),
    assertion: {
      kind: 'element',
      operator: 'text-equals',
      expected: selection.expectedText,
    },
    selectors: selection.selectors,
    element: selection.element,
    description: createElementTextAssertionDescription(selection),
  };
  const storedSteps = local[RECORDED_STEPS_KEY];
  const steps: RecordedStep[] = Array.isArray(storedSteps) ? storedSteps : [];
  await chrome.storage.local.set({ [RECORDED_STEPS_KEY]: [...steps, assertion] });

  const pickerState: ElementVisibilityPickerState = {
    active: false,
    outcome: 'success',
    message: 'Verificação de texto exato adicionada.',
    updatedAt: Date.now(),
  };
  await setElementVisibilityPickerState(pickerState);
  return { success: true, pickerState };
}

async function appendRecordedStep(
  message: RecordedStepMessage,
  sender: chrome.runtime.MessageSender,
) {
  const result = await chrome.storage.local.get([
    RECORDING_STATE_KEY,
    RECORDED_STEPS_KEY,
  ]);
  const state = result[RECORDING_STATE_KEY] as RecordingState | undefined;

  if (!state?.isRecording || state.tabId !== sender.tab?.id) {
    return { success: false };
  }

  const storedSteps = result[RECORDED_STEPS_KEY];
  const steps = Array.isArray(storedSteps) ? storedSteps : [];
  await chrome.storage.local.set({
    [RECORDED_STEPS_KEY]: [...steps, message.payload],
  });

  return { success: true };
}

async function deleteRecordedStep(
  message: Extract<RecordedStepActionMessage, { type: 'DELETE_RECORDED_STEP' }>,
): Promise<ExtensionResponse> {
  const { stepIndex, expectedId } = message.payload;

  if (!Number.isInteger(stepIndex) || stepIndex < 0) {
    return { success: false, error: 'O passo solicitado é inválido.' };
  }

  const result = await chrome.storage.local.get(RECORDED_STEPS_KEY);
  const storedSteps = result[RECORDED_STEPS_KEY];
  const steps: RecordedStep[] = Array.isArray(storedSteps) ? storedSteps : [];
  const target = steps[stepIndex];

  if (!target) {
    return { success: false, error: 'O passo não está mais disponível.' };
  }

  if (
    expectedId &&
    (typeof target.id !== 'string' || target.id !== expectedId)
  ) {
    return {
      success: false,
      error: 'A lista de passos foi atualizada. Tente novamente.',
    };
  }

  await chrome.storage.local.set({
    [RECORDED_STEPS_KEY]: steps.filter((_, index) => index !== stepIndex),
  });

  return { success: true };
}

async function clearRecordedSteps(): Promise<ExtensionResponse> {
  await chrome.storage.local.set({ [RECORDED_STEPS_KEY]: [] });
  return { success: true };
}

async function addCurrentUrlAssertion(): Promise<ExtensionResponse> {
  const result = await chrome.storage.local.get([
    RECORDING_STATE_KEY,
    RECORDED_STEPS_KEY,
  ]);
  const state = result[RECORDING_STATE_KEY] as RecordingState | undefined;

  if (!state?.isRecording) {
    return {
      success: false,
      error: 'Inicie uma gravação para verificar a URL atual.',
    };
  }

  if (!state.currentUrl || !isHttpOrigin(state.currentUrl, state.origin)) {
    return {
      success: false,
      error: 'Não foi possível identificar uma URL atual válida.',
    };
  }

  const assertion: RecordedUrlAssertion = {
    schemaVersion: 11,
    id: crypto.randomUUID(),
    type: 'assertion',
    url: state.currentUrl,
    timestamp: Date.now(),
    assertion: {
      kind: 'url',
      operator: 'equals',
      expected: state.currentUrl,
    },
    description: createUrlAssertionDescription({
      expectedUrl: state.currentUrl,
    }),
  };
  const storedSteps = result[RECORDED_STEPS_KEY];
  const steps: RecordedStep[] = Array.isArray(storedSteps) ? storedSteps : [];

  await chrome.storage.local.set({
    [RECORDED_STEPS_KEY]: [...steps, assertion],
  });

  return { success: true };
}

async function updateRecordedStepDescription(
  message: Extract<
    RecordedStepActionMessage,
    { type: 'UPDATE_RECORDED_STEP_DESCRIPTION' }
  >,
): Promise<ExtensionResponse> {
  const { stepIndex, expectedId, expectedReference, text } = message.payload;
  const validation = validateStepDescriptionText(text);

  if (!Number.isInteger(stepIndex) || stepIndex < 0) {
    return { success: false, error: 'O passo solicitado é inválido.' };
  }

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const result = await chrome.storage.local.get(RECORDED_STEPS_KEY);
  const storedSteps = result[RECORDED_STEPS_KEY];
  const steps: unknown[] = Array.isArray(storedSteps) ? storedSteps : [];
  const target = steps[stepIndex];

  if (typeof target !== 'object' || target === null) {
    return { success: false, error: 'O passo não está mais disponível.' };
  }

  if (expectedId && (!('id' in target) || target.id !== expectedId)) {
    return {
      success: false,
      error: 'A lista de passos foi atualizada. Abra a edição novamente.',
    };
  }

  if (getRecordedStepReference(target) !== expectedReference) {
    return {
      success: false,
      error: 'A lista de passos foi atualizada. Abra a edição novamente.',
    };
  }

  const updatedStep = {
    ...target,
    descriptionOverride: {
      text: validation.text,
      locale: 'pt-BR' as const,
    },
  };

  await chrome.storage.local.set({
    [RECORDED_STEPS_KEY]: steps.map((step, index) =>
      index === stepIndex ? updatedStep : step,
    ),
  });
  return { success: true };
}

function matchesRecordedStepIdentity(
  step: unknown,
  expectedReference: string,
  expectedId?: string,
) {
  if (expectedId) {
    if (
      typeof step !== 'object' ||
      step === null ||
      !('id' in step) ||
      step.id !== expectedId
    ) {
      return false;
    }
  }

  return getRecordedStepReference(step) === expectedReference;
}

async function moveRecordedStep(
  message: Extract<RecordedStepActionMessage, { type: 'MOVE_RECORDED_STEP' }>,
): Promise<ExtensionResponse> {
  const {
    fromIndex,
    toIndex,
    expectedStepReference,
    expectedTargetReference,
    expectedId,
    expectedTargetId,
  } = message.payload;

  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    Math.abs(fromIndex - toIndex) !== 1
  ) {
    return { success: false, error: 'A movimentação solicitada é inválida.' };
  }

  const result = await chrome.storage.local.get(RECORDED_STEPS_KEY);
  const storedSteps = result[RECORDED_STEPS_KEY];
  const steps: unknown[] = Array.isArray(storedSteps) ? storedSteps : [];
  const step = steps[fromIndex];
  const target = steps[toIndex];

  if (step === undefined || target === undefined) {
    return { success: false, error: 'O passo não está mais disponível.' };
  }

  if (
    !matchesRecordedStepIdentity(step, expectedStepReference, expectedId) ||
    !matchesRecordedStepIdentity(
      target,
      expectedTargetReference,
      expectedTargetId,
    )
  ) {
    return {
      success: false,
      error: 'A lista de passos foi atualizada. Tente mover novamente.',
    };
  }

  const reorderedSteps = [...steps];
  reorderedSteps[fromIndex] = target;
  reorderedSteps[toIndex] = step;

  await chrome.storage.local.set({
    [RECORDED_STEPS_KEY]: reorderedSteps,
  });
  return { success: true };
}

function enqueueRecordedStepOperation<T>(operation: () => Promise<T>) {
  const result = recordedStepOperationQueue.then(operation);

  recordedStepOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

function storeRecordedStep(
  message: RecordedStepMessage,
  sender: chrome.runtime.MessageSender,
) {
  return enqueueRecordedStepOperation(() =>
    appendRecordedStep(message, sender),
  );
}

function performRecordedStepAction(message: RecordedStepActionMessage) {
  return enqueueRecordedStepOperation(() => {
    if (message.type === 'ADD_CURRENT_URL_ASSERTION') {
      return addCurrentUrlAssertion();
    }

    if (message.type === 'DELETE_RECORDED_STEP') {
      return deleteRecordedStep(message);
    }

    if (message.type === 'UPDATE_RECORDED_STEP_DESCRIPTION') {
      return updateRecordedStepDescription(message);
    }

    if (message.type === 'MOVE_RECORDED_STEP') {
      return moveRecordedStep(message);
    }

    return clearRecordedSteps();
  });
}

interface WebNavigationDetails extends SameDocumentNavigationDetails {
  tabId: number;
  frameId: number;
}

interface CommittedWebNavigationDetails
  extends CommittedDocumentNavigationDetails {
  tabId: number;
  frameId: number;
  documentLifecycle: string;
}

interface ReadyWebNavigationDetails {
  tabId: number;
  frameId: number;
  documentId: string;
  documentLifecycle: string;
  url: string;
}

function isHttpOrigin(url: string, origin?: string) {
  if (!origin) return false;

  try {
    const parsedUrl = new URL(url);
    return (
      (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
      parsedUrl.origin === origin
    );
  } catch {
    return false;
  }
}

async function appendSameDocumentNavigation(
  details: WebNavigationDetails,
  source: SameDocumentNavigationSource,
) {
  const result = await chrome.storage.local.get([
    RECORDING_STATE_KEY,
    RECORDED_STEPS_KEY,
  ]);
  const state = result[RECORDING_STATE_KEY] as RecordingState | undefined;

  if (!state?.isRecording || state.tabId !== details.tabId) return;

  if (!state.currentUrl) {
    await chrome.storage.local.set({
      [RECORDING_STATE_KEY]: { ...state, currentUrl: details.url },
    });
    return;
  }

  await setElementVisibilityPickerState({
    active: false,
    outcome: 'cancelled',
    message: 'Seleção de elemento cancelada após a navegação.',
    updatedAt: Date.now(),
  });

  if (state.currentUrl === details.url) return;

  const storedSteps = result[RECORDED_STEPS_KEY];
  const steps: RecordedStep[] = Array.isArray(storedSteps) ? storedSteps : [];
  const navigation = createRecordedNavigation(
    state.currentUrl,
    details,
    source,
  );

  await chrome.storage.local.set({
    [RECORDING_STATE_KEY]: { ...state, currentUrl: details.url },
    [RECORDED_STEPS_KEY]: [...steps, navigation],
  });
}

function recordSameDocumentNavigation(
  details: WebNavigationDetails,
  source: SameDocumentNavigationSource,
) {
  if (details.frameId !== 0) return;

  void enqueueRecordedStepOperation(() =>
    appendSameDocumentNavigation(details, source),
  ).catch(() => undefined);
}

async function appendCommittedDocumentNavigation(
  details: CommittedWebNavigationDetails,
) {
  const result = await chrome.storage.local.get([
    RECORDING_STATE_KEY,
    RECORDED_STEPS_KEY,
  ]);
  const state = result[RECORDING_STATE_KEY] as RecordingState | undefined;

  if (
    !state?.isRecording ||
    state.tabId !== details.tabId ||
    state.currentDocumentId === details.documentId ||
    !isHttpOrigin(details.url, state.origin)
  ) {
    return;
  }

  await setElementVisibilityPickerState({
    active: false,
    outcome: 'cancelled',
    message: 'Seleção de elemento cancelada após a navegação.',
    updatedAt: Date.now(),
  });

  const nextState: RecordingState = {
    ...state,
    currentUrl: details.url,
    currentDocumentId: details.documentId,
  };
  delete nextState.recorderDocumentId;

  if (!state.currentUrl) {
    await chrome.storage.local.set({ [RECORDING_STATE_KEY]: nextState });
    return;
  }

  const storedSteps = result[RECORDED_STEPS_KEY];
  const steps: RecordedStep[] = Array.isArray(storedSteps) ? storedSteps : [];
  const navigation = createRecordedDocumentNavigation(state.currentUrl, details);

  await chrome.storage.local.set({
    [RECORDING_STATE_KEY]: nextState,
    [RECORDED_STEPS_KEY]: [...steps, navigation],
  });
}

function recordCommittedDocumentNavigation(
  details: CommittedWebNavigationDetails,
) {
  if (details.frameId !== 0 || details.documentLifecycle !== 'active') return;

  void enqueueRecordedStepOperation(() =>
    appendCommittedDocumentNavigation(details),
  ).catch(() => undefined);
}

async function resumeRecorderInDocument(details: ReadyWebNavigationDetails) {
  const result = await chrome.storage.local.get(RECORDING_STATE_KEY);
  const state = result[RECORDING_STATE_KEY] as RecordingState | undefined;

  if (
    !state?.isRecording ||
    state.tabId !== details.tabId ||
    state.currentDocumentId !== details.documentId ||
    state.recorderDocumentId === details.documentId ||
    !isHttpOrigin(details.url, state.origin)
  ) {
    return;
  }

  await chrome.scripting.executeScript({
    target: { tabId: details.tabId },
    files: ['assets/recorder.js'],
  });
  await chrome.tabs.sendMessage(details.tabId, {
    type: 'ACTIVATE_CLICK_RECORDER',
  });
  await chrome.storage.local.set({
    [RECORDING_STATE_KEY]: {
      ...state,
      recorderDocumentId: details.documentId,
    },
  });
}

function recordDocumentReady(details: ReadyWebNavigationDetails) {
  if (details.frameId !== 0 || details.documentLifecycle !== 'active') return;

  void enqueueRecordedStepOperation(() =>
    resumeRecorderInDocument(details),
  ).catch(() => undefined);
}

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    void updateActiveTabContextUrl(details.tabId, details.url).catch(() => undefined);
  }
  recordCommittedDocumentNavigation(details);
});

chrome.webNavigation.onDOMContentLoaded.addListener((details) => {
  recordDocumentReady(details);
});

chrome.webNavigation.onCompleted.addListener((details) => {
  recordDocumentReady(details);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) {
    void updateActiveTabContextUrl(details.tabId, details.url).catch(() => undefined);
  }
  recordSameDocumentNavigation(details, 'history-api');
});

chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  if (details.frameId === 0) {
    void updateActiveTabContextUrl(details.tabId, details.url).catch(() => undefined);
  }
  recordSameDocumentNavigation(details, 'fragment');
});

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    const handleMessage = async () => {
      if (message.type === 'START_RECORDING') {
        return enqueueRecordedStepOperation(() =>
          startRecording(
            message.payload.tabId,
            message.payload.origin,
            message.payload.url,
          ),
        );
      }

      if (message.type === 'GET_ACTIVE_TAB_CONTEXT') {
        const activeTabContext = await validateActiveTabContext();
        return { success: Boolean(activeTabContext), activeTabContext };
      }

      if (message.type === 'STOP_RECORDING') {
        return enqueueRecordedStepOperation(stopRecording);
      }
      if (message.type === 'START_ELEMENT_VISIBILITY_PICKER') {
        return enqueueRecordedStepOperation(startElementVisibilityPicker);
      }
      if (message.type === 'START_ELEMENT_TEXT_PICKER') {
        return enqueueRecordedStepOperation(startElementTextPicker);
      }
      if (message.type === 'CANCEL_ELEMENT_VISIBILITY_PICKER') {
        return enqueueRecordedStepOperation(() =>
          cancelElementVisibilityPicker(sender),
        );
      }
      if (message.type === 'SELECT_ELEMENT_VISIBILITY_ASSERTION') {
        return enqueueRecordedStepOperation(() =>
          addElementVisibilityAssertion(message.payload, sender),
        );
      }
      if (message.type === 'SELECT_ELEMENT_TEXT_ASSERTION') {
        return enqueueRecordedStepOperation(() =>
          addElementTextAssertion(message.payload, sender),
        );
      }
      if (
        message.type === 'RECORDED_CLICK' ||
        message.type === 'RECORDED_FOCUS_NAVIGATION' ||
        message.type === 'RECORDED_FIELD_FILL' ||
        message.type === 'RECORDED_RANGE_CHANGE' ||
        message.type === 'RECORDED_COLOR_CHANGE' ||
        message.type === 'RECORDED_SELECTION_CHANGE' ||
        message.type === 'RECORDED_KEY_PRESS'
      ) {
        return storeRecordedStep(message, sender);
      }

      if (
        message.type === 'DELETE_RECORDED_STEP' ||
        message.type === 'UPDATE_RECORDED_STEP_DESCRIPTION' ||
        message.type === 'MOVE_RECORDED_STEP' ||
        message.type === 'CLEAR_RECORDED_STEPS' ||
        message.type === 'ADD_CURRENT_URL_ASSERTION'
      ) {
        return performRecordedStepAction(message);
      }

      return { success: false };
    };

    void handleMessage()
      .then(sendResponse)
      .catch(() =>
        sendResponse({
          success: false,
          error: 'Não foi possível atualizar os passos gravados.',
        }),
      );
    return true;
  },
);
