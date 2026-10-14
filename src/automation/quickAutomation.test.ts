import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInPage } from './quickAutomation';

describe('quick automation in the page', () => {
  afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('reports visible validation errors without prior recording', () => {
    document.body.innerHTML = '<p role="alert">Usuário inválido</p>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect);
    expect(runInPage('visible-errors', location.href).automationSteps).toEqual(['Erro visível: Usuário inválido']);
  });

  it('refuses stale URLs', () => {
    expect(runInPage('visible-errors', 'https://different.example/').success).toBe(false);
  });

  it('includes observable failed document navigations in technical scans', () => {
    vi.spyOn(performance, 'getEntriesByType').mockImplementation((type) => type === 'navigation'
      ? [{ name: location.href, responseStatus: 404 } as PerformanceNavigationTiming] : []);
    const result = runInPage('technical-errors', location.href);
    expect(result.automationSteps?.[0]).toContain('HTTP 404');
    expect(result.automationExport).toEqual({ kind: 'technical-errors', url: location.href, foundErrors: true });
  });
});
