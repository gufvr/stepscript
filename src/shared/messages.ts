import type {
  ActiveTabContext,
  RecordedColorChange,
  RecordedClick,
  RecordedFieldFill,
  RecordedFocusNavigation,
  RecordedKeyPress,
  RecordedRangeChange,
  RecordedSelectionChange,
  ElementVisibilityPickerState,
  ElementVisibilitySelection,
  ElementTextSelection,
} from './recordingTypes';
import type { ReplayStatus, ReplayStepResult } from '../replay/replaySession';
import type { AutomationExportPlan } from '../automation/automationExport';

export interface LoginAutomationTarget {
  selector: string;
  label: string;
}

export interface LoginAutomationForm {
  fingerprint: string;
  label: string;
  actionLabel: string;
  requiresPassword: boolean;
  identifiers: LoginAutomationTarget[];
  passwords: LoginAutomationTarget[];
  actions: LoginAutomationTarget[];
}

export interface LoginAutomationSelection {
  identifierSelector?: string;
  passwordSelector?: string;
  actionSelector: string;
}

export interface SsoAutomationOption {
  fingerprint: string;
  provider: string;
  actionLabel: string;
  destination: string;
  actionSelector: string;
  actionTagName: string;
  canStart: boolean;
  manualReason?: string;
}

export type ExtensionMessage =
  | { type: 'INSPECT_LOGIN_AUTOMATION' }
  | { type: 'INSPECT_SSO_AUTOMATION' }
  | { type: 'START_SSO_AUTOMATION'; payload: { fingerprint: string; destination: string; documentId: string } }
  | { type: 'GET_SSO_FLOW_STATUS' }
  | { type: 'RUN_QUICK_AUTOMATION'; payload: { kind: 'login' | 'visible-errors' | 'technical-errors'; username?: string; password?: string; loginFingerprint?: string; loginDocumentId?: string; loginSelection?: LoginAutomationSelection } }
  | { type: 'PREPARE_REPLAY' }
  | { type: 'START_REPLAY'; payload: { token: string } }
  | { type: 'GET_REPLAY_STATUS' }
  | { type: 'CANCEL_REPLAY' }
  | {
      type: 'START_RECORDING';
      payload: { tabId: number; origin: string; url: string };
    }
  | { type: 'STOP_RECORDING' }
  | { type: 'ADD_CURRENT_URL_ASSERTION' }
  | { type: 'START_ELEMENT_VISIBILITY_PICKER' }
  | { type: 'START_ELEMENT_TEXT_PICKER' }
  | { type: 'CANCEL_ELEMENT_VISIBILITY_PICKER' }
  | {
      type: 'SELECT_ELEMENT_VISIBILITY_ASSERTION';
      payload: ElementVisibilitySelection;
    }
  | {
      type: 'SELECT_ELEMENT_TEXT_ASSERTION';
      payload: ElementTextSelection;
    }
  | { type: 'RECORDED_CLICK'; payload: RecordedClick }
  | {
      type: 'RECORDED_FOCUS_NAVIGATION';
      payload: RecordedFocusNavigation;
    }
  | {
      type: 'RECORDED_FIELD_FILL';
      payload: RecordedFieldFill;
    }
  | {
      type: 'RECORDED_RANGE_CHANGE';
      payload: RecordedRangeChange;
    }
  | {
      type: 'RECORDED_COLOR_CHANGE';
      payload: RecordedColorChange;
    }
  | {
      type: 'RECORDED_SELECTION_CHANGE';
      payload: RecordedSelectionChange;
    }
  | {
      type: 'RECORDED_KEY_PRESS';
      payload: RecordedKeyPress;
    }
  | {
      type: 'DELETE_RECORDED_STEP';
      payload: { stepIndex: number; expectedId?: string };
    }
  | {
      type: 'UPDATE_RECORDED_STEP_DESCRIPTION';
      payload: {
        stepIndex: number;
        expectedId?: string;
        expectedReference: string;
        text: string;
      };
    }
  | {
      type: 'MOVE_RECORDED_STEP';
      payload: {
        fromIndex: number;
        toIndex: number;
        expectedStepReference: string;
        expectedTargetReference: string;
        expectedId?: string;
        expectedTargetId?: string;
      };
    }
  | { type: 'CLEAR_RECORDED_STEPS' }
  | { type: 'GET_ACTIVE_TAB_CONTEXT' }
  | { type: 'ACTIVATE_CLICK_RECORDER' }
  | { type: 'DEACTIVATE_CLICK_RECORDER' }
  | { type: 'ACTIVATE_ELEMENT_VISIBILITY_PICKER' }
  | { type: 'ACTIVATE_ELEMENT_TEXT_PICKER' }
  | { type: 'DEACTIVATE_ELEMENT_VISIBILITY_PICKER' };

export interface ExtensionResponse {
  success: boolean;
  error?: string;
  activeTabContext?: ActiveTabContext;
  pickerState?: ElementVisibilityPickerState;
  replayPreview?: { token: string; origin: string; steps: ReplayStepResult[] };
  replayStatus?: ReplayStatus;
  automationSteps?: string[];
  automationExport?: AutomationExportPlan;
  loginForms?: LoginAutomationForm[];
  loginDocumentId?: string;
  ssoOptions?: SsoAutomationOption[];
  ssoDocumentId?: string;
  ssoFlow?: { phase: 'idle' | 'started' | 'external' | 'returned' | 'manual'; message: string };
}
