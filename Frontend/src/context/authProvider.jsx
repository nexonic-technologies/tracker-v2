/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { setAuthLogout, setMaintenanceHandler } from "../api/axiosInstance";
import axiosInstance, { getDeviceUUID } from "../api/axiosInstance";
import MaintenancePage from "../components/MaintenancePage";

/**
 * Server-side token validation — called during the splash screen so we know
 * if the stored token is still valid BEFORE the app renders.
 *
 * Returns: { valid: true, context } on success
 *          { valid: false }         on 401/403 or no token
 *
 * On failure, clears all stored tokens immediately so authProvider starts
 * with user = null and the user goes straight to /login.
 */
export const validateToken = async () => {
  const token = Cookies.get('auth_token') || localStorage.getItem('auth_token');
  if (!token) return { valid: false };

  // Quick local expiry check — avoid a network round-trip for obviously dead tokens
  try {
    const { exp } = jwtDecode(token);
    if (exp && Date.now() / 1000 > exp) {
      _clearTokens();
      return { valid: false };
    }
  } catch {
    _clearTokens();
    return { valid: false };
  }

  // Server validation — the only authoritative source
  try {
    const res = await axiosInstance.get('/auth/me/context');
    return { valid: true, context: res.data?.data ?? null };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      // Token rejected by server — evict immediately, no retry
      _clearTokens();
    }
    return { valid: false };
  }
};

/** Internal helper — centralises token clearing so it stays in sync with logout() */
const _clearTokens = () => {
  Cookies.remove('auth_token');
  Cookies.remove('refresh_token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('device_uuid');
  localStorage.removeItem('x-tenant-id');
  localStorage.removeItem('x-tenant-slug');
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // decoded user payload
  const [loading, setLoading] = useState(true);
  // Seeded by App.jsx after SplashScreen validates the token.
  // PermissionProvider consumes this to skip its own /auth/me/context call on first mount.
  const [seededContext, setSeededContext] = useState(null);
  // Maintenance overlay state — set via axiosInstance 503 interceptor
  const [maintenance, setMaintenance] = useState({ active: false, message: null, scheduledEnd: null });

  useEffect(() => {
    // By the time this runs, SplashScreen has already called validateToken().
    // If the token was invalid, validateToken() cleared it — so we'll find nothing here
    // and correctly set user = null without any extra server call.
    let token = Cookies.get("auth_token");
    if (!token) {
      token = localStorage.getItem("auth_token");
    }

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch {
        _clearTokens();
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const logout = async (skipApiCall = false) => {
    if (!skipApiCall) {
      try {
        await axiosInstance.post("/auth/logout", {}, {
          headers: {
            'x-device-uuid': getDeviceUUID()
          }
        });
      } catch {
        // Ignore logout API errors — local session is cleared regardless
      }
    }

    _clearTokens();
    setSeededContext(null);
    setUser(null);
  };

  useEffect(() => {
    setAuthLogout(logout);
    // Wire maintenance handler — on 503, show MaintenancePage overlay
    setMaintenanceHandler((message, scheduledEnd) => {
      setMaintenance({ active: true, message, scheduledEnd });
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, seededContext, setSeededContext }}>
      {maintenance.active ? (
        <MaintenancePage
          message={maintenance.message}
          scheduledEnd={maintenance.scheduledEnd}
          onRetry={() => setMaintenance({ active: false, message: null, scheduledEnd: null })}
        />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Hook for consuming auth context
export const useAuth = () => useContext(AuthContext);
