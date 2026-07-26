'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import { Project } from '@/app/admin/(portal)/projects/data';

type ViewMode = 'Day' | 'Week' | 'Month';

interface TimelinePerson {
  id: string;
  name: string;
  avatar?: string;
}

interface TimelineTask {
  id: string;
  title: string;
  subtitle: string;
  /** Offsets in days from the start of the timeline range */
  startDay: number;
  endDay: number;
  assignees: TimelinePerson[];
}

interface TimelinePhase {
  id: string;
  name: string;
  startDay: number;
  endDay: number;
  /** Bar background, band background, band text */
  bar: string;
  band: string;
  accent: string;
  rows: TimelineTask[][];
}

const TOTAL_DAYS = 84; // 12 weeks
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Read once at module load — reading the clock during render is impure and can
// place the "today" marker differently on the server than on the client.
const TODAY = Date.now();

const FALLBACK_TEAM: TimelinePerson[] = [
  { id: 'F-1', name: 'J. Martinez', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=80&h=80&fit=crop' },
  { id: 'F-2', name: 'L. Nguyen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop' },
  { id: 'F-3', name: 'C. Reed' },
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseAnchorDate(project?: Project) {
  const raw = project?.details?.startDate ?? project?.start_date;
  const parsed = raw ? new Date(raw) : null;
  const base = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(new Date().getFullYear(), 1, 1);
  // Snap to the Monday of that week so day columns line up with weeks
  const offset = (base.getDay() + 6) % 7;
  return addDays(base, -offset);
}

function buildPhases(team: TimelinePerson[]): TimelinePhase[] {
  const crew = team.length > 0 ? team : FALLBACK_TEAM;
  const pick = (from: number) => [0, 1, 2].map((i) => crew[(from + i) % crew.length]);

  return [
    {
      id: 'phase-1',
      name: 'Phase One',
      startDay: 0,
      endDay: 42,
      bar: 'bg-[#F97316]',
      band: 'bg-[#FFF3E9]',
      accent: 'text-[#F97316]',
      rows: [
        [
          { id: 'p1-t1', title: 'Roofing', subtitle: 'Fixing woods & metals', startDay: 0, endDay: 13, assignees: pick(0) },
          { id: 'p1-t2', title: 'Roofing', subtitle: 'Fixing woods & metals', startDay: 24, endDay: 38, assignees: pick(1) },
        ],
        [
          { id: 'p1-t3', title: 'Roofing', subtitle: 'Fixing woods & metals', startDay: 10, endDay: 28, assignees: pick(2) },
        ],
      ],
    },
    {
      id: 'phase-2',
      name: 'Phase 2',
      startDay: 42,
      endDay: TOTAL_DAYS,
      bar: 'bg-[#9900FF]',
      band: 'bg-[#F6EAFF]',
      accent: 'text-[#9900FF]',
      rows: [
        [
          { id: 'p2-t1', title: 'Installing', subtitle: 'Installing metal sheet', startDay: 42, endDay: 56, assignees: pick(0) },
        ],
        [
          { id: 'p2-t2', title: 'Installing', subtitle: 'Installing metal sheet', startDay: 54, endDay: 78, assignees: pick(1) },
        ],
      ],
    },
  ];
}

function AvatarStack({ people }: { people: TimelinePerson[] }) {
  return (
    <div className="flex items-center -space-x-1.5">
      {people.slice(0, 3).map((person, index) => (
        <div
          key={`${person.id}-${index}`}
          title={person.name}
          className="w-5 h-5 rounded-full ring-2 ring-white/80 overflow-hidden relative bg-white shrink-0"
        >
          {person.avatar ? (
            <Image src={person.avatar} alt={person.name} fill sizes="20px" className="object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-[9px] font-semibold text-gray-700">
              {person.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function TimelineTab({ project }: { project?: Project }) {
  const [view, setView] = useState<ViewMode>('Week');

  const rangeStart = useMemo(() => parseAnchorDate(project), [project]);
  const rangeEnd = useMemo(() => addDays(rangeStart, TOTAL_DAYS), [rangeStart]);

  const team = useMemo<TimelinePerson[]>(
    () =>
      (project?.details?.team ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        avatar: member.avatar,
      })),
    [project]
  );

  const phases = useMemo(() => buildPhases(team), [team]);

  const pct = (day: number) => (day / TOTAL_DAYS) * 100;

  // Top row: month segments across the range
  const months = useMemo(() => {
    const segments: { key: string; label: string; left: number; width: number }[] = [];
    let day = 0;
    while (day < TOTAL_DAYS) {
      const date = addDays(rangeStart, day);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const daysLeft = Math.ceil((monthEnd.getTime() - date.getTime()) / MS_PER_DAY);
      const span = Math.min(daysLeft, TOTAL_DAYS - day);
      segments.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('en-US', { month: 'long' }),
        left: pct(day),
        width: pct(span),
      });
      day += span;
    }
    return segments;
  }, [rangeStart]);

  // Second row: ticks at the selected granularity
  const ticks = useMemo(() => {
    if (view === 'Month') return [];
    if (view === 'Day') {
      return Array.from({ length: TOTAL_DAYS }).map((_, i) => {
        const date = addDays(rangeStart, i);
        return {
          key: `d-${i}`,
          label: `${DAY_INITIALS[date.getDay()]}${date.getDate()}`,
          left: pct(i),
          width: pct(1),
        };
      });
    }
    return Array.from({ length: TOTAL_DAYS / 7 }).map((_, i) => ({
      key: `w-${i}`,
      label: `W${i + 1}`,
      left: pct(i * 7),
      width: pct(7),
    }));
  }, [view, rangeStart]);

  const gridLines = view === 'Month' ? months : ticks;

  const todayOffset = Math.round((TODAY - rangeStart.getTime()) / MS_PER_DAY);
  const showToday = todayOffset >= 0 && todayOffset <= TOTAL_DAYS;

  const minWidth = view === 'Day' ? 3200 : view === 'Week' ? 1000 : 800;

  const rangeLabel = `${rangeStart.toLocaleDateString('en-US', { month: 'long' })} - ${rangeEnd.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })}`;

  const viewIcons: Record<ViewMode, React.ElementType> = {
    Day: CalendarDays,
    Week: CalendarRange,
    Month: CalendarClock,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 m-4 md:m-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Project Timeline (12 Weeks)</h3>

      <div className="rounded-xl border border-gray-100">
        <div className="flex items-center justify-between px-5 py-4">
          <h4 className="text-base font-semibold text-gray-900">{rangeLabel}</h4>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(['Day', 'Week', 'Month'] as ViewMode[]).map((mode) => {
              const Icon = viewIcons[mode];
              return (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                    view === mode ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth }} className="relative">
            {/* Months */}
            <div className="relative h-9 border-t border-gray-100">
              {months.map((month) => (
                <div
                  key={month.key}
                  style={{ left: `${month.left}%`, width: `${month.width}%` }}
                  className="absolute inset-y-0 flex items-center justify-center text-xs font-medium text-gray-500"
                >
                  <span className="truncate px-1">{month.label}</span>
                </div>
              ))}
            </div>

            {/* Ticks */}
            {ticks.length > 0 && (
              <div className="relative h-8 border-t border-gray-100">
                {ticks.map((tick) => (
                  <div
                    key={tick.key}
                    style={{ left: `${tick.left}%`, width: `${tick.width}%` }}
                    className="absolute inset-y-0 flex items-center justify-center text-[11px] text-gray-400"
                  >
                    <span className="truncate px-0.5">{tick.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="relative border-t border-gray-100 pt-4 pb-6">
              {/* Column separators */}
              <div className="absolute inset-0 pointer-events-none">
                {gridLines.map((line) => (
                  <div
                    key={`grid-${line.key}`}
                    style={{ left: `${line.left}%` }}
                    className="absolute top-0 bottom-0 border-l border-gray-100"
                  />
                ))}
              </div>

              {/* Today marker */}
              {showToday && (
                <div
                  style={{ left: `${pct(todayOffset)}%` }}
                  className="absolute top-0 bottom-0 border-l-2 border-indigo-500 z-20 pointer-events-none"
                />
              )}

              <div className="relative z-10 space-y-4">
                {phases.map((phase) => (
                  <div key={phase.id} className="space-y-2">
                    {/* Phase band */}
                    <div className="relative h-7">
                      <div
                        style={{ left: `${pct(phase.startDay)}%`, width: `${pct(phase.endDay - phase.startDay)}%` }}
                        className={`absolute inset-y-0 rounded-md flex items-center gap-1.5 px-3 ${phase.band}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full bg-current ${phase.accent}`} />
                        <span className={`text-xs font-semibold whitespace-nowrap ${phase.accent}`}>{phase.name}</span>
                      </div>
                    </div>

                    {/* Task rows */}
                    {phase.rows.map((row, rowIndex) => (
                      <div key={`${phase.id}-row-${rowIndex}`} className="relative h-16">
                        {row.map((task) => (
                          <div
                            key={task.id}
                            style={{ left: `${pct(task.startDay)}%`, width: `${pct(task.endDay - task.startDay)}%` }}
                            className={`absolute inset-y-0 rounded-lg px-3 py-2 text-white overflow-hidden shadow-sm cursor-pointer transition-all hover:brightness-105 hover:ring-2 ring-white ring-offset-1 ${phase.bar}`}
                          >
                            <h5 className="text-xs font-semibold whitespace-nowrap">{task.title}</h5>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="w-px h-3 bg-white/50 block shrink-0" />
                              <p className="text-[10px] text-white/80 whitespace-nowrap truncate">{task.subtitle}</p>
                            </div>
                            <AvatarStack people={task.assignees} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
