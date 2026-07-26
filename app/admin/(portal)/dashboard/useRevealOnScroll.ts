'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Flips `revealed` to true the first time the returned ref's element scrolls
 * into view, so a chart can animate from its empty state on reveal.
 */
export function useRevealOnScroll<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
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
  }, [threshold])

  return { ref, revealed }
}
