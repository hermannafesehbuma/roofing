'use client'

import { useEffect, useRef, useState } from 'react'
import { useEntry } from '@/app/components/ui/animations'

/**
 * Flips `revealed` to true the first time the returned ref's element scrolls
 * into view, so a chart can animate from its empty state on reveal.
 *
 * Only on a first visit, though. The charts remount on every navigation back to
 * the dashboard, and redrawing every ring and bar from zero each time reads as
 * the page reloading. On a repeat visit the chart starts already revealed:
 * there is no state change, so the CSS transition never fires and the figures
 * are simply there.
 */
export function useRevealOnScroll<T extends Element>(threshold = 0.3) {
  const { first } = useEntry()
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(!first)

  useEffect(() => {
    if (revealed) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setRevealed(true)
        observer.disconnect() // reveal once, don't re-run on scroll back
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, revealed])

  return { ref, revealed }
}
