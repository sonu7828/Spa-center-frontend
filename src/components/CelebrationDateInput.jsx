import React, { useMemo } from 'react';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

const MONTHS = [
  { value: '01', name: 'Jan (01)' },
  { value: '02', name: 'Feb (02)' },
  { value: '03', name: 'Mar (03)' },
  { value: '04', name: 'Apr (04)' },
  { value: '05', name: 'May (05)' },
  { value: '06', name: 'Jun (06)' },
  { value: '07', name: 'Jul (07)' },
  { value: '08', name: 'Aug (08)' },
  { value: '09', name: 'Sep (09)' },
  { value: '10', name: 'Oct (10)' },
  { value: '11', name: 'Nov (11)' },
  { value: '12', name: 'Dec (12)' },
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function parseCelebrationParts(val) {
  if (!val) return { day: '', month: '', year: '' };
  const str = String(val).trim().split('T')[0];
  const parts = str.split(/[-/.]/);

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parts[0];
      const m = String(parseInt(parts[1], 10)).padStart(2, '0');
      const d = String(parseInt(parts[2], 10)).padStart(2, '0');
      return {
        day: d,
        month: m,
        year: y === '2000' ? '' : y,
      };
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      const d = String(parseInt(parts[0], 10)).padStart(2, '0');
      const m = String(parseInt(parts[1], 10)).padStart(2, '0');
      const y = parts[2];
      return {
        day: d,
        month: m,
        year: y === '2000' ? '' : y,
      };
    }
  } else if (parts.length === 2) {
    const n1 = parseInt(parts[0], 10);
    const n2 = parseInt(parts[1], 10);
    if (n1 > 12) {
      return {
        day: String(n1).padStart(2, '0'),
        month: String(n2).padStart(2, '0'),
        year: '',
      };
    }
    return {
      month: String(n1).padStart(2, '0'),
      day: String(n2).padStart(2, '0'),
      year: '',
    };
  }

  return { day: '', month: '', year: '' };
}

export function formatCelebrationDisplay(dateVal) {
  if (!dateVal || dateVal === '-' || dateVal === '—') return '—';
  const { day, month, year } = parseCelebrationParts(dateVal);
  if (!day || !month) return '—';

  const mNum = parseInt(month, 10);
  const dNum = parseInt(day, 10);
  if (isNaN(mNum) || isNaN(dNum) || mNum < 1 || mNum > 12) return '—';

  const monthName = MONTH_NAMES_FULL[mNum - 1];
  if (year && year !== '2000') {
    return `${dNum} ${monthName} ${year}`;
  }
  return `${dNum} ${monthName}`;
}

export default function CelebrationDateInput({
  label = 'Birthday Date',
  value = '',
  onChange,
  hint = 'Year is optional. Only day & month needed.',
  className = '',
}) {
  const parts = useMemo(() => parseCelebrationParts(value), [value]);

  const emitChange = (d, m, y) => {
    if (!onChange) return;
    let result = '';
    if (d && m) {
      const yearToUse = y && String(y).length === 4 ? String(y) : '2000';
      result = `${yearToUse}-${m}-${d}`;
    }
    // Support both event-style (e.target.value) and direct value callbacks
    const syntheticEvent = { target: { value: result } };
    try {
      onChange(syntheticEvent);
    } catch {
      onChange(result);
    }
  };

  const handleDayChange = (e) => {
    const newDay = e.target.value;
    emitChange(newDay, parts.month, parts.year);
  };

  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    emitChange(parts.day, newMonth, parts.year);
  };

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    emitChange(parts.day, parts.month, newYear);
  };

  const handleClear = () => {
    emitChange('', '', '');
  };

  const hasSelection = Boolean(parts.day && parts.month);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[13px] font-medium text-muted-gray">
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-sage font-medium hidden sm:inline">
            {hint}
          </span>
        )}
      </div>

      <div className="grid grid-cols-12 gap-2">
        {/* Day Dropdown */}
        <div className="col-span-4">
          <select
            value={parts.day}
            onChange={handleDayChange}
            aria-label={`${label} Day`}
            className="w-full h-[48px] px-2 sm:px-3 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
          >
            <option value="">Day</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {parseInt(d, 10)}
              </option>
            ))}
          </select>
        </div>

        {/* Month Dropdown */}
        <div className="col-span-5">
          <select
            value={parts.month}
            onChange={handleMonthChange}
            aria-label={`${label} Month`}
            className="w-full h-[48px] px-2 sm:px-3 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Year Input (Optional) */}
        <div className="col-span-3">
          <input
            type="number"
            min="1920"
            max={new Date().getFullYear()}
            placeholder="Year (Opt)"
            value={parts.year}
            onChange={handleYearChange}
            aria-label={`${label} Year Optional`}
            className="w-full h-[48px] px-2 sm:px-3 bg-white border border-border rounded-[11px] text-sm text-charcoal placeholder:text-muted-gray/50 outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
          />
        </div>
      </div>

      {/* Preview and quick clear */}
      <div className="mt-1 flex items-center justify-between min-h-[18px] px-1">
        {hasSelection ? (
          <>
            <span className="text-[11px] text-sage font-semibold flex items-center gap-1">
              <span>✓</span> Set: {formatCelebrationDisplay(`${parts.year || '2000'}-${parts.month}-${parts.day}`)}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-muted-gray/70 hover:text-red-500 underline transition-colors"
            >
              Clear
            </button>
          </>
        ) : (
          <span className="text-[11px] text-muted-gray/60 italic">
            Select Day & Month (Year not required)
          </span>
        )}
      </div>
    </div>
  );
}
