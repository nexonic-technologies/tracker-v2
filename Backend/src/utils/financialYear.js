// src/utils/financialYear.js
//
// Single utility for deriving financial year information from any date.
// Reads the FY start month from general_settings.finance.financialYearStart.
//
// RULE: Never store FY labels ('FY2025-26') on individual documents.
//       Always derive at query time using these helpers.
//
// Usage:
//   import { getFYLabel, getActiveFYRange } from '../utils/financialYear.js';
//
//   const fy = getFYLabel(new Date(), 4);         // → 'FY2025-26'
//   const { start, end } = getActiveFYRange(4);  // → April 1 to March 31

/**
 * Derives the financial year label from any date.
 *
 * @param {Date|string}  date     - The date to classify
 * @param {number}       fyStart  - Month number when FY starts (1=Jan, 4=Apr)
 * @returns {string}              - e.g. 'FY2025-26'
 *
 * Examples (fyStart=4, Indian FY):
 *   2026-03-31  →  'FY2025-26'   (March is still in FY started April 2025)
 *   2026-04-01  →  'FY2026-27'   (April starts new FY)
 */
export function getFYLabel(date, fyStart = 4) {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-indexed
  const year = d.getFullYear();
  const fyStartYear = month >= fyStart ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  return `FY${fyStartYear}-${String(fyEndYear).slice(-2)}`;
}

/**
 * Returns the start and end Date boundaries of the currently active financial year.
 *
 * @param {number} fyStart - Month number when FY starts (default 4 = April)
 * @returns {{ start: Date, end: Date, label: string }}
 */
export function getActiveFYRange(fyStart = 4) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStartYear = month >= fyStart ? year : year - 1;
  const fyEndYear = fyStartYear + 1;

  // Start: first day of FY start month
  const start = new Date(fyStartYear, fyStart - 1, 1);
  start.setHours(0, 0, 0, 0);

  // End: last day of the month before FY start month in the next year
  const end = new Date(fyEndYear, fyStart - 1, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    label: `FY${fyStartYear}-${String(fyEndYear).slice(-2)}`
  };
}

/**
 * Returns FY boundaries for a specific year label like 'FY2025-26'.
 *
 * @param {string} fyLabel  - e.g. 'FY2025-26'
 * @param {number} fyStart  - Month when FY starts (default 4)
 * @returns {{ start: Date, end: Date }}
 */
export function getFYRangeByLabel(fyLabel, fyStart = 4) {
  // Parse 'FY2025-26' → startYear=2025
  const match = fyLabel.match(/^FY(\d{4})-\d{2}$/);
  if (!match) throw new Error(`Invalid FY label format: "${fyLabel}". Expected 'FY2025-26'.`);
  const fyStartYear = parseInt(match[1], 10);
  const fyEndYear = fyStartYear + 1;

  const start = new Date(fyStartYear, fyStart - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(fyEndYear, fyStart - 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Convenience: read fyStart from live general_settings document.
 * Falls back to 4 (April) if settings not found.
 *
 * @returns {Promise<number>}
 */
export async function getFYStartFromSettings() {
  try {
    const { default: general_settings } = await import('../models/general_settings.js');
    const settings = await general_settings.findOne().select('finance.financialYearStart').lean();
    return settings?.finance?.financialYearStart ?? 4;
  } catch {
    return 4; // safe fallback
  }
}
