import { useState } from "react";
import { Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import toast from "react-hot-toast";
import { useTheme } from "../context/themeProvider";
import { Moon, Sun } from "lucide-react";

const ForgotPassword = () => {
  const { theme, toggleTheme } = useTheme();
  const [workEmail, setWorkEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async () => {
    if (!workEmail) {
      toast.error("Please enter your work email");
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", { workEmail });
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-canvas text-ink relative">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 tracker-btn-ghost p-2 transition-transform duration-300 hover:scale-105"
        aria-label="Toggle theme"
      >
        <span key={theme} className="inline-flex">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </span>
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
            Forgot your password?
          </h2>
          <p className="text-base xl:text-lg text-white/80 max-w-md leading-relaxed">
            No worries. Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10">
        <div className="w-full max-w-md tracker-card-plain !border-l-0 p-8 sm:p-10">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="lmx-icon-tile">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold text-ink">WorkHub</h1>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="lmx-icon-tile mx-auto h-14 w-14">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-ink">Check your email</h3>
              <p className="text-sm text-ink-muted">
                We&apos;ve sent a password reset link to <strong className="text-ink">{workEmail}</strong>
              </p>
              <p className="text-xs text-ink-subtle">Didn&apos;t receive it? Check your spam folder or try again.</p>
              <Link to="/login" className="tracker-btn-secondary inline-flex items-center gap-2 mt-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center lg:text-left">
                <p className="lmx-page-eyebrow mb-2">PASSWORD RESET</p>
                <h3 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight">Reset password</h3>
                <p className="text-sm text-ink-muted mt-2">Enter your work email and we&apos;ll send you a reset link</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-ink mb-2">Work Email</label>
                  <div className={`flex items-center border rounded-tracker-md transition-all bg-surface ${focusedField === "email" ? "border-[var(--tracker-border-focus)] ring-[3px] ring-violet-500/15" : "border-hairline hover:border-ink-subtle"}`}>
                    <Mail className="h-5 w-5 text-ink-subtle ml-3.5 flex-shrink-0" />
                    <input
                      id="reset-email"
                      type="email"
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="lmx-input !border-0 !shadow-none !ring-0"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="tracker-btn-brand w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
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

export default ForgotPassword;
