// Calendar Date Utilities
// Centralized date normalization helpers to prevent timezone and parsing bugs

/**
 * Normalize date input to YYYY-MM-DD string format
 * Handles Date objects, ISO strings, and YYYY-MM-DD strings
 * Always uses local date components to avoid timezone shifts
 * @param {Date|string} dateInput - Date object or string
 * @returns {string|null} YYYY-MM-DD format string or null
 */
export function normalizeDateInputToYMD(dateInput) {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    const d = new Date(dateInput.getTime());
    d.setHours(0, 0, 0, 0); // Ensure local midnight
    return d.toISOString().split('T')[0]; // Safe because created at local midnight
  }
  
  if (typeof dateInput === 'string') {
    const s = dateInput.trim();
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    
    // Otherwise, build local midnight date
    const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return null;
}

/**
 * Format Date object to YYYY-MM-DD string for input fields
 * Uses local date components, not UTC
 * @param {Date} date - Date object
 * @returns {string|null} YYYY-MM-DD format string or null
 */
export function formatDateForInput(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);
  d.setHours(0, 0, 0, 0); // Ensure local midnight
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalize date input to Date object at local midnight
 * @param {Date|string} dateInput - Date object or string
 * @returns {Date|null} Date object at local midnight or null
 */
export function normalizeDateToDateObject(dateInput) {
  const ymd = normalizeDateInputToYMD(dateInput);
  return ymd ? new Date(ymd + 'T00:00:00') : null;
}

