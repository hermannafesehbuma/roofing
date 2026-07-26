'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'
import type { Project, ProjectStatus } from '@/app/admin/(portal)/projects/data'
import { MobilePills } from './MobilePills'

type Filter = 'all' | ProjectStatus

const STATUS_META: Record<ProjectStatus, { label: string; text: string; dot: string; bar: string }> = {
  in_progress: { label: 'In Progress', text: 'text-orange-500', dot: 'bg-orange-500', bar: 'bg-[#0A1629]' },
  completed: { label: 'Completed', text: 'text-emerald-600', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  on_hold: { label: 'On Hold', text: 'text-red-500', dot: 'bg-red-500', bar: 'bg-gray-300' },
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MobileProjectList({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = filter === 'all' ? projects : projects.filter((p) => p.status === filter)

  const options: { value: Filter; label: string }[] = [
    { value: 'all', label: `All (${projects.length})` },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ]

  return (
    <div className="space-y-3">
      <MobilePills options={options} value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No projects here.</p>
      ) : (
        visible.map((project) => {
          const meta = STATUS_META[project.status] ?? STATUS_META.in_progress
          const progress = project.progress ?? 0
          return (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}`}
              className="block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="relative h-32 w-full bg-gray-100">
                {project.image_url ? (
                  <Image
                    src={project.image_url}
                    alt={project.name}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>

              <div className="p-3.5">
                <h3 className="text-sm font-semibold text-gray-900">{project.name}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5 capitalize">
                  {project.type} · {project.location}
                </p>

                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Status:</dt>
                    <dd className={`inline-flex items-center gap-1 font-medium ${meta.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} /> {meta.label}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Manager:</dt>
                    <dd className="font-medium text-gray-900">
                      {project.manager ? `${project.manager.first_name} ${project.manager.last_name}` : 'Unassigned'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Due Date:</dt>
                    <dd className="font-medium text-gray-900">{formatDate(project.due_date)}</dd>
                  </div>
                </dl>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-gray-500">{project.status === 'on_hold' ? 'Paused' : 'Progress'}</span>
                    <span className="font-medium text-gray-900">{progress}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          )
        })
      )}
    </div>
  )
}
