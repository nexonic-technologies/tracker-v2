// src/utils/pipelineSanitizer.js
// Enterprise Response Sanitization & Normalization Pipeline.
// Ensures consistent, normalized field aliases, robust date/time formatting,
// and zero-drift contract guarantees across all Populate Engine read operations.

/**
 * Common field aliases mapped across models to prevent frontend/backend mismatch.
 */
const ALIAS_MAP = {
  employeeId: ['employee', 'empIdRef'],
  employee: ['employeeId'],
  departmentId: ['department'],
  department: ['departmentId'],
  designationId: ['designation'],
  designation: ['designationId'],
  managerId: ['reportingManager', 'manager'],
  reportingManager: ['managerId'],
  leaveTypeId: ['leaveType'],
  leaveType: ['leaveTypeId'],
  attendanceId: ['attendance'],
  attendance: ['attendanceId']
};

/**
 * Formats a Date object or ISO string to clean 12-hour time ("hh:mm AM/PM")
 */
function formatTime12h(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
}

/**
 * Formats a Date object or ISO string to standard YYYY-MM-DD
 */
function formatDateYMD(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/**
 * Sanitizes and normalizes a single document.
 *
 * @param {Object} doc - Raw lean document
 * @param {string} modelName - Canonical model name
 * @returns {Object} Enriched, normalized document
 */
function sanitizeSingleDoc(doc, modelName) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc;

  const transformed = { ...doc };

  // 1. Apply Automatic Dual-Direction Field Aliasing
  for (const [primaryKey, aliases] of Object.entries(ALIAS_MAP)) {
    if (transformed[primaryKey] !== undefined) {
      for (const alias of aliases) {
        if (transformed[alias] === undefined) {
          transformed[alias] = transformed[primaryKey];
        }
      }
    }
  }

  // 2. Standardize Attendance and Regularization Time Representations
  if (modelName === 'regularizations' || modelName === 'attendances') {
    const formattedTimes = {};

    if (transformed.checkIn) formattedTimes.checkIn = formatTime12h(transformed.checkIn);
    if (transformed.checkOut) formattedTimes.checkOut = formatTime12h(transformed.checkOut);
    if (transformed.requestedCheckIn) formattedTimes.requestedCheckIn = formatTime12h(transformed.requestedCheckIn);
    if (transformed.requestedCheckOut) formattedTimes.requestedCheckOut = formatTime12h(transformed.requestedCheckOut);
    if (transformed.originalCheckIn) formattedTimes.originalCheckIn = formatTime12h(transformed.originalCheckIn);
    if (transformed.originalCheckOut) formattedTimes.originalCheckOut = formatTime12h(transformed.originalCheckOut);

    transformed._formattedTimes = formattedTimes;
  }

  // 3. Standardize Leave & Request Date Representations
  if (modelName === 'leaves' || modelName === 'wfh_requests' || modelName === 'comp_off_requests') {
    const formattedDates = {};
    if (transformed.startDate) formattedDates.startDate = formatDateYMD(transformed.startDate);
    if (transformed.endDate) formattedDates.endDate = formatDateYMD(transformed.endDate);
    if (transformed.workedDate) formattedDates.workedDate = formatDateYMD(transformed.workedDate);
    transformed._formattedDates = formattedDates;
  }

  return transformed;
}

/**
 * Main Pipeline Sanitizer Entrypoint.
 *
 * @param {Object} params
 * @param {Array|Object} params.data - The data array or object returned from MongoDB
 * @param {string} params.modelName - The model name being read
 * @returns {Array|Object} Sanitized and normalized response
 */
export function pipelineSanitize({ data, modelName }) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((doc) => sanitizeSingleDoc(doc, modelName));
  }

  return sanitizeSingleDoc(data, modelName);
}

export default pipelineSanitize;
