'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Must match `.panel-slide-out` / `.overlay-fade-out` in globals.css. */
const EXIT_MS = 240;

/**
 * Enter/exit animation for a right-hand slide-over panel.
 *
 * A panel unmounts the instant its `onClose` fires, which leaves no time for an
 * exit animation to play. This keeps the panel mounted for the length of the
 * exit, swapping in the outgoing classes, and only then hands control back to
 * the caller's `onClose`.
 *
 * Wire `close` to every dismissal — backdrop click, the X, and Cancel — and
 * spread the class names onto the backdrop and panel elements.
 */
export function useSlideOver(onClose: () => void) {
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    // Guard against a second click during the exit restarting the timer.
    if (timer.current) return;
    setClosing(true);
    timer.current = setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Escape closes, matching the click-outside affordance panels already have.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close]);

  return {
    close,
    closing,
    backdropCls: closing ? 'overlay-fade-out' : 'overlay-fade-in',
    panelCls: closing ? 'panel-slide-out' : 'panel-slide-in',
  };
}
