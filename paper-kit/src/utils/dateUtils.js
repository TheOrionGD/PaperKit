/* dateUtils.js — Centralized date and timestamp formatting for PaperKit */

/**
 * Parses a date input into a valid Date object.
 * Handles ISO strings with/without 'Z', timestamp numbers, and Date objects.
 */
export function parseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  if (typeof dateInput === 'number') {
    // If seconds timestamp, convert to ms
    const ms = dateInput < 1e11 ? dateInput * 1000 : dateInput;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof dateInput === 'string') {
    let str = dateInput.trim();
    if (!str) return null;
    // Add Z for ISO strings without timezone offset if needed
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
      str = `${str}Z`;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Formats date into relative time string ("Just now", "5m ago", "2h ago", "Yesterday", "3d ago")
 * or standard localized date string.
 */
export function formatFileTimestamp(dateInput, { relative = true, includeTime = false } = {}) {
  const date = parseDate(dateInput);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Future dates or less than 1 second
  if (diffMs < 1000) return 'Just now';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (relative) {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
  }

  // Formatting standard date/time
  if (includeTime) {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats date to a detailed date-time string (e.g. "Aug 21, 2026, 12:38 PM")
 */
export function formatDateTime(dateInput) {
  return formatFileTimestamp(dateInput, { relative: false, includeTime: true }) || '—';
}
