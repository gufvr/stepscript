import { createClickDescription } from '../shared/descriptions/createClickDescription';
import { createColorChangeDescription } from '../shared/descriptions/createColorChangeDescription';
import { createFieldFillDescription } from '../shared/descriptions/createFieldFillDescription';
import { createFocusNavigationDescription } from '../shared/descriptions/createFocusNavigationDescription';
import { createKeyPressDescription } from '../shared/descriptions/createKeyPressDescription';
import { createRangeChangeDescription } from '../shared/descriptions/createRangeChangeDescription';
import { createSelectionChangeDescription } from '../shared/descriptions/createSelectionChangeDescription';
import type { ExtensionMessage } from '../shared/messages';
import type {
  ElementAssertionPickerMode,
  ElementTextSelection,
  ElementVisibilitySelection,
  InteractionKey,
} from '../shared/recordingTypes';
import { getImplicitRole, normalizeText } from './elementSemantics';
import { createGuidedHighlight } from './guidedHighlight';
import {
  captureColorValue,
  isColorControl,
  resolveColorControl,
  type ColorControl,
} from './colorCapture';
import {
  captureFieldValue,
  isCapturableField,
  type CapturableField,
} from './fieldCapture';
import { buildSelectorCandidates } from './selectorCandidates';
import { getClickTargetText, resolveClickTarget } from './clickTarget';
import {
  captureRangeValue,
  isRangeControl,
  type RangeControl,
} from './rangeCapture';
import {
  captureSelectionControl,
  getSelectionSignature,
  isSelectionControl,
  resolveSelectionControl,
  type SelectionControl,
} from './selectionCapture';

const TAB_NAVIGATION_TIMEOUT_MS = 300;
const SYNTHETIC_CLICK_TIMEOUT_MS = 500;
const ARROW_KEYS = new Set<InteractionKey>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);
const ARROW_INTERACTION_ROLES = new Set([
  'combobox',
  'listbox',
  'menuitem',
  'slider',
  'spinbutton',
  'tab',
  'treeitem',
]);

type SendMessage = (message: ExtensionMessage) => void | Promise<unknown>;

interface PendingTabNavigation {
  direction: 'forward' | 'backward';
  source?: Element;
  timeoutId: number;
}

interface PendingSelectionKey {
  control: SelectionControl;
  key: InteractionKey;
  modifiers?: { shift?: boolean };
  timeoutId?: number;
}

export interface RecorderController {
  isActive: boolean;
  setActive: (isActive: boolean) => void;
  setElementVisibilityPickerActive: (isActive: boolean) => void;
  setElementTextPickerActive: (isActive: boolean) => void;
  handleClick: (event: MouseEvent) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  handleFocusIn: (event: FocusEvent) => void;
  handleInput: (event: Event) => void;
  handleChange: (event: Event) => void;
  handlePointerDown: (event: PointerEvent) => void;
  handlePointerMove: (event: PointerEvent) => void;
  handleWindowBlur: () => void;
}

declare global {
  interface Window {
    __stepScriptRecorder?: RecorderController;
  }
}

function getElementData(element: Element) {
  return {
    tagName: element.tagName.toLowerCase(),
    text: normalizeText(element.textContent),
    inputType: element instanceof HTMLInputElement ? element.type : undefined,
  };
}

function getClickElementData(element: Element) {
  return {
    ...getElementData(element),
    text: getClickTargetText(element),
  };
}

function getEventElement(event: Event) {
  const pathElement = event
    .composedPath()
    .find(
      (eventTarget): eventTarget is Element =>
        eventTarget instanceof Element,
    );

  if (pathElement) return pathElement;
  return event.target instanceof Element ? event.target : undefined;
}

function isSelectableVisibilityTarget(element: Element) {
  if (
    element === document.documentElement ||
    element === document.body ||
    element.getRootNode() !== document
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden'
  );
}

function createVisibilitySelection(
  element: Element,
): ElementVisibilitySelection | undefined {
  if (!isSelectableVisibilityTarget(element)) return undefined;
  const selectors = buildSelectorCandidates(element);
  const recommended = selectors.recommended;
  if (
    !recommended.isUnique ||
    recommended.validation.status !== 'valid' ||
    recommended.validation.matchCount !== 1 ||
    !recommended.validation.matchesTarget
  ) {
    return undefined;
  }

  return { selectors, element: getElementData(element) };
}

