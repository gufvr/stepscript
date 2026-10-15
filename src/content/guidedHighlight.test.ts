import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGuidedHighlight } from './guidedHighlight';

let clear: (() => void) | undefined;
afterEach(() => { clear?.(); document.body.replaceChildren(); vi.restoreAllMocks(); });

function field() {
  const input = document.createElement('input');
  input.type = 'password'; input.id = 'guided-field';
  document.body.append(input);
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 120, height: 40 } as DOMRect);
  return input;
}

describe('guided decorative highlight', () => {
  it('outlines a protected field without reading its value, changing focus or triggering an action', () => {
    const input = field();
    const valueRead = vi.fn(() => { throw new Error('Sensitive value must not be read'); });
    Object.defineProperty(input, 'value', { get: valueRead });
    const click = vi.fn(); input.addEventListener('click', click);
    const focus = vi.spyOn(input, 'focus');
    const previousFocus = document.activeElement;
    const highlight = createGuidedHighlight(vi.fn()); clear = highlight.clear;
    expect(highlight.show({ url: location.href, selector: { strategy: 'css', value: '#guided-field' } })).toBe(true);
    const outline = document.querySelector<HTMLElement>('[data-stepscript-guided-highlight]')!;
    expect(outline.style.pointerEvents).toBe('none');
    expect(outline.style.getPropertyPriority('pointer-events')).toBe('important');
    expect(outline.getAttribute('aria-hidden')).toBe('true');
    expect(outline.textContent).toBe('');
    expect(outline.style.left).toBe('7px');
    expect(document.activeElement).toBe(previousFocus);
    expect(valueRead).not.toHaveBeenCalled(); expect(focus).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled();
    highlight.clear(); expect(outline.isConnected).toBe(false);
  });

  it('removes an outline when a dynamic element disappears and reports loss once', async () => {
    const input = field(); const lost = vi.fn();
    const highlight = createGuidedHighlight(lost); clear = highlight.clear;
    highlight.show({ url: location.href, selector: { strategy: 'css', value: '#guided-field' } });
    input.remove(); await Promise.resolve();
    expect(document.querySelector('[data-stepscript-guided-highlight]')).toBeNull();
    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('rejects stale URLs and ambiguous selectors and clears on document exit', () => {
    field(); const highlight = createGuidedHighlight(vi.fn()); clear = highlight.clear;
    expect(highlight.show({ url: `${location.href}#other`, selector: { strategy: 'css', value: 'input' } })).toBe(false);
    document.body.append(document.createElement('input'));
    expect(highlight.show({ url: location.href, selector: { strategy: 'css', value: 'input' } })).toBe(false);
    expect(highlight.show({ url: location.href, selector: { strategy: 'css', value: '#guided-field' } })).toBe(true);
    window.dispatchEvent(new Event('pagehide'));
    expect(document.querySelector('[data-stepscript-guided-highlight]')).toBeNull();
  });
});
