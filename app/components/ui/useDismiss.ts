'use client';

import { useEffect, useRef } from 'react';

/**
 * Closes a popover on an outside click or Escape.
 *
 * Attach the returned ref to the element that wraps both the trigger and the
 * panel, so clicking the trigger to toggle does not read as "outside".
 *
 * The callback is held in a ref, so passing an inline arrow does not re-bind
 * the listeners on every render.
 */
export function useDismiss<T extends HTMLElement = HTMLDivElement>(open: boolean, onDismiss: () => void) {
  const ref = useRef<T>(null);
  const handler = useRef(onDismiss);

  // Kept fresh in an effect rather than assigned during render.
  useEffect(() => {
    handler.current = onDismiss;
  });

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) handler.current();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handler.current();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return ref;
}
