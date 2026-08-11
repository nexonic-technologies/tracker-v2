import axios from "axios";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

let authContextLogout = null;
let maintenanceHandler = null;  // set by App.jsx to avoid circular import
let failedRequestCount = 0;
const MAX_FAILED_REQUESTS = 5;

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Called by App.jsx on mount — passes a fn(message, scheduledEnd) that
 * shows the MaintenancePage overlay via React state.
 */
export const setMaintenanceHandler = (fn) => {
  maintenanceHandler = fn;
};

const isDev = import.meta.env.DEV;
const baseUrl = import.meta.env.VITE_APP_URL;

export const setAuthLogout = (logoutFn) => {
  authContextLogout = logoutFn;
};

const resetFailedCount = () => {
  failedRequestCount = 0;
};

const incrementFailedCount = async () => {
  failedRequestCount++;

  if (failedRequestCount >= MAX_FAILED_REQUESTS) {
    await forceLogout();
  }
};

const forceLogout = async () => {
  try {
    // Call logout API
    await axios.post(`${baseUrl}/api/auth/logout`, {}, {
      headers: {
        'x-device-uuid': getDeviceUUID(),
        'Authorization': `Bearer ${Cookies.get('auth_token') || localStorage.getItem('auth_token')}`
      },
      withCredentials: true
    });
  } catch (error) {
    // console.log("Logout API failed:", error);
  }

  // Clear cookies and localStorage
  Cookies.remove("auth_token");
  Cookies.remove("refresh_token");
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('device_uuid');
  localStorage.removeItem('x-tenant-id');
  localStorage.removeItem('x-tenant-slug');

  // Reset counter
  failedRequestCount = 0;

  // Call auth context logout
  if (authContextLogout) {
    authContextLogout(true);
  } else if (typeof window !== 'undefined') {
    window.location.href = "/login";
  }
};

const axiosInstance = axios.create({
  baseURL: isDev ? '/api' : `${baseUrl}/api`,
  timeout: 100000,
  withCredentials: true,
});

// Generate or get device UUID
// Only auto-generate if user is logged in (has auth token)
const getSecureRandomSuffix = (length = 9) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = new Uint8Array(length);
  window.crypto.getRandomValues(randomBytes);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
};

const getDeviceUUID = () => {
  let uuid = localStorage.getItem('device_uuid');

  // Check if user is logged in
  const hasAuthToken = localStorage.getItem('auth_token') || Cookies.get('auth_token');

  if (!uuid && hasAuthToken) {
    // Only generate new UUID if user is authenticated
    uuid = 'web_' + Date.now() + '_' + getSecureRandomSuffix(9);
    localStorage.setItem('device_uuid', uuid);
  }

  return uuid || '';
};

// Request interceptor - add auth token and content-type
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token from cookies or localStorage
    let token = Cookies.get('auth_token');
    if (!token) {
      token = localStorage.getItem('auth_token');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      try {
        const decoded = jwtDecode(token);
        if (decoded?.tenantId) {
          if (localStorage.getItem('x-tenant-id') !== decoded.tenantId) {
            localStorage.setItem('x-tenant-id', decoded.tenantId);
          }
          if (decoded.tenantSlug && localStorage.getItem('x-tenant-slug') !== decoded.tenantSlug) {
            localStorage.setItem('x-tenant-slug', decoded.tenantSlug);
          }
        }
      } catch (_) { }
    }

    // Add device UUID to all requests
    config.headers['x-device-uuid'] = getDeviceUUID();

    // Add active tenant identity to headers if present
    const activeTenantId = localStorage.getItem('x-tenant-id');
    if (activeTenantId && activeTenantId !== 'default') {
      config.headers['x-tenant-id'] = activeTenantId;
    }

    // Only set Content-Type for POST/PUT/PATCH with body (but not for FormData)
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase()) && config.data && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    // Reset failed count on successful response
    resetFailedCount();
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const errorData = error.response?.data;

    // Handle 503 Maintenance
    if (error.response?.status === 503 && errorData?.maintenance === true) {
      if (maintenanceHandler) {
        maintenanceHandler(errorData.message || null, errorData.scheduledEnd || null);
      }
      return Promise.reject(error); // Don't trigger forceLogout
    }

    // Handle session expired or invalid responses
    if (error.response?.status === 403 &&
      (errorData?.error?.includes('Session expired') || errorData?.error?.includes('Invalid token'))) {
      await forceLogout();
      return Promise.reject(error);
    }

    // Handle any 401 response - clear cookies and redirect
    if (error.response?.status === 401) {
      if (errorData?.expired) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axiosInstance(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const localRefreshToken = localStorage.getItem('refresh_token') || Cookies.get('refresh_token');

        return new Promise((resolve, reject) => {
          axios.post(
            `${baseUrl}/api/auth/refresh`,
            { refreshToken: localRefreshToken },
            {
              withCredentials: true,
              headers: { 'x-device-uuid': getDeviceUUID() }
            }
          )
            .then(({ data }) => {
              if (data.accessToken) {
                Cookies.set("auth_token", data.accessToken);
                localStorage.setItem('auth_token', data.accessToken);
                if (data.refreshToken) {
                  Cookies.set("refresh_token", data.refreshToken);
                  localStorage.setItem('refresh_token', data.refreshToken);
                }
                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                processQueue(null, data.accessToken);
                resolve(axiosInstance(originalRequest));
              } else {
                processQueue(new Error("No access token returned"));
                reject(error);
              }
            })
            .catch((err) => {
              processQueue(err);
              reject(err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        })
          .catch(async (err) => {
            await forceLogout();
            return Promise.reject(err);
          });
      }

      await forceLogout();
      return Promise.reject(error);
    }

    // Track failed requests (4xx, 5xx errors)
    if (error.response?.status >= 400) {
      await incrementFailedCount();
    }

    return Promise.reject(error);
  }
)

export { getDeviceUUID };
export default axiosInstance;