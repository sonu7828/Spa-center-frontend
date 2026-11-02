import React, { useState, useEffect } from 'react';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

const MONTHS = [
  { value: '01', name: 'January (01)' },
  { value: '02', name: 'February (02)' },
  { value: '03', name: 'March (03)' },
  { value: '04', name: 'April (04)' },
  { value: '05', name: 'May (05)' },
  { value: '06', name: 'June (06)' },
  { value: '07', name: 'July (07)' },
  { value: '08', name: 'August (08)' },
  { value: '09', name: 'September (09)' },
  { value: '10', name: 'October (10)' },
  { value: '11', name: 'November (11)' },
  { value: '12', name: 'December (12)' },
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
  hint = 'Only day & month needed',
  className = '',
}) {
  const initialParts = parseCelebrationParts(value);
  const [day, setDay] = useState(initialParts.day || '');
  const [month, setMonth] = useState(initialParts.month || '');
  const [year, setYear] = useState(initialParts.year || '');
  const [showYear, setShowYear] = useState(Boolean(initialParts.year));

  // Sync internal state when value prop changes (e.g. form load, modal open)
  useEffect(() => {
    const p = parseCelebrationParts(value);
    setDay(p.day || '');
    setMonth(p.month || '');
    setYear(p.year || '');
    if (p.year) {
      setShowYear(true);
    }
  }, [value]);

  const notify = (newDay, newMonth, newYear) => {
    if (!onChange) return;
    let result = '';
    if (newDay && newMonth) {
      const y = newYear && String(newYear).length === 4 ? String(newYear) : '2000';
      result = `${y}-${newMonth}-${newDay}`;
    }
    const syntheticEvent = { target: { value: result } };
    try {
      onChange(syntheticEvent);
    } catch {
      onChange(result);
    }
  };

  const handleDayChange = (e) => {
    const val = e.target.value;
    setDay(val);
    notify(val, month, year);
  };

  const handleMonthChange = (e) => {
    const val = e.target.value;
    setMonth(val);
    notify(day, val, year);
  };

  const handleYearChange = (e) => {
    const val = e.target.value;
    setYear(val);
    notify(day, month, val);
  };

  const handleClear = () => {
    setDay('');
    setMonth('');
    setYear('');
    setShowYear(false);
    notify('', '', '');
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[13px] font-medium text-muted-gray">
          {label}
        </label>
        {hint && (
          <span className="text-[11px] text-sage font-medium">
            {hint}
          </span>
        )}
      </div>

      {/* 2 Clean Side-by-Side Selects: Day (50%) & Month (50%) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <select
            value={day}
            onChange={handleDayChange}
            aria-label={`${label} Day`}
            className="w-full h-[48px] px-3 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer"
          >
            <option value="">Day</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {parseInt(d, 10)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={month}
            onChange={handleMonthChange}
            aria-label={`${label} Month`}
            className="w-full h-[48px] px-3 bg-white border border-border rounded-[11px] text-sm text-charcoal outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors cursor-pointer"
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional Year Input (Visible only if user clicks + Year or year already exists) */}
      {showYear && (
        <div className="mt-2">
          <input
            type="number"
            min="1920"
            max={new Date().getFullYear()}
            placeholder="Birth Year (Optional, e.g. 1995)"
            value={year}
            onChange={handleYearChange}
            aria-label={`${label} Year`}
            className="w-full h-[44px] px-3 bg-white border border-border rounded-[11px] text-sm text-charcoal placeholder:text-muted-gray/50 outline-none focus:border-sage focus:ring-1 focus:ring-sage/30 transition-colors"
          />
        </div>
      )}

      {/* Helper Footer */}
      <div className="mt-1.5 flex items-center justify-between text-xs px-1 min-h-[18px]">
        {day && month ? (
          <span className="text-sage font-medium flex items-center gap-1">
            <span>✓</span> {formatCelebrationDisplay(`${year || '2000'}-${month}-${day}`)}
          </span>
        ) : (
          <span className="text-muted-gray/70 text-[11px]">
            No year needed — pick Day & Month
          </span>
        )}

        <div className="flex items-center gap-2">
          {!showYear && (
            <button
              type="button"
              onClick={() => setShowYear(true)}
              className="text-[11px] text-muted-gray hover:text-charcoal underline transition-colors"
            >
              + Year
            </button>
          )}
          {(day || month || year) && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-red-500 hover:text-red-700 underline transition-colors ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
