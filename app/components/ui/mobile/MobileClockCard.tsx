'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import {
  createTimeEntry,
  updateTimeEntry,
  type TimeEntryRow,
} from '@/app/admin/(portal)/time-tracking/actions'

/**
 * Seconds since the epoch, ticking once a second. Read through
 * `useSyncExternalStore` so the clock stays out of the render path — the
 * server snapshot is 0, which renders 00:00:00 and avoids a hydration
 * mismatch against whatever time the client happens to mount at.
 */
function useNowSeconds() {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 1000)
      return () => clearInterval(id)
    },
    () => Math.floor(Date.now() / 1000),
    () => 0
  )
}

function secondsSinceClockIn(entry: TimeEntryRow, nowSeconds: number) {
  if (!nowSeconds) return 0
  const started = new Date(`${entry.date}T${entry.clock_in}`).getTime() / 1000
  if (Number.isNaN(started)) return 0
  return Math.max(0, Math.floor(nowSeconds - started))
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function localDateKey(date = new Date()) {
  return date.toLocaleDateString('en-CA')
}

function currentTime(date = new Date()) {
  return date.toTimeString().slice(0, 8)
}

export function MobileClockCard({
  userId,
  projects,
  openEntry,
  onChanged,
  compact = false,
}: {
  userId: string
  projects: { id: string; name: string }[]
  /** The technician's clock-in for today that has no clock-out yet. */
  openEntry: TimeEntryRow | null
  onChanged: () => void
  compact?: boolean
}) {
  const [projectId, setProjectId] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState(openEntry?.note ?? '')
  const [showNote, setShowNote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const nowSeconds = useNowSeconds()
  const elapsed = openEntry ? secondsSinceClockIn(openEntry, nowSeconds) : 0
  const clockedIn = Boolean(openEntry)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  function handleClockIn() {
    if (!userId) { setError('No signed-in user found.'); return }
    setError(null)
    startTransition(async () => {
      const res = await createTimeEntry({
        user_id: userId,
        project_id: projectId || null,
        date: localDateKey(),
        clock_in: currentTime(),
        clock_out: null,
        status: 'pending',
        note: null,
        location: location || null,
      })
      if ('error' in res && res.error) { setError(res.error); return }
      onChanged()
    })
  }

  function handleClockOut() {
    if (!openEntry) return
    setError(null)
    startTransition(async () => {
      const res = await updateTimeEntry(openEntry.id, {
        clock_out: currentTime(),
        note: note || null,
      })
      if ('error' in res && res.error) { setError(res.error); return }
      setShowNote(false)
      onChanged()
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-col items-center gap-1">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            clockedIn ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${clockedIn ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {clockedIn ? 'Clocked In' : 'Not Clocked In'}
        </span>
        <p className={`text-3xl font-semibold tabular-nums ${clockedIn ? 'text-emerald-600' : 'text-gray-900'}`}>
          {formatDuration(elapsed)}
        </p>
        {!compact && <p className="text-[11px] text-gray-400">{today}</p>}
      </div>

      {!compact && !clockedIn && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white"
            >
              <option value="">Project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Location/Site</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800"
            />
          </div>
        </div>
      )}

      {!compact && clockedIn && (
        <div className="mt-4 space-y-3">
          {openEntry?.project_name && (
            <p className="text-sm font-medium text-gray-900">{openEntry.project_name}</p>
          )}
          {openEntry?.location && (
            <p className="text-xs text-gray-500">{openEntry.location}</p>
          )}

          {showNote ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-gray-500">Notes</label>
                <button onClick={() => setShowNote(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="What did you work on?"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 resize-none"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNote(true)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {note ? 'Edit Note' : 'Add Note'}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 mt-3 text-center">{error}</p>}

      <button
        onClick={clockedIn ? handleClockOut : handleClockIn}
        disabled={isPending}
        className={`w-full mt-4 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
          clockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
        }`}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : clockedIn ? <X size={15} /> : <Plus size={15} />}
        {clockedIn ? 'Clock Out' : 'Clock In'}
      </button>
    </div>
  )
}
