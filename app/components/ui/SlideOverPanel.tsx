'use client'

import { useSlideOver } from './useSlideOver'

/**
 * The portal's right-hand panel: dimmed backdrop, a white sheet flush to the
 * right edge, and the shared enter/exit animation.
 *
 * Mount it conditionally — `{open && <SlideOverPanel …>}` — so each opening
 * gets a fresh animation cycle. Pass children as a function to get hold of
 * `close`, which plays the exit before handing back to `onClose`:
 *
 *   <SlideOverPanel onClose={() => setSelected(null)} width="w-[900px]">
 *     {close => <button onClick={close}>×</button>}
 *   </SlideOverPanel>
 */
export function SlideOverPanel({ onClose, width = 'w-[640px]', children }: {
  onClose: () => void
  /** Panel width class; it is capped at the viewport regardless. */
  width?: string
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
}) {
  const { close, backdropCls, panelCls } = useSlideOver(onClose)

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-[100] backdrop-blur-[1px] ${backdropCls}`}
        onClick={close}
      />
      <div className="fixed inset-y-0 right-0 z-[101] flex">
        {/* `relative` so a panel can host its own nested overlay. */}
        <div className={`relative bg-white ${width} max-w-full h-full flex flex-col shadow-2xl ${panelCls}`}>
          {typeof children === 'function' ? children(close) : children}
        </div>
      </div>
    </>
  )
}
