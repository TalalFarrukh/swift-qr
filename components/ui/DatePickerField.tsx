'use client';

import { useRef, useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromYYYYMMDD(s: string): Date | undefined {
  if (!s || s.length < 10) return undefined;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? undefined : date;
}

interface DatePickerFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatePickerField({ id, label, value, onChange, placeholder = 'Pick a date' }: DatePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => fromYYYYMMDD(value) ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = fromYYYYMMDD(value);

  useEffect(() => {
    const d = fromYYYYMMDD(value);
    if (d) setMonth(d);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(toYYYYMMDD(date));
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          readOnly
          value={value || ''}
          placeholder={placeholder}
          onClick={() => setIsOpen(true)}
          className="w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(true)}
          aria-label="Open calendar"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-border bg-card p-2 shadow-md">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              month={month}
              onMonthChange={setMonth}
              defaultMonth={selectedDate ?? month}
            />
          </div>
        )}
      </div>
    </div>
  );
}
