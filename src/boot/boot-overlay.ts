/**
 * Boot overlay — the one piece of DOM that's not three.js.
 *
 * Shows "INITIALIZING CORE" while the cabinet boots (PMREM + shader compile
 * + rapier WASM init). Cross-fades to transparent on first rendered frame.
 * After the fade, removes itself from the DOM so it never steals pointer
 * events from the canvas.
 */

const OVERLAY_FADE_MS = 600;

export interface BootOverlay {
  /** Start the fade-out. Removes the element from DOM once it's invisible. */
  fadeOut(): void;
  /** Remove immediately (e.g., reduced-motion). */
  unmount(): void;
}

export function mountBootOverlay(parent: HTMLElement): BootOverlay {
  const el = document.createElement('div');
  el.id = 'boot-overlay';
  el.setAttribute('data-testid', 'loading-overlay');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Initializing');

  Object.assign(el.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: "'Courier New', monospace",
    fontSize: '32px',
    letterSpacing: '16px',
    zIndex: '100',
    transition: `opacity ${OVERLAY_FADE_MS}ms ease-out`,
    pointerEvents: 'none',
    opacity: '1',
  } satisfies Partial<CSSStyleDeclaration>);

  const text = document.createElement('span');
  text.textContent = 'INITIALIZING CORE';
  el.appendChild(text);

  parent.appendChild(el);

  let removed = false;
  function unmount(): void {
    if (removed) return;
    removed = true;
    el.remove();
  }

  function fadeOut(): void {
    if (removed) return;
    el.style.opacity = '0';
    window.setTimeout(unmount, OVERLAY_FADE_MS);
  }

  return { fadeOut, unmount };
}
