import type { SsoAutomationOption } from '../shared/messages';
import type { RecordedClick, SelectorAnalysis } from '../shared/recordingTypes';
import { createClickDescription } from '../shared/descriptions/createClickDescription';
import { safeAutomationUrl } from './safeAutomationUrl';

export function createSsoStartStep(url: string, option: SsoAutomationOption): RecordedClick {
  const value = option.actionSelector;
  const selectors: SelectorAnalysis = {
    recommended: { strategy: 'css', value, score: 100, isUnique: true,
      validation: { status: 'valid', matchCount: 1, matchesTarget: true } },
    alternatives: [],
  };
  const element = { tagName: option.actionTagName, text: option.actionLabel.slice(0, 200) };
  return { schemaVersion: 4, id: crypto.randomUUID(), type: 'click', url: safeAutomationUrl(url),
    timestamp: Date.now(), selectors, element, description: createClickDescription({ selectors, element }) };
}
