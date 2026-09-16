/**
 * Timezone utilities for OMEGA SPA POS
 * Business Location: Douala, Cameroon
 * Standard Timezone: Africa/Douala (WAT, UTC+1)
 */

export const DOUALA_TIMEZONE = 'Africa/Douala';

/**
 * Returns today's date in Africa/Douala timezone formatted as YYYY-MM-DD
 * @returns {string} e.g. "2026-09-16"
 */
export function getDoualaTodayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DOUALA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Returns the current time in Africa/Douala timezone formatted as HH:mm (24-hour)
 * @returns {string} e.g. "14:30"
 */
export function getDoualaCurrentTimeStr() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DOUALA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/**
 * Format date string (YYYY-MM-DD) for display in Africa/Douala timezone
 * e.g., "Wednesday, 16 Sept 2026"
 * @param {string} dateStr YYYY-MM-DD
 * @returns {string}
 */
export function formatDoualaDateDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  // Using noon UTC ensures no date rollover regardless of browser location
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toLocaleDateString('en-GB', {
    timeZone: DOUALA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * All allowed appointment booking slots between 10:00 AM and 09:00 PM (10:00 - 21:00)
 * 15-minute increments
 */
export const BOOKING_TIME_SLOTS = (() => {
  const slots = [];
  for (let mins = 10 * 60; mins <= 21 * 60; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${time24} (${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period})`;
    slots.push({ value: time24, label });
  }
  return slots;
})();
