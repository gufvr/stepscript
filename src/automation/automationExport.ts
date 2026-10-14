import { safeAutomationUrl } from './safeAutomationUrl';

export type AutomationExportPlan =
  | { kind: 'login'; url: string; identifierSelector?: string; passwordSelector?: string; actionSelector?: string; requiresPassword: boolean; identifierInputType?: string; identifierSensitiveReason?: 'password' | 'one-time-code' | 'payment' | 'personal-id' | 'secret'; actionTagName?: string; actionLabel?: string }
  | { kind: 'visible-errors'; url: string; foundErrors: boolean }
  | { kind: 'technical-errors'; url: string; foundErrors: boolean };

export type AutomationFramework = 'playwright' | 'cypress';

export function generateAutomationExport(framework: AutomationFramework, plan: AutomationExportPlan) {
  const url = JSON.stringify(safeAutomationUrl(plan.url));
  if (plan.kind === 'technical-errors') {
    if (framework === 'playwright') return [
      'import { test, expect } from "@playwright/test";',
      '',
      'test("StepScript HTTP error check", async ({ page }) => {',
      '  const failedStatuses: number[] = [];',
      '  page.on("response", (response) => {',
      '    if (response.status() >= 400) failedStatuses.push(response.status());',
      '  });',
      `  await page.goto(${url});`,
      '  // TODO: reproduce the request that caused the observed HTTP error.',
      ...(plan.foundErrors
        ? ['  await expect.poll(() => failedStatuses.length).toBeGreaterThan(0);']
        : ['  expect(failedStatuses).toHaveLength(0);']),
      '  // Browser-console exceptions require a separate, explicit assertion.',
      '});',
      '',
    ].join('\n');
    return [
      'describe("StepScript HTTP error check", () => {',
      '  it("checks HTTP failures", () => {',
      '    const failedStatuses: number[] = [];',
      '    cy.intercept("**/*", (request) => {',
      '      request.continue((response) => {',
      '        if (response.statusCode >= 400) failedStatuses.push(response.statusCode);',
      '      });',
      '    });',
      `    cy.visit(${url});`,
      '    // TODO: reproduce the request that caused the observed HTTP error.',
      ...(plan.foundErrors
        ? ['    cy.then(() => expect(failedStatuses.length).to.be.greaterThan(0));']
        : ['    cy.then(() => expect(failedStatuses).to.have.length(0));']),
      '    // Browser-console exceptions require a separate, explicit assertion.',
      '  });',
      '});',
      '',
    ].join('\n');
  }
  if (framework === 'playwright') {
    const body = plan.kind === 'login' ? [
      ...(plan.identifierSelector ? [
        '  const username = process.env.TEST_USERNAME;',
        '  if (!username) throw new Error("Set TEST_USERNAME before running this test.");',
        `  await page.locator(${JSON.stringify(plan.identifierSelector)}).fill(username);`,
      ] : []),
      ...(plan.requiresPassword ? [
        '  const password = process.env.TEST_PASSWORD;',
        '  if (!password) throw new Error("Set TEST_PASSWORD before running this test.");',
        ...(plan.passwordSelector ? [`  await page.locator(${JSON.stringify(plan.passwordSelector)}).fill(password);`] : ['  // TODO: choose a unique selector for the password field.']),
      ] : []),
      ...(plan.actionSelector ? [`  await page.locator(${JSON.stringify(plan.actionSelector)}).click();`] : ['  // TODO: choose a unique selector for the login/OTP action.']),
      '  // TODO: assert the expected result of this login attempt.',
    ] : [
      '  // TODO: reproduce the action that causes the validation error.',
      '  const errors = page.locator("[role=alert]:visible, [aria-invalid=true]:visible, .error:visible, .invalid-feedback:visible, [data-error]:visible");',
      plan.foundErrors ? '  await expect(errors.first()).toBeVisible();' : '  await expect(errors).toHaveCount(0);',
    ];
    return [
      'import { test, expect } from "@playwright/test";',
      '',
      'test("StepScript automation", async ({ page }) => {',
      `  await page.goto(${url});`,
      ...body,
      '});',
      '',
    ].join('\n');
  }

  const body = plan.kind === 'login' ? [
    ...(plan.identifierSelector ? [
      '    const username = Cypress.env("TEST_USERNAME");',
      '    if (typeof username !== "string" || !username) throw new Error("Set TEST_USERNAME in Cypress.env.");',
      `    cy.get(${JSON.stringify(plan.identifierSelector)}).type(username);`,
    ] : []),
    ...(plan.requiresPassword ? [
      '    const password = Cypress.env("TEST_PASSWORD");',
      '    if (typeof password !== "string" || !password) throw new Error("Set TEST_PASSWORD in Cypress.env.");',
      ...(plan.passwordSelector ? [`    cy.get(${JSON.stringify(plan.passwordSelector)}).type(password, { log: false });`] : ['    // TODO: choose a unique selector for the password field.']),
    ] : []),
    ...(plan.actionSelector ? [`    cy.get(${JSON.stringify(plan.actionSelector)}).click();`] : ['    // TODO: choose a unique selector for the login/OTP action.']),
    '    // TODO: assert the expected result of this login attempt.',
  ] : [
    '    // TODO: reproduce the action that causes the validation error.',
    plan.foundErrors
      ? '    cy.get("[role=alert], [aria-invalid=true], .error, .invalid-feedback, [data-error]").filter(":visible").should("exist");'
      : '    cy.get("[role=alert]:visible, [aria-invalid=true]:visible, .error:visible, .invalid-feedback:visible, [data-error]:visible").should("not.exist");',
  ];
  return [
    'describe("StepScript automation", () => {',
    '  it("runs the selected scenario", () => {',
    `    cy.visit(${url});`,
    ...body,
    '  });',
    '});',
    '',
  ].join('\n');
}

