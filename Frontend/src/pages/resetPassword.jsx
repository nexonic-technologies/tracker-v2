import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import toast from "react-hot-toast";
import { useTheme } from "../context/themeProvider";
import { Moon, Sun } from "lucide-react";

const ResetPassword = () => {
  const { theme, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    if (!token || !email) {
      toast.error("Invalid reset link. Please request a new one.");
    }
  }, [token, email]);

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post("/auth/reset-password", { token, workEmail: email, password });
      setDone(true);
      toast.success("Password reset successfully!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed. Please request a new link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas text-ink relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 tracker-btn-ghost p-2"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="hidden lg:flex lg:w-1/2 lmx-gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        <div className="relative flex flex-col justify-center px-10 xl:px-16 py-12 max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-tracker-md bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">WorkHub</h1>
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight mb-4">
            Choose a new password
          </h2>
          <p className="text-base xl:text-lg text-white/80 max-w-md leading-relaxed">
            Make it strong — at least 6 characters.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md tracker-card-plain !border-l-0 p-8 sm:p-10">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="lmx-icon-tile"><ShieldCheck className="h-5 w-5" /></div>
            <h1 className="text-xl font-semibold text-ink">WorkHub</h1>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div className="lmx-icon-tile mx-auto h-14 w-14 bg-green-100 text-green-600">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-ink">Password reset!</h3>
              <p className="text-sm text-ink-muted">Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center lg:text-left">
                <p className="lmx-page-eyebrow mb-2">NEW PASSWORD</p>
                <h3 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Reset your password</h3>
                <p className="text-sm text-ink-muted mt-2">Enter your new password below</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-ink mb-2">New Password</label>
                  <div className={`flex items-center border rounded-tracker-md transition-all bg-surface ${focusedField === "password" ? "border-[var(--tracker-border-focus)] ring-[3px] ring-violet-500/15" : "border-hairline hover:border-ink-subtle"}`}>
                    <Lock className="h-5 w-5 text-ink-subtle ml-3.5 flex-shrink-0" />
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      className="lmx-input !border-0 !shadow-none !ring-0"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="mr-3 p-1.5 text-ink-subtle hover:text-ink transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-ink mb-2">Confirm Password</label>
                  <div className={`flex items-center border rounded-tracker-md transition-all bg-surface ${focusedField === "confirm" ? "border-[var(--tracker-border-focus)] ring-[3px] ring-violet-500/15" : "border-hairline hover:border-ink-subtle"}`}>
                    <Lock className="h-5 w-5 text-ink-subtle ml-3.5 flex-shrink-0" />
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField("confirm")}
                      onBlur={() => setFocusedField(null)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      className="lmx-input !border-0 !shadow-none !ring-0"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !token || !email}
                  className="tracker-btn-brand w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting...</>
                  ) : (
                    "Reset Password"
                  )}
                </button>

                <Link to="/login" className="flex items-center justify-center gap-1.5 text-xs text-ink-subtle hover:text-ink transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
