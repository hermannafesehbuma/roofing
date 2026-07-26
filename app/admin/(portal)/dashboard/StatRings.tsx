'use client'

import { useRevealOnScroll } from './useRevealOnScroll'

const RING_BOX = 150
const RING_C = RING_BOX / 2
const RING_SWEEP_MS = 1100
const RING_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: RING_C + r * Math.cos(a), y: RING_C + r * Math.sin(a) }
}

function arc(r: number, startDeg: number, endDeg: number) {
  const sweep = endDeg - startDeg
  if (sweep <= 0) return ''
  // a full sweep can't be expressed as one arc — nudge the endpoint closed
  if (sweep >= 359.99) return `M ${RING_C} ${RING_C - r} A ${r} ${r} 0 1 1 ${RING_C - 0.01} ${RING_C - r}`
  const s = polar(r, startDeg)
  const e = polar(r, endDeg)
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x} ${e.y}`
}

/** Length of an arc of radius `r` spanning `sweepDeg`, used to seed the draw. */
function arcLength(r: number, sweepDeg: number) {
  return (Math.min(sweepDeg, 360) * Math.PI * r) / 180
}

/**
 * Dash the arc by its own length and hold it fully offset until revealed, so the
 * transition draws it on. Mirrors how the bar charts animate, which means it
 * runs after hydration rather than during first paint where it can go unseen.
 */
function drawStyle(len: number, revealed: boolean, durMs: number, delayMs = 0): React.CSSProperties {
  return {
    strokeDasharray: len,
    strokeDashoffset: revealed ? 0 : len,
    transition: `stroke-dashoffset ${Math.round(durMs)}ms ${RING_EASE} ${Math.round(delayMs)}ms`,
  }
}

function RingCenter({ value, caption }: { value: string; caption: string }) {
  return (
    <>
      <text x={RING_C} y={RING_C - 1} textAnchor="middle" fontSize="17" fontWeight="600" fill="#111827">{value}</text>
      <text x={RING_C} y={RING_C + 13} textAnchor="middle" fontSize="9" fill="#9CA3AF">{caption}</text>
    </>
  )
}

function RingSvg({ svgRef, children }: { svgRef: React.Ref<SVGSVGElement>; children: React.ReactNode }) {
  return (
    <svg ref={svgRef} width={RING_BOX} height={RING_BOX} viewBox={`0 0 ${RING_BOX} ${RING_BOX}`} className="shrink-0">
      {children}
    </svg>
  )
}

/** Single progress arc on a light track — "Budget Used". */
export function ProgressRing({ pct, color, value, caption }: { pct: number; color: string; value: string; caption: string }) {
  const { ref, revealed } = useRevealOnScroll<SVGSVGElement>()
  const r = 55
  const sweep = (pct / 100) * 360
  return (
    <RingSvg svgRef={ref}>
      <circle cx={RING_C} cy={RING_C} r={r} fill="none" stroke="#EEF0F3" strokeWidth="15" />
      <path
        className="motion-reduce:transition-none"
        style={drawStyle(arcLength(r, sweep), revealed, RING_SWEEP_MS)}
        d={arc(r, 0, sweep)}
        fill="none"
        stroke={color}
        strokeWidth="15"
        strokeLinecap="round"
      />
      <RingCenter value={value} caption={caption} />
    </RingSvg>
  )
}

/** Proportional segments filling the whole circle — "Invoiced / Paid". */
export function SplitRing({ segments, value, caption }: { segments: { value: number; color: string }[]; value: string; caption: string }) {
  const { ref, revealed } = useRevealOnScroll<SVGSVGElement>()
  const r = 55
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  // Segments run edge to edge; their round caps overlap at each join, which reads
  // as one continuous ring rather than separated arcs.
  const arcs = segments.reduce<{ color: string; from: number; to: number }[]>((acc, s) => {
    const from = acc.length ? acc[acc.length - 1].to : 0
    return [...acc, { color: s.color, from, to: from + (s.value / total) * 360 }]
  }, [])
  return (
    <RingSvg svgRef={ref}>
      <circle cx={RING_C} cy={RING_C} r={r} fill="none" stroke="#EEF0F3" strokeWidth="15" />
      {arcs.map((a) => {
        const sweep = a.to - a.from
        if (sweep <= 0) return null
        return (
          <path
            key={a.color}
            className="motion-reduce:transition-none"
            // each segment draws as the sweep reaches it, so the ring fills as one pass
            style={drawStyle(
              arcLength(r, sweep),
              revealed,
              (sweep / 360) * RING_SWEEP_MS,
              (a.from / 360) * RING_SWEEP_MS,
            )}
            d={arc(r, a.from, a.to)}
            fill="none"
            stroke={a.color}
            strokeWidth="15"
            strokeLinecap="round"
          />
        )
      })}
      <RingCenter value={value} caption={caption} />
    </RingSvg>
  )
}

/** Concentric radial bars, one per series — "Compliance Metrics". */
export function MultiRing({ rings, value, caption }: { rings: { pct: number; color: string; track: string }[]; value: string; caption: string }) {
  const { ref, revealed } = useRevealOnScroll<SVGSVGElement>()
  return (
    <RingSvg svgRef={ref}>
      {rings.map((ring, i) => {
        const r = 62 - i * 13
        const sweep = (ring.pct / 100) * 360
        return (
          <g key={ring.color}>
            <circle cx={RING_C} cy={RING_C} r={r} fill="none" stroke={ring.track} strokeWidth="9" />
            <path
              className="motion-reduce:transition-none"
              style={drawStyle(arcLength(r, sweep), revealed, RING_SWEEP_MS, i * 120)}
              d={arc(r, 0, sweep)}
              fill="none"
              stroke={ring.color}
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>
        )
      })}
      <RingCenter value={value} caption={caption} />
    </RingSvg>
  )
}
