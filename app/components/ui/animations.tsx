'use client'

/**
 * Entry animations, played once per route per browsing session.
 *
 * Skeletons and fade-ups are there to cover a first load. Replaying them every
 * time someone flips back to a screen they already have loaded reads as lag, so
 * every route records itself in `seen` the first time it renders and both the
 * loading fallback and the entry animations sit those out afterwards.
 *
 * `seen` is module state, which means:
 *   - it is per browser tab, and resets on a hard reload — which is correct,
 *     because a hard reload really does re-fetch everything;
 *   - on the server it must never be trusted, since one module instance is
 *     shared across every request. Server renders always report "first visit",
 *     matching what the browser computes on that same first paint.
 *
 * The keyframes themselves live in `globals.css`.
 */
import { useState, useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'

const ENTER = 'animate-enter'
const ENTER_FADE = 'animate-enter-fade'

/** Milliseconds between consecutive items in a staggered list. */
const STEP = 40

/**
 * Delays past this point feel like a wait rather than a flourish, so long
 * lists stop staggering and the tail animates together.
 */
const MAX_DELAY = 360

/*
 * The visited-route set hangs off `globalThis` rather than being a plain module
 * binding. The bundler emits this module into every route's client chunk — a
 * module-level `Set` would therefore give each route its own copy, and a route
 * could never see that it had already been visited. `globalThis` is one
 * namespace no matter how many copies of the file exist.
 */
const STORE = '__peakVisitedRoutes' as const

type GlobalWithStore = typeof globalThis & { [STORE]?: Set<string> }

function visited(): Set<string> {
  const g = globalThis as GlobalWithStore
  return (g[STORE] ??= new Set<string>())
}

const onServer = () => typeof window === 'undefined'

/**
 * Always false on the server: one Node process serves every request, so a
 * shared set there would leak one visitor's history into another's page. A
 * server render is also always a fresh page load, which genuinely is a first
 * visit — so this matches what the browser computes on that same first paint.
 */
export function hasSeen(routeKey: string): boolean {
  return onServer() ? false : visited().has(routeKey)
}

export function markSeen(routeKey: string): void {
  if (!onServer()) visited().add(routeKey)
}

function enterDelay(index: number, step: number = STEP): CSSProperties {
  return { '--enter-delay': `${Math.min(index * step, MAX_DELAY)}ms` } as CSSProperties
}

type EntryProps = { className: string; style?: CSSProperties }

/**
 * Props for elements that should animate in on a first visit.
 *
 * Call once at the top of a component, then spread the result onto each
 * element — the returned helpers already merge the element's own classes:
 *
 *   const enter = useEntry()
 *   rows.map((row, i) => <tr key={row.id} {...enter.item(i, 'hover:bg-gray-50')}>)
 *
 * On a repeat visit both helpers return the base classes untouched, so the
 * content is simply there.
 */
export function useEntry() {
  const pathname = usePathname()
  // Captured at first render: the same list must not start animating midway
  // through its life just because the route got marked seen underneath it.
  const [first] = useState(() => !hasSeen(pathname))

  useEffect(() => { markSeen(pathname) }, [pathname])

  return useMemo(() => ({
    /** Staggered fade-up, for cards and table rows. */
    item(index: number, className = '', step?: number): EntryProps {
      if (!first) return { className }
      return { className: `${className} ${ENTER}`.trim(), style: enterDelay(index, step) }
    },
    /**
     * Opacity only — for toolbars and controls, which look unsteady if they
     * slide under a cursor that is already hovering them.
     */
    fade(className = ''): EntryProps {
      if (!first) return { className }
      return { className: `${className} ${ENTER_FADE}`.trim() }
    },
    /** True while this is the session's first visit to the route. */
    first,
  }), [first])
}

/**
 * Wraps a route's `loading.tsx` so the skeleton only covers the first visit.
 * Rendering nothing on later visits leaves the previous screen up for the
 * moment the cached data takes to return, which is far quieter than a flash of
 * placeholders.
 */
export function FirstVisitOnly({ routeKey, children }: {
  routeKey: string
  children: React.ReactNode
}) {
  const [show] = useState(() => !hasSeen(routeKey))
  return show ? <>{children}</> : null
}

/**
 * Records a visit for routes whose content does not itself animate in — without
 * this their skeleton would never be marked as spent. Renders nothing.
 */
export function MarkVisited() {
  const pathname = usePathname()
  useEffect(() => { markSeen(pathname) }, [pathname])
  return null
}
