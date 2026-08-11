import axiosInstance, { getDeviceUUID } from "../api/axiosInstance";
import { useState, useEffect } from "react";
import { useAuth } from "../context/authProvider.jsx";
import { useTheme } from "../context/themeProvider.jsx";
import { jwtDecode } from "jwt-decode";
import { useNavigate, Link } from "react-router-dom";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ChevronRight,
  Moon,
  Sun,
  BarChart2,
  FolderKanban,
  TicketCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { requestFirebaseToken } from "../utils/firebase";

/* ── Feature rows (left card) ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Users,
    title: "HR Operations",
    desc: "Manage Employee Management",
    iconBg: "bg-[#ede9fe]",
    iconColor: "text-[#7c3aed]",
  },
  {
    icon: FolderKanban,
    title: "Projects",
    desc: "Plan, track & ship on time",
    iconBg: "bg-[#e0f2fe]",
    iconColor: "text-[#0ea5e9]",
  },
  {
    icon: TicketCheck,
    title: "Tickets",
    desc: "Track the customers pain areas",
    iconBg: "bg-[#ffe4ec]",
    iconColor: "text-[#e11d48]",
  },
  {
    icon: BarChart2,
    title: "Analytics",
    desc: "Track growth and productivity",
    iconBg: "bg-[#d1fae5]",
    iconColor: "text-[#059669]",
  },
];

/* ── Microsoft icon ────────────────────────────────────────────────────── */
const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

