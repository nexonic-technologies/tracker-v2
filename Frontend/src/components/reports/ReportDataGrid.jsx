import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, FileSpreadsheet, Mail, MapPin, ExternalLink } from 'lucide-react';

// In-memory reverse geocoding cache for fast location lookups
const locationCache = new Map();

/**
 * 2026-Grade Dynamic Location Resolver Cell
 * Asynchronously resolves lat/lng coordinates into a human-readable city/region name
 * and renders an interactive Google Maps hyperlink badge.
 */
function DynamicLocationCell({ lat, lng }) {
  const cacheKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
  const [locationName, setLocationName] = useState(() => locationCache.get(cacheKey) || null);

  useEffect(() => {
    if (!lat || !lng) return;
    if (locationCache.has(cacheKey)) {
      setLocationName(locationCache.get(cacheKey));
      return;
    }

    let isMounted = true;
    const fetchUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    fetch(fetchUrl, { headers: { 'Accept-Language': 'en' } })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.suburb || addr.state_district;
        const state = addr.state;
        const resolved = city && state ? `${city}, ${state}` : city || `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
        locationCache.set(cacheKey, resolved);
        setLocationName(resolved);
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
        locationCache.set(cacheKey, fallback);
        setLocationName(fallback);
      });

    return () => { isMounted = false; };
  }, [lat, lng, cacheKey]);

  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${lat}, ${lng} on Google Maps`}
      className="inline-flex items-center gap-1.5 font-medium text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/20 hover:underline transition-all cursor-pointer group"
    >
      <MapPin className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
      <span>{locationName || 'Resolving location...'}</span>
      <ExternalLink className="w-3 h-3 text-blue-400/80 opacity-70" />
    </a>
  );
}

/**
 * 2026-Grade Object Flattener & Column Normalizer
 * Flattens nested MongoDB document objects into clean, human-readable tabular rows.
 */
function flattenDoc(obj, prefix = '') {
  let result = {};
  if (!obj || typeof obj !== 'object') return result;

  for (const [key, val] of Object.entries(obj)) {
    // Exclude internal database metadata noise
    if (['_id', '__v', 'password', 'isDeleted', 'deletedAt', 'policyAssignments'].includes(key)) continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (val === null || val === undefined) {
      result[fullKey] = '-';
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        result[fullKey] = '-';
      } else {
        const itemStr = val
          .map(item => {
            if (typeof item === 'object' && item !== null) {
              if (item.checkIn || item.checkOut) {
                const inTime = item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const outTime = item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                if (inTime && outTime) return `${inTime} - ${outTime}`;
                if (inTime) return `In: ${inTime}`;
                if (outTime) return `Out: ${outTime}`;
              }
              if (item.firstName || item.lastName) return `${item.firstName || ''} ${item.lastName || ''}`.trim();
              if (item.name || item.title || item.label) return item.name || item.title || item.label;
              return '';
            }
            return item;
          })
          .filter(Boolean)
          .join(' | ');
        result[fullKey] = itemStr || '-';
      }
    } else if (typeof val === 'object' && !(val instanceof Date)) {
      // Populated person or entity reference
      if (val.firstName || val.lastName) {
        result[fullKey] = `${val.firstName || ''} ${val.lastName || ''}`.trim();
      } else if (val.name || val.title) {
        result[fullKey] = val.name || val.title;
      } else {
        Object.assign(result, flattenDoc(val, fullKey));
      }
    } else if (typeof val === 'boolean') {
      result[fullKey] = val ? 'Yes' : 'No';
    } else {
      result[fullKey] = val;
    }
  }

  return result;
}

/**
 * Clean Column Header Label Formatter
 */
