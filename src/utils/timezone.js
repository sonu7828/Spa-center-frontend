/**
 * OMEGA SPA POS — Cameroon (Africa/Douala) Timezone Utilities
 * Project location: Douala, Cameroon (WAT, UTC+01:00)
 */

export const COMPANY_TIMEZONE = 'Africa/Douala';

/**
 * Returns today's date string YYYY-MM-DD in Cameroon (Africa/Douala)
 */
export function getCompanyTodayDateStr(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COMPANY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Returns current time "HH:mm" in 24-hour format in Cameroon (Africa/Douala)
 */
export function getCompanyCurrentTimeStr(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: COMPANY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Formats a Date or ISO string into 12-hour AM/PM format in Cameroon (Africa/Douala)
 * e.g. "09:30 AM"
 */
export function formatCompanyTime(dateOrIso) {
  if (!dateOrIso) return null;
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-US', {
    timeZone: COMPANY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a Date or ISO string into 24-hour "HH:mm" in Cameroon (Africa/Douala)
 */
export function formatCompanyTime24(dateOrIso) {
  if (!dateOrIso) return '';
  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: COMPANY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Converts a formatted 12-hour or 24-hour time or ISO date string to "HH:mm" in Cameroon timezone.
 */
export function parseToCompany24Hour(formattedTime, rawDate) {
  // Priority 1: If rawDate (UTC ISO string) exists, format directly in Cameroon time
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const str24 = formatCompanyTime24(d);
        if (str24) return str24;
      }
    } catch {
      // fallback
    }
  }

  // Priority 2: Parse formatted string (e.g. "11:15 AM", "11:15", with standard or narrow space)
  if (typeof formattedTime === 'string') {
    const trimmed = formattedTime.trim();
    // 12-hour AM/PM format (e.g., "06:57 PM", "6:57 PM", "11:15 AM")
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const meridiem = ampmMatch[3].toUpperCase();
      if (meridiem === 'PM' && h < 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    }
    // 24-hour military format (e.g., "18:57")
    const militaryMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (militaryMatch) {
      const h = parseInt(militaryMatch[1], 10);
      const m = militaryMatch[2];
      if (h >= 0 && h < 24) {
        return `${String(h).padStart(2, '0')}:${m}`;
      }
    }
  }

  return '';
}

/**
 * Formats a date string (YYYY-MM-DD) into display string e.g. "17 Sep 2026"
 * Prevents timezone offset day shifts.
 */
export function formatCompanyDateDisplay(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length === 3) {
    const d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return dateStr;
}

/**
 * Calculates duration in minutes and formats as "Xh Ym"
 */
export function calculateDurationFromTimestamps(clockIn, clockOut, fallbackWorkingHours) {
  if (clockIn && clockOut) {
    const inMs = new Date(clockIn).getTime();
    const outMs = new Date(clockOut).getTime();
    if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
      const diffMinutes = Math.max(0, Math.round((outMs - inMs) / 60000));
      const h = Math.floor(diffMinutes / 60);
      const m = diffMinutes % 60;
      return `${h}h ${m}m`;
    }
  }
  if (fallbackWorkingHours) {
    return fallbackWorkingHours;
  }
  return null;
}
