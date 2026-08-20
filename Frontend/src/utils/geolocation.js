/**
 * Robust Multi-Tier Browser Geolocation Utility
 *
 * Solves common browser issues:
 * 1. High-accuracy GPS timeout on desktop/laptop Wi-Fi networks by automatically falling back to standard accuracy.
 * 2. Caches recent position in-memory / sessionStorage so repeat check-in/punches are instantaneous.
 * 3. Clear distinction between PERMISSION_DENIED (user blocked) vs TIMEOUT / POSITION_UNAVAILABLE (hardware/network delay).
 */

let cachedPosition = null;
let lastAcquiredAt = 0;
const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

export async function getBrowserLocation(options = {}) {
  const {
    timeout = 5000,
    forceFresh = false
  } = options;

  // 1. Check in-memory / session cache if still fresh
  const now = Date.now();
  if (!forceFresh && cachedPosition && (now - lastAcquiredAt < CACHE_LIFETIME_MS)) {
    return {
      location: cachedPosition,
      status: 'CACHED',
      message: 'Cached location used.'
    };
  }

  if (typeof window === 'undefined' || !navigator?.geolocation) {
    return {
      location: cachedPosition || null,
      status: 'UNSUPPORTED',
      message: 'Geolocation is not supported by your browser.'
    };
  }

  // Promise helper for getCurrentPosition
  const fetchPos = (posOptions) => {
    return new Promise((resolve) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          resolve({ success: false, code: 3, message: 'Timeout expired' });
        }
      }, posOptions.timeout + 500);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            const loc = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            };
            cachedPosition = loc;
            lastAcquiredAt = Date.now();
            resolve({ success: true, location: loc });
          }
        },
        (error) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve({
              success: false,
              code: error?.code,
              message: error?.message || 'Location error'
            });
          }
        },
        posOptions
      );
    });
  };

  // Tier 1: Try Standard Accuracy First (fastest & most reliable on all laptops/desktops/Wi-Fi)
  const standardRes = await fetchPos({
    enableHighAccuracy: false,
    timeout: Math.min(timeout, 4000),
    maximumAge: 60000
  });

  if (standardRes.success && standardRes.location) {
    return {
      location: standardRes.location,
      status: 'SUCCESS',
      message: 'Location acquired successfully.'
    };
  }

  // If user explicitly denied permission, return DENIED immediately
  if (standardRes.code === 1 /* PERMISSION_DENIED */) {
    return {
      location: null,
      status: 'DENIED',
      message: 'Location access is blocked. Please enable location permissions for this site in your browser settings.'
    };
  }

  // Tier 2: Try High Accuracy (GPS hardware fix if on mobile device)
  const highRes = await fetchPos({
    enableHighAccuracy: true,
    timeout: Math.min(timeout, 5000),
    maximumAge: 120000
  });

  if (highRes.success && highRes.location) {
    return {
      location: highRes.location,
      status: 'SUCCESS',
      message: 'High accuracy location acquired.'
    };
  }

  if (highRes.code === 1 /* PERMISSION_DENIED */) {
    return {
      location: null,
      status: 'DENIED',
      message: 'Location access is blocked. Please enable location permissions for this site in your browser settings.'
    };
  }

  // Tier 3: If we have an older cached position, return it rather than failing
  if (cachedPosition) {
    return {
      location: cachedPosition,
      status: 'CACHED_FALLBACK',
      message: 'Device location timed out; previous session location used.'
    };
  }

  return {
    location: null,
    status: 'UNAVAILABLE',
    message: 'Location request timed out. Please check your device location services.'
  };
}

/**
 * Returns clean { latitude, longitude } or null.
 */
export async function getCoords(options = {}) {
  const res = await getBrowserLocation(options);
  return res.location ? { latitude: res.location.latitude, longitude: res.location.longitude } : null;
}

export default getBrowserLocation;