/* ── Google icon ───────────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

/* ════════════════════════════════════════════════════════════════════════ */

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  /* Pre-fill remembered email */
  useEffect(() => {
    const remembered = localStorage.getItem("remembered_email");
    if (remembered) {
      setWorkEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  // ── Google SSO Integration ─────────────────────────────────────────
  const handleGoogleCallback = async (response) => {
    setLoading(true);
    try {
      let deviceUuid = localStorage.getItem("device_uuid");
      if (!deviceUuid) {
        deviceUuid =
          "web_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("device_uuid", deviceUuid);
      }

      const res = await axiosInstance.post("/auth/google", {
        idToken: response.credential,
        platform: "web",
      });

      if (res.status === 200 && res.data.accessToken) {
        const decoded = jwtDecode(res.data.accessToken);
        localStorage.setItem("auth_token", res.data.accessToken);
        localStorage.setItem("refresh_token", res.data.refreshToken);
        setUser(decoded);

        try {
          const fcmToken = await requestFirebaseToken();
          if (fcmToken) {
            await axiosInstance.post("/auth/store-push-token", {
              sessionId: res.data.sessionId,
              fcmToken,
            });
          }
        } catch (fcmError) {
          console.error("FCM Token registration failed:", fcmError);
        }

        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error("Google login failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const renderGoogleBtn = () => {
      const btnEl = document.getElementById("google-sso-button");
      if (window.google?.accounts?.id && btnEl) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(btnEl, {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          width: btnEl.offsetWidth || 180,
          shape: "rectangular",
        });
      }
    };

    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleBtn;
      document.body.appendChild(script);
    } else {
      const timer = setTimeout(renderGoogleBtn, 150);
      return () => clearTimeout(timer);
    }
  }, [theme]);

  /* ── Login (unchanged business logic) ──────────────────────────────── */
  const handleLogin = async () => {
    if (!workEmail || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    setLoading(true);
    try {
      let deviceUuid = localStorage.getItem("device_uuid");
      if (!deviceUuid) {
        deviceUuid =
          "web_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("device_uuid", deviceUuid);
      }
      const response = await axiosInstance.post("/auth/login", {
        workEmail,
        password,
        platform: "web",
        deviceUUID: deviceUuid,
      });
      if (response.status === 200 && response.data.accessToken) {
        const decoded = jwtDecode(response.data.accessToken);
        localStorage.setItem("auth_token", response.data.accessToken);
        localStorage.setItem("refresh_token", response.data.refreshToken);
        if (decoded?.tenantId) {
          localStorage.setItem("x-tenant-id", decoded.tenantId);
        } else {
          localStorage.removeItem("x-tenant-id");
        }
        if (decoded?.tenantSlug) {
          localStorage.setItem("x-tenant-slug", decoded.tenantSlug);
        } else {
          localStorage.removeItem("x-tenant-slug");
        }
        setUser(decoded);
        if (rememberMe) localStorage.setItem("remembered_email", workEmail);
        else localStorage.removeItem("remembered_email");
        try {
          const fcmToken = await requestFirebaseToken();
          if (fcmToken)
            await axiosInstance.post("/auth/store-push-token", {
              sessionId: response.data.sessionId,
              fcmToken,
            });
        } catch (fcmError) {
          console.error("FCM Token registration failed:", fcmError);
        }
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error("Login failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  /* ── Focus-ring wrapper ─────────────────────────────────────────────── */
  const inputWrap = (field) =>
    `flex items-center border rounded-[12px] transition-all bg-white dark:bg-[var(--tracker-surface-1)] ${focusedField === field
      ? "border-[var(--tracker-border-focus)] ring-[3px] ring-violet-500/15"
      : "border-[var(--tracker-border)] hover:border-[var(--tracker-ink-subtle)]"
    }`;

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="lmx-login-bg relative overflow-x-hidden flex min-h-screen">
      {/* ── Background soft blobs & 3D glass spheres matching Image 1 ── */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        aria-hidden
      >
        {/* Soft background color glows */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-10%",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "rgba(155, 143, 212, 0.4)",
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            left: "-10%",
            width: "650px",
            height: "650px",
            borderRadius: "50%",
            background: "rgba(220, 170, 200, 0.35)",
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "35%",
            right: "15%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "rgba(240, 210, 230, 0.3)",
            filter: "blur(80px)",
          }}
        />

        {/* 3D Glass spheres/bubbles */}
        {/* Top Right large sphere */}
        <div className="lmx-glass-bubble absolute -top-16 -right-16 w-96 h-96 opacity-90" />
        {/* Top Right smaller nested sphere */}
        <div className="lmx-glass-bubble absolute top-12 right-20 w-36 h-36 opacity-75" />
        {/* Bottom Left medium sphere */}
        <div className="lmx-glass-bubble absolute bottom-12 -left-16 w-80 h-80 opacity-80" />
        {/* Mid Right soft sphere */}
        <div className="lmx-glass-bubble absolute top-[40%] right-[32%] w-56 h-56 opacity-85" />
        {/* Center-left soft sphere */}
        <div className="lmx-glass-bubble absolute top-[25%] left-[28%] w-48 h-48 opacity-80" />
      </div>

      {/* Top Brand Logo */}
      <div className="absolute top-6 left-6 lg:top-10 lg:left-10 z-20 flex items-center gap-3.5 select-none">
        <div className="h-12 w-12 rounded-xl bg-white/85 dark:bg-[#7c3aed]/20 backdrop-blur-md shadow-sm border border-white/50 dark:border-white/10 flex items-center justify-center transition-transform hover:scale-105">
          <Shield
            className="h-7 w-7 text-[#7c3aed] dark:text-[#a78bfa]"
            strokeWidth={2.25}
          />
        </div>
        <span className="text-xl lg:text-2xl font-bold tracking-tight text-[var(--tracker-ink)]">
          WorkHub
        </span>
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-3 right-3 lg:top-10 lg:right-10 z-20 p-2 rounded-xl bg-white/80 dark:bg-white/10 backdrop-blur border border-white/40 dark:border-white/10 text-[var(--tracker-ink)] hover:scale-105 active:scale-95 transition-transform"
        aria-label="Toggle theme"
      >
        <span key={theme} className="inline-flex" aria-hidden>
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </span>
      </button>

      {/* ── Two cards — left features + right login card ── */}
      <div className="relative z-10 w-full flex flex-row items-center justify-center min-h-screen px-6 gap-14 py-10">
        {/* ── LEFT CARD — Feature list ──────────────────────────────── */}
        <div className="lmx-login-feature-card hidden lg:flex flex-col w-[440px] flex-shrink-0 py-6 pr-8 pl-0 gap-5">
          {/* Heading */}
          <div>
            <h1 className="text-[28px] font-bold text-[var(--tracker-ink)] leading-snug tracking-tight">
              Your complete<br />enterprise workspace
            </h1>
            <p className="text-sm text-[var(--tracker-ink-muted)] mt-1.5 leading-relaxed">
              Manage your entire workforce in one connected platform.
            </p>
          </div>

          {/* Feature rows */}
          <div className="flex flex-col gap-2.5 w-[80%]">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="lmx-login-inner-row flex items-center gap-3 px-4 py-3"
              >
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${feat.iconBg}`}
                >
                  <feat.icon className={`h-5 w-5 ${feat.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--tracker-ink)]">
                    {feat.title}
                  </p>
                  <p className="text-xs text-[var(--tracker-ink-subtle)] mt-0.5">
                    {feat.desc}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--tracker-ink-subtle)] flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Security strip */}
          <div className="lmx-login-inner-row flex items-center gap-3 px-4 py-3">
            <Lock className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-[var(--tracker-ink-muted)]">
                Secure enterprise access
              </p>
              <p className="text-[11px] text-[var(--tracker-ink-subtle)]">
                Your data is safe with us
              </p>
            </div>
            <Shield className="h-5 w-5 text-[#7c3aed] flex-shrink-0" />
          </div>
        </div>

        {/* ── RIGHT CARD — Login form ──────────────────────────────────── */}
        <div className="lmx-login-card w-full lg:w-[450px] flex-shrink-0 p-8 sm:p-10 flex flex-col gap-5">
          {/* Card header (shows on mobile viewport only) */}
          <div className="lg:hidden">
            <p className="lmx-login-eyebrow mb-1 justify-end">
              Account Sign-In
            </p>
            <h2 className="text-2xl font-bold text-[var(--tracker-ink)] tracking-tight">
              Sign in
            </h2>
            <p className="text-sm text-[var(--tracker-ink-muted)] mt-1">
              Use your corporate email to continue
            </p>
          </div>

          {/* Account Sign-In eyebrow for desktop view */}
          <div className="hidden lg:block">
            <p className="lmx-login-eyebrow">Account Sign-In</p>
          </div>

          {/* Form */}
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            {/* Work email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-[var(--tracker-ink)] mb-1.5"
              >
                Work email
              </label>
              <div className={inputWrap("email")}>
                <Mail className="h-4 w-4 text-[var(--tracker-ink-subtle)] ml-3.5 flex-shrink-0" />
                <input
                  id="login-email"
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="lmx-input !border-0 !shadow-none !ring-0 !bg-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-[var(--tracker-ink)] mb-1.5"
              >
                Password
              </label>
              <div className={inputWrap("password")}>
                <Lock className="h-4 w-4 text-[var(--tracker-ink-subtle)] ml-3.5 flex-shrink-0" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="lmx-input !border-0 !shadow-none !ring-0 !bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="mr-3 p-1.5 text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] transition-colors"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--tracker-border)] accent-[var(--brand-solid)] cursor-pointer"
                />
                <span className="text-sm text-[var(--tracker-ink-muted)]">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-[#3b5bdb] hover:text-[#6c3de8] transition-colors dark:text-[#a5b4fc]"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              id="login-submit"
              type="submit"
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[12px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(135deg, #3b5bdb 0%, #6c3de8 100%)",
              }}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* OR divider */}
          <div className="lmx-login-divider">OR CONTINUE WITH</div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="lmx-login-social-btn"
              aria-label="Sign in with Microsoft"
              onClick={() => toast("Microsoft SSO coming soon")}
            >
              <MicrosoftIcon />
              <span className="text-sm font-medium text-[var(--tracker-ink)]">
                Microsoft
              </span>
            </button>
            <div id="google-sso-button" className="min-h-[42px] w-full flex items-center justify-center"></div>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] font-semibold tracking-widest uppercase text-[var(--tracker-ink-subtle)]">
            🔒 Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