function getExactElementText(element: Element) {
  if (
    element.closest(
      'input, textarea, select, option, [contenteditable]:not([contenteditable="false"])',
    )
  ) {
    return undefined;
  }

  const renderedText =
    element instanceof HTMLElement && typeof element.innerText === 'string'
      ? element.innerText
      : element.textContent;
  const normalizedText = renderedText?.replace(/\s+/g, ' ').trim();
  if (!normalizedText || normalizedText.length > 200) return undefined;

  return normalizedText;
}

function createTextSelection(
  element: Element,
): ElementTextSelection | undefined {
  const expectedText = getExactElementText(element);
  if (!expectedText) return undefined;
  const visibilitySelection = createVisibilitySelection(element);
  if (!visibilitySelection) return undefined;

  return { ...visibilitySelection, expectedText };
}

function createPickerOverlay(mode: ElementAssertionPickerMode) {
  const host = document.createElement('div');
  host.dataset.stepScriptElementPicker = 'true';
  Object.assign(host.style, {
    all: 'initial',
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });
  const shadow = host.attachShadow({ mode: 'closed' });
  const outline = document.createElement('div');
  const message = document.createElement('div');
  Object.assign(outline.style, {
    position: 'fixed',
    display: 'none',
    boxSizing: 'border-box',
    border: '3px solid #8b5cf6',
    borderRadius: '4px',
    background: 'rgba(139, 92, 246, 0.12)',
  });
  Object.assign(message.style, {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: 'calc(100vw - 32px)',
    padding: '10px 14px',
    color: '#ffffff',
    background: '#24143f',
    borderRadius: '8px',
    font: '600 13px/1.4 system-ui, sans-serif',
    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.3)',
  });
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  message.textContent =
    mode === 'text'
      ? 'Selecione um elemento com texto. Pressione Esc para cancelar.'
      : 'Selecione um elemento. Pressione Esc para cancelar.';
  shadow.append(outline, message);
  document.documentElement.append(host);

  return {
    update(element?: Element) {
      if (!element || !isSelectableVisibilityTarget(element)) {
        outline.style.display = 'none';
        return;
      }
      const rect = element.getBoundingClientRect();
      Object.assign(outline.style, {
        display: 'block',
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    },
    showError(errorMessage?: string) {
      message.textContent = errorMessage ??
        'Este elemento não possui um seletor único confiável. Escolha outro.';
      message.setAttribute('role', 'alert');
    },
    remove() {
      host.remove();
    },
  };
}

export function createClickMessage(element: Element): ExtensionMessage {
  const selectors = buildSelectorCandidates(element);
  const elementData = getClickElementData(element);

  return {
    type: 'RECORDED_CLICK',
    payload: {
      schemaVersion: 4,
      id: crypto.randomUUID(),
      type: 'click',
      url: window.location.href,
      timestamp: Date.now(),
      selectors,
      element: elementData,
      description: createClickDescription({ selectors, element: elementData }),
    },
  };
}

export function createFocusNavigationMessage(
  element: Element,
  direction: 'forward' | 'backward',
): ExtensionMessage {
  const selectors = buildSelectorCandidates(element);
  const elementData = getElementData(element);

  return {
    type: 'RECORDED_FOCUS_NAVIGATION',
    payload: {
      schemaVersion: 4,
      id: crypto.randomUUID(),
      type: 'focus-navigation',
      url: window.location.href,
      timestamp: Date.now(),
      key: 'Tab',
      direction,
      selectors,
      element: elementData,
      description: createFocusNavigationDescription({
        selectors,
        element: elementData,
      }),
    },
  };
}

export function createFieldFillMessage(
  field: CapturableField,
): Extract<ExtensionMessage, { type: 'RECORDED_FIELD_FILL' }> {
  const value = captureFieldValue(field);
  const selectors = buildSelectorCandidates(field);
  const elementData = getElementData(field);

  return {
    type: 'RECORDED_FIELD_FILL',
    payload: {
      schemaVersion: 5,
      id: crypto.randomUUID(),
      type: 'field-fill',
      url: window.location.href,
      timestamp: Date.now(),
      selectors,
      element: elementData,
      value,
      description: createFieldFillDescription({
        selectors,
        element: elementData,
        value,
      }),
    },
  };
}

export function createRangeChangeMessage(
  control: RangeControl,
): Extract<ExtensionMessage, { type: 'RECORDED_RANGE_CHANGE' }> {
  const value = captureRangeValue(control);
  const selectors = buildSelectorCandidates(control);
  const elementData = {
    tagName: 'input' as const,
    inputType: 'range' as const,
  };

  return {
    type: 'RECORDED_RANGE_CHANGE',
    payload: {
      schemaVersion: 7,
      id: crypto.randomUUID(),
      type: 'range-change',
      url: window.location.href,
      timestamp: Date.now(),
      selectors,
      element: elementData,
      value,
      description: createRangeChangeDescription({
        selectors,
        element: elementData,
        value,
      }),
    },
  };
}

export function createColorChangeMessage(
  control: ColorControl,
): Extract<ExtensionMessage, { type: 'RECORDED_COLOR_CHANGE' }> {
  const value = captureColorValue(control);
  const selectors = buildSelectorCandidates(control);
  const elementData = {
    tagName: 'input' as const,
    inputType: 'color' as const,
  };

  return {
    type: 'RECORDED_COLOR_CHANGE',
    payload: {
      schemaVersion: 8,
      id: crypto.randomUUID(),
      type: 'color-change',
      url: window.location.href,
      timestamp: Date.now(),
      selectors,
      element: elementData,
      value,
      description: createColorChangeDescription({
        selectors,
        element: elementData,
        value,
      }),
    },
  };
}

export function createSelectionChangeMessage(
  selectionControl: SelectionControl,
):
  | Extract<ExtensionMessage, { type: 'RECORDED_SELECTION_CHANGE' }>
  | undefined {
  const control = captureSelectionControl(selectionControl);
  if (!control) return undefined;

  const selectors = buildSelectorCandidates(selectionControl);
  const elementData = getElementData(selectionControl);

  return {
    type: 'RECORDED_SELECTION_CHANGE',
    payload: {
      schemaVersion: 6,
      id: crypto.randomUUID(),
      type: 'selection-change',
      url: window.location.href,
      timestamp: Date.now(),
      selectors,
      element: elementData,
      control,
      description: createSelectionChangeDescription({
        selectors,
        element: elementData,
        control,
      }),
    },
  };
}

export function createKeyPressMessage(
  element: Element,
  key: InteractionKey,
  modifiers?: { shift?: boolean },
): Extract<ExtensionMessage, { type: 'RECORDED_KEY_PRESS' }> {
  const selectors = buildSelectorCandidates(element);
  const elementData = getElementData(element);

  return {
    type: 'RECORDED_KEY_PRESS',
    payload: {
      schemaVersion: 6,
      id: crypto.randomUUID(),
      type: 'key-press',
      url: window.location.href,
      timestamp: Date.now(),
      key,
      ...(modifiers ? { modifiers } : {}),
      selectors,
      element: elementData,
      description: createKeyPressDescription({
        selectors,
        element: elementData,
        key,
        modifiers,
      }),
    },
  };
}

function normalizeInteractionKey(key: string): InteractionKey | undefined {
  if (key === ' ' || key === 'Space' || key === 'Spacebar') return 'Space';

  return [
    'Enter',
    'Escape',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
  ].includes(key)
    ? (key as InteractionKey)
    : undefined;
}

function canCaptureInteractionKey(element: Element, key: InteractionKey) {
  if (key === 'Escape') return true;
  if (isSelectionControl(element)) return true;

  if (isCapturableField(element)) {
    return !(element instanceof HTMLTextAreaElement) && key === 'Enter';
  }

  const role = element.getAttribute('role') ?? getImplicitRole(element);

  if (ARROW_KEYS.has(key)) {
    return Boolean(role && ARROW_INTERACTION_ROLES.has(role));
  }

  return role === 'button' || role === 'link' || role === 'menuitem';
}

export function createRecorderController(
  sendMessage: SendMessage,
): RecorderController {
  let pendingTabNavigation: PendingTabNavigation | undefined;
  let pendingSelectionKey: PendingSelectionKey | undefined;
  let syntheticClickTimeoutId: number | undefined;
  let dirtyFields = new WeakSet<CapturableField>();
  let lastCapturedPlainValues = new WeakMap<CapturableField, string>();
  let dirtyRanges = new WeakSet<RangeControl>();
  let lastCapturedRangeValues = new WeakMap<RangeControl, string>();
  let dirtyColors = new WeakSet<ColorControl>();
  let lastCapturedColorValues = new WeakMap<ColorControl, string>();
  let lastSelectionSignatures = new WeakMap<SelectionControl, string>();
  let elementPickerMode: ElementAssertionPickerMode | undefined;
  let pickerOverlay: ReturnType<typeof createPickerOverlay> | undefined;

  const setElementPickerMode = (mode?: ElementAssertionPickerMode) => {
    elementPickerMode = controller.isActive ? mode : undefined;
    pickerOverlay?.remove();
    pickerOverlay = elementPickerMode
      ? createPickerOverlay(elementPickerMode)
      : undefined;
    clearPendingTabNavigation();
    clearPendingSelectionKey();
    clearSyntheticClickSuppression();
  };

  const setElementVisibilityPickerActive = (isActive: boolean) => {
    setElementPickerMode(isActive ? 'visibility' : undefined);
  };

  const setElementTextPickerActive = (isActive: boolean) => {
    setElementPickerMode(isActive ? 'text' : undefined);
  };

  const clearPendingTabNavigation = () => {
    if (!pendingTabNavigation) return;

    window.clearTimeout(pendingTabNavigation.timeoutId);
    pendingTabNavigation = undefined;
  };

  const clearPendingSelectionKey = () => {
    if (pendingSelectionKey?.timeoutId !== undefined) {
      window.clearTimeout(pendingSelectionKey.timeoutId);
    }

    pendingSelectionKey = undefined;
  };

  const clearSyntheticClickSuppression = () => {
    if (syntheticClickTimeoutId !== undefined) {
      window.clearTimeout(syntheticClickTimeoutId);
    }

    syntheticClickTimeoutId = undefined;
  };

  const suppressNextSyntheticClick = () => {
    clearSyntheticClickSuppression();
    syntheticClickTimeoutId = window.setTimeout(
      clearSyntheticClickSuppression,
      SYNTHETIC_CLICK_TIMEOUT_MS,
    );
  };

  const recordFieldFill = (field: CapturableField) => {
    dirtyFields.delete(field);
    const message = createFieldFillMessage(field);
    const { value } = message.payload;

    if (
      value.kind === 'plain' &&
      lastCapturedPlainValues.get(field) === value.value
    ) {
      return false;
    }

    if (value.kind === 'plain') {
      lastCapturedPlainValues.set(field, value.value);
    }

    void sendMessage(message);
    return true;
  };

  const recordSelectionChange = (control: SelectionControl) => {
    const message = createSelectionChangeMessage(control);
    if (!message) return false;

    const signature = getSelectionSignature(message.payload.control);
    if (signature && lastSelectionSignatures.get(control) === signature) {
      return false;
    }

    if (signature) lastSelectionSignatures.set(control, signature);
    void sendMessage(message);
    return true;
  };

  const recordRangeChange = (control: RangeControl) => {
    dirtyRanges.delete(control);
    const message = createRangeChangeMessage(control);
    const { value } = message.payload;

    if (
      value.kind === 'plain' &&
      lastCapturedRangeValues.get(control) === value.value
    ) {
      return false;
    }

    if (value.kind === 'plain') {
      lastCapturedRangeValues.set(control, value.value);
    }

    void sendMessage(message);
    return true;
  };

  const recordColorChange = (control: ColorControl) => {
    dirtyColors.delete(control);
    const message = createColorChangeMessage(control);
    const { value } = message.payload;

    if (
      value.kind === 'plain' &&
      lastCapturedColorValues.get(control) === value.value
    ) {
      return false;
    }

    if (value.kind === 'plain') {
      lastCapturedColorValues.set(control, value.value);
    }

    void sendMessage(message);
    return true;
  };

  const controller: RecorderController = {
    isActive: false,
    setElementTextPickerActive,
    setActive(isActive) {
      controller.isActive = isActive;
      if (!isActive) {
        setElementPickerMode();
        clearPendingTabNavigation();
        clearPendingSelectionKey();
        clearSyntheticClickSuppression();
        dirtyFields = new WeakSet();
        lastCapturedPlainValues = new WeakMap();
        dirtyRanges = new WeakSet();
        lastCapturedRangeValues = new WeakMap();
        dirtyColors = new WeakSet();
        lastCapturedColorValues = new WeakMap();
        lastSelectionSignatures = new WeakMap();
      }
    },
    setElementVisibilityPickerActive,
    handleClick(event) {
      const eventElement = getEventElement(event);
      if (!controller.isActive || !eventElement) return;

      if (elementPickerMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const selection = elementPickerMode === 'text'
          ? createTextSelection(eventElement)
          : createVisibilitySelection(eventElement);
        if (!selection) {
          pickerOverlay?.showError(
            elementPickerMode === 'text'
              ? 'Escolha um elemento com texto visível, até 200 caracteres e seletor único.'
              : undefined,
          );
          return;
        }

        const message: ExtensionMessage = elementPickerMode === 'text'
          ? { type: 'SELECT_ELEMENT_TEXT_ASSERTION', payload: selection as ElementTextSelection }
          : { type: 'SELECT_ELEMENT_VISIBILITY_ASSERTION', payload: selection };

        void Promise.resolve()
          .then(() => sendMessage(message))
          .then((response) => {
            if (
              typeof response === 'object' &&
              response !== null &&
              'success' in response &&
              response.success === true
            ) {
              setElementPickerMode();
            } else {
              pickerOverlay?.showError();
            }
          })
          .catch(() => pickerOverlay?.showError());
        return;
      }

      if (resolveColorControl(eventElement)) return;
      if (isRangeControl(eventElement)) return;
      if (resolveSelectionControl(eventElement)) return;

      if (event.detail === 0 && syntheticClickTimeoutId !== undefined) {
        clearSyntheticClickSuppression();
        return;
      }

      const clickTarget = resolveClickTarget(eventElement);
      if (!clickTarget) return;

      void sendMessage(createClickMessage(clickTarget));
    },
    handleKeyDown(event) {
      if (!controller.isActive) return;

      if (elementPickerMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === 'Escape') {
          setElementPickerMode();
          void sendMessage({ type: 'CANCEL_ELEMENT_VISIBILITY_PICKER' });
        }
        return;
      }

      if (
        event.key === 'Tab' &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        clearPendingTabNavigation();
        pendingTabNavigation = {
          direction: event.shiftKey ? 'backward' : 'forward',
          source: getEventElement(event),
          timeoutId: window.setTimeout(
            clearPendingTabNavigation,
            TAB_NAVIGATION_TIMEOUT_MS,
          ),
        };
        return;
      }

      clearPendingTabNavigation();
      if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;

      const key = normalizeInteractionKey(event.key);
      const element = getEventElement(event);
      if (!key || !element || !canCaptureInteractionKey(element, key)) return;

      if (isRangeControl(element) && ARROW_KEYS.has(key)) return;

      const selectionControl = resolveSelectionControl(element);
      const modifiers = event.shiftKey ? { shift: true } : undefined;

      if (selectionControl) {
        clearPendingSelectionKey();
        pendingSelectionKey = { control: selectionControl, key, modifiers };
        return;
      }

      if (
        key === 'Enter' &&
        isCapturableField(element) &&
        dirtyFields.has(element)
      ) {
        recordFieldFill(element);
      }

      void sendMessage(createKeyPressMessage(element, key, modifiers));
      if (key === 'Enter' || key === 'Space') suppressNextSyntheticClick();
    },
    handleKeyUp(event) {
      if (!controller.isActive || !pendingSelectionKey) return;

      const key = normalizeInteractionKey(event.key);
      const element = getEventElement(event);
      if (
        !key ||
        key !== pendingSelectionKey.key ||
        !element ||
        resolveSelectionControl(element) !== pendingSelectionKey.control
      ) {
        return;
      }

      const pendingKey = pendingSelectionKey;
      pendingKey.timeoutId = window.setTimeout(() => {
        if (pendingSelectionKey !== pendingKey) return;

        pendingSelectionKey = undefined;
        void sendMessage(
          createKeyPressMessage(
            pendingKey.control,
            pendingKey.key,
            pendingKey.modifiers,
          ),
        );
      }, 0);
    },
    handleFocusIn(event) {
      if (!controller.isActive || !pendingTabNavigation) return;

      const navigation = pendingTabNavigation;
      const element = getEventElement(event);
      clearPendingTabNavigation();

      if (!element || element === navigation.source) return;

      void sendMessage(
        createFocusNavigationMessage(element, navigation.direction),
      );
    },
    handleInput(event) {
      const element = getEventElement(event);
      if (!controller.isActive || !element) return;

      if (isColorControl(element)) {
        dirtyColors.add(element);
        return;
      }

      if (isRangeControl(element)) {
        dirtyRanges.add(element);
        return;
      }

      if (!isCapturableField(element)) {
        return;
      }

      dirtyFields.add(element);
    },
    handleChange(event) {
      const element = getEventElement(event);
      const selectionControl = element
        ? resolveSelectionControl(element)
        : undefined;

      if (controller.isActive && selectionControl) {
        if (pendingSelectionKey?.control === selectionControl) {
          clearPendingSelectionKey();
        }
        recordSelectionChange(selectionControl);
        return;
      }

      if (controller.isActive && element && isColorControl(element)) {
        if (dirtyColors.has(element)) recordColorChange(element);
        return;
      }

      if (controller.isActive && element && isRangeControl(element)) {
        if (dirtyRanges.has(element)) recordRangeChange(element);
        return;
      }

      if (
        !controller.isActive ||
        !element ||
        !isCapturableField(element) ||
        !dirtyFields.has(element)
      ) {
        return;
      }

      recordFieldFill(element);
    },
    handlePointerDown(event) {
      if (elementPickerMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      clearPendingTabNavigation();
      clearPendingSelectionKey();
      clearSyntheticClickSuppression();
    },
    handlePointerMove(event) {
      if (!elementPickerMode) return;
      pickerOverlay?.update(getEventElement(event));
    },
    handleWindowBlur() {
      clearPendingTabNavigation();
      clearPendingSelectionKey();
      clearSyntheticClickSuppression();
    },
  };

  return controller;
}

export function installRecorder() {
  if (window.__stepScriptRecorder) return;

  const controller = createRecorderController((message) =>
    chrome.runtime.sendMessage(message),
  );
  const guidedHighlight = createGuidedHighlight(() => {
    void chrome.runtime.sendMessage({ type: 'GUIDED_TARGET_LOST' }).catch(() => undefined);
  });

  document.addEventListener('click', controller.handleClick, true);
  document.addEventListener('keydown', controller.handleKeyDown, true);
  document.addEventListener('keyup', controller.handleKeyUp, true);
  document.addEventListener('focusin', controller.handleFocusIn, true);
  document.addEventListener('input', controller.handleInput, true);
  document.addEventListener('change', controller.handleChange, true);
  document.addEventListener('pointerdown', controller.handlePointerDown, true);
  document.addEventListener('pointermove', controller.handlePointerMove, true);
  window.addEventListener('blur', controller.handleWindowBlur);
  window.__stepScriptRecorder = controller;

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'ACTIVATE_CLICK_RECORDER') {
      controller.setActive(true);
      sendResponse({ success: true });
    }
    if (message.type === 'DEACTIVATE_CLICK_RECORDER') {
      controller.setActive(false);
      guidedHighlight.clear();
      sendResponse({ success: true });
    }
    if (message.type === 'SHOW_GUIDED_HIGHLIGHT') {
      sendResponse({ success: guidedHighlight.show(message.payload) });
    }
    if (message.type === 'CLEAR_GUIDED_HIGHLIGHT') {
      guidedHighlight.clear();
      sendResponse({ success: true });
    }
    if (message.type === 'ACTIVATE_ELEMENT_VISIBILITY_PICKER') {
      controller.setElementVisibilityPickerActive(true);
      sendResponse({ success: controller.isActive });
    }
    if (message.type === 'ACTIVATE_ELEMENT_TEXT_PICKER') {
      controller.setElementTextPickerActive(true);
      sendResponse({ success: controller.isActive });
    }
    if (message.type === 'DEACTIVATE_ELEMENT_VISIBILITY_PICKER') {
      controller.setElementVisibilityPickerActive(false);
      sendResponse({ success: true });
    }
  });
}

if (globalThis.chrome?.runtime) installRecorder();
