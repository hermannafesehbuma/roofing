'use client';

import React from 'react';
import { SearchableSelect } from './SearchableSelect';

export interface PersonOption {
  id: string;
  name: string;
  /** Role, job title, department — whatever identifies them at a glance. */
  title?: string | null;
  avatarUrl?: string | null;
}

interface PersonSelectProps {
  people: PersonOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Message shown when there is nobody to pick, so the field never looks broken. */
  emptyHint?: string;
  disabled?: boolean;
}

/**
 * The one control for choosing a person anywhere in the app — searchable, with
 * each option showing a photo (or initials) plus their role.
 *
 * Every screen used to roll its own bare `<select>` of names; this keeps the
 * picker identical whether you are assigning a task, logging hours, or billing
 * a client.
 */
export function PersonSelect({
  people,
  value,
  onChange,
  placeholder = 'Select Employee',
  emptyHint,
  disabled,
}: PersonSelectProps) {
  return (
    <>
      <SearchableSelect
        options={people.map((p) => ({
          id: p.id,
          label: p.name,
          sublabel: p.title ?? undefined,
          avatarUrl: p.avatarUrl,
        }))}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder="Search"
        disabled={disabled}
      />
      {people.length === 0 && emptyHint && (
        <p className="text-[11px] text-amber-600 mt-1.5">{emptyHint}</p>
      )}
    </>
  );
}
