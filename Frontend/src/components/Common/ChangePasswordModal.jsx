import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import toast from "react-hot-toast";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (response.status === 200) {
        toast.success("Password updated successfully!");
        onClose();
        // Clear state
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--tracker-border)] bg-[var(--tracker-surface-1)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--tracker-ink)]">Change Password</h3>
                  <p className="text-[11px] text-[var(--tracker-ink-subtle)] font-medium">Update your account credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wider mb-1.5">
                  Current Password
                </label>
                <div className="relative flex items-center border border-[var(--tracker-border)] rounded-lg bg-[var(--tracker-surface)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                  <Lock className="absolute left-3 h-4 w-4 text-[var(--tracker-ink-subtle)]" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-transparent border-0 py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-0 text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 p-1 text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] transition-colors"
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative flex items-center border border-[var(--tracker-border)] rounded-lg bg-[var(--tracker-surface)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                  <Lock className="absolute left-3 h-4 w-4 text-[var(--tracker-ink-subtle)]" />
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-transparent border-0 py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-0 text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 p-1 text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] transition-colors"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-[var(--tracker-ink-muted)] uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative flex items-center border border-[var(--tracker-border)] rounded-lg bg-[var(--tracker-surface)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                  <Lock className="absolute left-3 h-4 w-4 text-[var(--tracker-ink-subtle)]" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-transparent border-0 py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-0 text-[var(--tracker-ink)] placeholder:text-[var(--tracker-ink-subtle)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 p-1 text-[var(--tracker-ink-subtle)] hover:text-[var(--tracker-ink)] transition-colors"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--tracker-border)] mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--tracker-ink-muted)] hover:text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] border border-[var(--tracker-border)] transition-all cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-sm active:scale-98 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ChangePasswordModal;
