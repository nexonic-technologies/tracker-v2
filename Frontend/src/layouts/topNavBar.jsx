import { useState } from "react";
import { Search, Bell, Menu, Moon, Sun, KeyRound, LogOut, User, Sparkles } from "lucide-react";
import { useAuth } from "../context/authProvider";
import { useTheme } from "../context/themeProvider";
import NotificationDrawer from "../components/Static/NotificationDrawer.jsx";
import ProfileImage from "../components/Common/ProfileImage.jsx";
import { useUserProfile } from "../hooks/useUserProfile.js";
import { useNotification } from "../context/notificationProvider.jsx";
import { useNavigate } from "react-router-dom";
import ChangePasswordModal from "../components/Common/ChangePasswordModal.jsx";
import { triggerReleaseNotesModal } from "../services/releaseNotesService";

const TopNavBar = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, logout } = useAuth();
  const { profileImage, roleName, userName } = useUserProfile();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { unReadCount } = useNotification();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      const tenantSlug = localStorage.getItem("x-tenant-slug") || "admin";
      navigate(`/${tenantSlug}/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="lmx-topbar">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="tracker-btn-ghost p-2 flex-shrink-0"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center gap-2 border border-hairline rounded-tracker-md px-3 bg-surface-1 flex-1 max-w-md lg:max-w-lg">
          <Search className="h-4 w-4 text-ink-subtle flex-shrink-0" />
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-ink-subtle h-9 w-full text-sm text-ink"
          />
        </form>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden lg:flex flex-col text-right mr-1">
          <span className="text-xs font-medium text-ink">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-[11px] text-ink-subtle">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <button type="button" className="sm:hidden tracker-btn-ghost p-2" aria-label="Search">
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="tracker-btn-ghost p-2"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', altKey: true, ctrlKey: true }));
          }}
          className="jarvis-topbar-btn mr-1"
          title="Open Jarvis AI Assistant (Alt + Ctrl + J)"
          aria-label="Jarvis AI Assistant"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
          <span className="hidden sm:inline">Jarvis</span>
          <span className="hidden lg:inline text-[9px] opacity-70 font-mono">Alt+Ctrl+J</span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative tracker-btn-ghost p-2"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unReadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-tracker-danger rounded-full ring-2 ring-surface animate-pulse" />
          )}
        </button>

        <div className="h-6 w-px bg-hairline-soft hidden sm:block" />

        <div className="relative">
          <div
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-1 cursor-pointer select-none group"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium leading-none text-ink group-hover:text-[var(--module-accent)] transition-colors">
                {userName || user?.name || "Guest"}
              </p>
              <p className="text-[11px] text-ink-subtle mt-0.5 capitalize">{roleName || "Employee"}</p>
            </div>
            <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-hairline group-hover:ring-accent transition-all">
              <ProfileImage
                profileImage={profileImage}
                firstName={(userName || user?.name || "")?.split(" ")[0]}
                lastName={(userName || user?.name || "")?.split(" ").slice(1).join(" ")}
                size="sm"
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Profile Dropdown */}
          {profileMenuOpen && (
            <>
              {/* Click-away overlay */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setProfileMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--tracker-surface)] border border-[var(--tracker-border)] rounded-xl shadow-xl py-1.5 z-40 select-none animate-fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate("/Profile");
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <User className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setChangePasswordOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-[var(--tracker-ink)] hover:bg-[var(--tracker-surface-1)] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5 text-[var(--tracker-ink-subtle)]" />
                  Edit Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    triggerReleaseNotesModal();
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-[var(--tracker-surface-1)] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  What&apos;s New (v3.1.4)
                </button>
                <div className="h-px bg-[var(--tracker-border)] my-1" />
                <button
                  type="button"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await logout();
                    navigate("/login");
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-500 hover:bg-[var(--tracker-surface-1)] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isOpen && <NotificationDrawer isOpen={isOpen} setIsOpen={setIsOpen} />}

      {/* Change Password Dialog */}
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </header>
  );
};

export default TopNavBar;
