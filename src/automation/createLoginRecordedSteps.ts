import type { AutomationExportPlan } from './automationExport';
import type { RecordedClick, RecordedFieldFill, RecordedFieldValue, RecordedStep, SelectorAnalysis } from '../shared/recordingTypes';
import { createClickDescription } from '../shared/descriptions/createClickDescription';
import { createFieldFillDescription } from '../shared/descriptions/createFieldFillDescription';
import { safeAutomationUrl } from './safeAutomationUrl';

type LoginPlan = Extract<AutomationExportPlan, { kind: 'login' }>;

function selectors(value: string): SelectorAnalysis {
  return {
    recommended: {
      strategy: 'css', value, score: 100, isUnique: true,
      validation: { status: 'valid', matchCount: 1, matchesTarget: true },
    },
    alternatives: [],
  };
}

function fieldStep(url: string, selector: string, inputType: string, value: RecordedFieldValue): RecordedFieldFill {
  const analysis = selectors(selector);
  const element = { tagName: 'input', inputType };
  return {
    schemaVersion: 5, id: crypto.randomUUID(), type: 'field-fill', url,
    timestamp: Date.now(), selectors: analysis, element, value,
    description: createFieldFillDescription({ selectors: analysis, element, value }),
  };
}

export function createLoginRecordedSteps(plan: LoginPlan, username: string): RecordedStep[] {
  const url = safeAutomationUrl(plan.url);
  const steps: RecordedStep[] = [];
  if (plan.identifierSelector) {
    const value: RecordedFieldValue = plan.identifierSensitiveReason
      ? { kind: 'protected', reason: plan.identifierSensitiveReason }
      : { kind: 'plain', value: username.slice(0, 2000), ...(username.length > 2000 ? { truncated: true } : {}) };
    steps.push(fieldStep(url, plan.identifierSelector, plan.identifierInputType ?? 'text', value));
  }
  if (plan.requiresPassword && plan.passwordSelector) {
    steps.push(fieldStep(url, plan.passwordSelector, 'password', { kind: 'protected', reason: 'password' }));
  }
  if (plan.actionSelector) {
    const analysis = selectors(plan.actionSelector);
    const element = { tagName: plan.actionTagName ?? 'button', text: plan.actionLabel };
    const step: RecordedClick = {
      schemaVersion: 4, id: crypto.randomUUID(), type: 'click', url,
      timestamp: Date.now(), selectors: analysis, element,
      description: createClickDescription({ selectors: analysis, element }),
    };
    steps.push(step);
  }
  return steps;
}