function formatHeaderLabel(key) {
  const parts = key.split('.');
  const last = parts[parts.length - 1];
  return last
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b(id|empId)\b/gi, match => match.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Cell Value Renderer with 2026-Grade Semantic Badges
 */
function renderCellValue(key, val, row = {}) {
  if (val === null || val === undefined || val === '') return <span className="text-slate-400 dark:text-slate-600">-</span>;

  // Handle consolidated location coordinate objects
  if (key === 'location' && typeof val === 'object' && val.lat && val.lng) {
    return <DynamicLocationCell lat={val.lat} lng={val.lng} />;
  }

  const keyLower = key.toLowerCase();
  const valStr = String(val);

  // Status Badge Rendering
  if (keyLower.includes('status') || keyLower.includes('isactive')) {
    const isSuccess = ['active', 'present', 'approved', 'completed', 'yes', 'true'].includes(valStr.toLowerCase());
    const isWarning = ['pending', 'in progress', 'verification pending', 'documents pending'].includes(valStr.toLowerCase());
    const isDanger = ['inactive', 'absent', 'rejected', 'cancelled', 'overdue', 'no', 'false'].includes(valStr.toLowerCase());

    return (
      <span
        className={`px-2.5 py-1 text-[11px] font-bold rounded-full border inline-flex items-center gap-1 ${
          isSuccess
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
            : isWarning
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
            : isDanger
            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
            : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : isDanger ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
        {valStr}
      </span>
    );
  }

  // Date Formatting
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
          {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      );
    }
  }

  // Email Formatting (Clickable mailto Hyperlink)
  if (keyLower.includes('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
    return (
      <a
        href={`mailto:${valStr}`}
        className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline transition-colors cursor-pointer"
      >
        <Mail className="w-3.5 h-3.5 text-blue-500/70" />
        {valStr}
      </a>
    );
  }

  // Latitude / Longitude Fallback Location Formatting (Clickable Google Maps Hyperlink)
  if (keyLower.includes('latitude') || keyLower.includes('longitude')) {
    const lat = keyLower.includes('latitude') ? valStr : (row?.latitude || row?.['location.latitude'] || '');
    const lng = keyLower.includes('longitude') ? valStr : (row?.longitude || row?.['location.longitude'] || '');
    if (lat && lng) {
      return <DynamicLocationCell lat={lat} lng={lng} />;
    }
  }

  // ID / EmpID Code Formatting
  if (keyLower.includes('id') || keyLower.includes('code')) {
    return <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-semibold">{valStr}</span>;
  }

  return <span className="text-slate-800 dark:text-slate-200 font-medium">{valStr}</span>;
}

export default function ReportDataGrid({ loading, error, data = [] }) {
  // Process raw backend data into clean flattened rows & columns
  const { flattenedRows, columns } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { flattenedRows: [], columns: [] };
    }

    let rows = data.map(row => flattenDoc(row));

    // Consolidate raw latitude/longitude columns into a unified dynamic location object
    rows = rows.map(r => {
      const lat = r.latitude || r['location.latitude'];
      const lng = r.longitude || r['location.longitude'];

      if (lat && lng) {
        const cleaned = { ...r };
        delete cleaned.latitude;
        delete cleaned.longitude;
        delete cleaned['location.latitude'];
        delete cleaned['location.longitude'];
        cleaned.location = { lat, lng };
        return cleaned;
      }
      return r;
    });

    const colSet = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => colSet.add(k)));

    // Reorder columns so primary identifiers appear first
    const allCols = Array.from(colSet);
    const priorityCols = allCols.filter(c => /empId|firstName|lastName|name|title|department|designation|status|location/i.test(c));
    const otherCols = allCols.filter(c => !priorityCols.includes(c));
    const sortedCols = [...priorityCols, ...otherCols];

    return { flattenedRows: rows, columns: sortedCols };
  }, [data]);

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></span>
          Compiling report dataset via populate pipeline...
        </div>
      ) : error ? (
        <div className="p-6 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      ) : flattenedRows.length === 0 ? (
        <div className="p-12 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
          <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          No records found for the selected department & report scope.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-10 text-center text-slate-400 dark:text-slate-500 font-mono">#</th>
                {columns.map(col => (
                  <th key={col} className="p-3 font-mono text-[11px] whitespace-nowrap">
                    {formatHeaderLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {flattenedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                  {columns.map(col => (
                    <td key={col} className="p-3 whitespace-nowrap">
                      {renderCellValue(col, row[col], row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
