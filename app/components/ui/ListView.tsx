'use client';

import { useMemo, useState } from 'react';
import { Project } from '@/app/admin/(portal)/projects/data';
import { ActionsDropdown } from './ActionsDropdown';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ListViewProps {
  projects: Project[];
  onDeleteClick: (project: Project) => void;
  onEditClick: (project: Project) => void;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1632759145355-6b5d27ffc264?w=500&h=300&fit=crop';

const ROWS_PER_PAGE = 10;

const statusConfig = {
  completed:   { label: 'Completed',   pill: 'text-emerald-600 bg-emerald-50', bar: 'bg-emerald-500' },
  in_progress: { label: 'In Progress', pill: 'text-amber-600 bg-amber-50',     bar: 'bg-[#0A1629]'   },
  on_hold:     { label: 'On Hold',     pill: 'text-red-500 bg-red-50',         bar: 'bg-gray-300'    },
} as const;

function formatDueDate(value: string) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Page numbers with an ellipsis in the middle: 1 2 3 … 8 9 10 */
function pageList(total: number, current: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, 2, 3, total - 2, total - 1, total, current]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'ellipsis')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('ellipsis');
    out.push(p);
  });
  return out;
}

export function ListView({ projects, onDeleteClick, onEditClick }: ListViewProps) {
  const router = useRouter();
  const [requestedPage, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const totalPages = Math.max(1, Math.ceil(projects.length / ROWS_PER_PAGE));
  // Filters can shrink the list out from under the current page, so clamp on render.
  const page = Math.min(requestedPage, totalPages);

  const rows = useMemo(
    () => projects.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
    [projects, page]
  );

  const allOnPageSelected = rows.length > 0 && rows.every((p) => selected.includes(p.id));

  const toggleAll = () => {
    setSelected((prev) =>
      allOnPageSelected
        ? prev.filter((id) => !rows.some((p) => p.id === id))
        : [...new Set([...prev, ...rows.map((p) => p.id)])]
    );
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-visible">
      {/* Card title */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-5 shrink-0">
        <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
        <span className="px-2.5 py-1 rounded-full bg-[#F4F3FF] text-[#5B4BC4] text-[11px] font-semibold">
          {projects.length}
        </span>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-y border-gray-100 text-[13px] text-gray-500">
            <th className="pl-6 pr-2 py-3 font-medium w-12">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleAll}
                className="w-[18px] h-[18px] rounded-[5px] border-gray-300 text-[#0A1629] focus:ring-[#0A1629]/30 cursor-pointer"
              />
            </th>
            <th className="px-4 py-3 font-medium min-w-[260px]">Project</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Manager</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium w-[200px]">Progress</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">Due Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right pr-6">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const st = statusConfig[p.status] ?? statusConfig.in_progress;
            return (
              <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors group">
                <td className="pl-6 pr-2 py-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggleOne(p.id)}
                    className="w-[18px] h-[18px] rounded-[5px] border-gray-300 text-[#0A1629] focus:ring-[#0A1629]/30 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 relative bg-gray-200">
                      <Image src={p.image_url || FALLBACK_IMAGE} alt={p.name} fill className="object-cover" sizes="44px" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] text-gray-900 truncate group-hover:text-[#0A1629] transition-colors">{p.name}</div>
                      <div className="text-[13px] text-gray-400 mt-0.5">{p.code}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700 capitalize">{p.type}</td>
                <td className="px-4 py-4 text-[14px] text-gray-700 whitespace-nowrap">
                  {p.manager ? `${p.manager.first_name} ${p.manager.last_name}` : 'Unassigned'}
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700">{p.client?.name || 'No Client'}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-[5px] min-w-[90px]">
                      <div className={`h-[5px] rounded-full ${st.bar}`} style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-[13px] text-gray-500 w-9 text-right shrink-0">{p.progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-[14px] text-gray-700 whitespace-nowrap">{formatDueDate(p.due_date)}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium whitespace-nowrap ${st.pill}`}>
                    {st.label}
                  </span>
                </td>
                <td className="px-4 py-4 pr-6 text-right">
                  <div className="flex justify-end">
                    <ActionsDropdown
                      onDelete={() => onDeleteClick(p)}
                      onEdit={() => onEditClick(p)}
                      onView={() => router.push(`/admin/projects/${p.id}`)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-6 py-16 text-center text-sm text-gray-400">
                No projects match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="mt-auto px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm shrink-0">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex items-center gap-1">
          {pageList(totalPages, page).map((item, i) =>
            item === 'ellipsis' ? (
              <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400">…</span>
            ) : (
              <button
                key={item}
                onClick={() => setPage(item)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  item === page
                    ? 'bg-gray-100 text-gray-900 font-semibold'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:hover:bg-white"
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
