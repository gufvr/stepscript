export interface GuidedHighlightRequest {
  url: string;
  selector: { strategy: string; value: string; attribute?: string };
}

// Decorative outline only: never read field values, focus, scroll, click or dispatch input.
export function createGuidedHighlight(onLost: () => void) {
  let host: HTMLDivElement | undefined;
  let target: Element | undefined;
  let observer: MutationObserver | undefined;
  let expectedUrl: string | undefined;

  const clear = () => {
    observer?.disconnect();
    observer = undefined;
    window.removeEventListener('scroll', update, true);
    window.removeEventListener('resize', update);
    window.removeEventListener('pagehide', clear);
    window.removeEventListener('blur', clear);
    host?.remove();
    host = undefined;
    target = undefined;
  };

  const update = () => {
    if (!target || !host) return;
    const style = getComputedStyle(target);
    const rect = target.getBoundingClientRect();
    if (!target.isConnected || location.href !== expectedUrl || style.display === 'none'
      || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
      clear();
      onLost();
      return;
    }
    Object.assign(host.style, {
      left: `${rect.left - 3}px`, top: `${rect.top - 3}px`,
      width: `${rect.width + 6}px`, height: `${rect.height + 6}px`,
    });
  };

  const show = ({ url, selector }: GuidedHighlightRequest) => {
    clear();
    if (location.href !== url) return false;
    let query: string;
    if (selector.strategy === 'css') query = selector.value;
    else if (selector.strategy === 'id') query = `[id="${CSS.escape(selector.value)}"]`;
    else if (selector.strategy === 'testId' && ['data-testid', 'data-test', 'data-cy'].includes(selector.attribute ?? 'data-testid'))
      query = `[${selector.attribute ?? 'data-testid'}="${CSS.escape(selector.value)}"]`;
    else return false;
    try {
      const matches = document.querySelectorAll(query);
      if (matches.length !== 1) return false;
      target = matches[0];
    } catch { return false; }
    expectedUrl = url;
    host = document.createElement('div');
    host.setAttribute('data-stepscript-guided-highlight', '');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'all:initial;position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;border:3px solid #7c3aed;border-radius:6px;box-shadow:0 0 0 2px white;';
    host.style.setProperty('pointer-events', 'none', 'important');
    document.documentElement.append(host);
    update();
    if (!host) return false;
    observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.target !== host)) update();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    window.addEventListener('pagehide', clear);
    window.addEventListener('blur', clear);
    return true;
  };
  return { show, clear };
}
