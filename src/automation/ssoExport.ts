import type { RecordedClick } from '../shared/recordingTypes';
import { generatePlaywrightTest } from '../shared/playwright/generatePlaywrightTest';
import { generateCypressTest } from '../shared/cypress/generateCypressTest';
import type { AutomationFramework } from './automationExport';

export function generateSsoExport(framework: AutomationFramework, startStep: RecordedClick): string {
  const base = framework === 'playwright'
    ? generatePlaywrightTest([startStep]).code
    : generateCypressTest([startStep]).code;
  const ending = framework === 'playwright' ? '\n});' : '\n  });\n});';
  const position = base.lastIndexOf(ending);
  if (position < 0) throw new Error('Não foi possível preparar o teste SSO.');
  const indent = framework === 'playwright' ? '  ' : '    ';
  const manual = [
    '',
    `${indent}// TODO StepScript: confira a URL inicial e o seletor antes de executar.`,
    `${indent}// TODO StepScript: autenticação no provedor externo, MFA, CAPTCHA e consentimento são manuais.`,
    `${indent}// TODO StepScript: após o retorno, adicione verificações do resultado no site de origem.`,
  ].join('\n');
  return `${base.slice(0, position)}${manual}${base.slice(position)}`;
}
