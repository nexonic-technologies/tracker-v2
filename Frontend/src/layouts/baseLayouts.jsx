import { useRoutes, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/authProvider.jsx";
import routes from "~react-pages";
import Sidebar from "./sidebar.jsx";
import TopNavBar from "./topNavBar.jsx";
import PlatformAdminLayout from "./PlatformAdminLayout.jsx";
import Login from "../pages/login.jsx";
import ForgotPassword from "../pages/forgotPassword.jsx";
import ResetPassword from "../pages/resetPassword.jsx";
import AcademyLayout from "../pages/academy/index.jsx";
import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import ModernLoader from "../components/Common/ModernLoader.jsx";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";
import JarvisWidget from "../components/Jarvis/JarvisWidget.jsx";

// Memoized static layout components
const MemoSidebar = memo(Sidebar);
const MemoTopNavBar = memo(TopNavBar);

// Isolated navigation loader: subscribes to location itself so BaseLayout
// never re-renders just because the route changed.
const NavigationLoader = memo(() => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathname = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathname.current) {
      if (window.__navStartTime) {
        const routeName = window.__targetRoute || location.pathname;
        const startTime = window.__navStartTime;

        // Log render time after DOM paint
        requestAnimationFrame(() => {
          setTimeout(() => {
            const elapsed = (performance.now() - startTime).toFixed(2);
            console.log(
              `%c⏱️ [Navigation Logger] %c"${routeName}" %cfully rendered in %c${elapsed} ms`,
              "color: #8B5CF6; font-weight: bold;",
              "color: #0EA5E9; font-weight: bold;",
              "color: #64748B;",
              "color: #10B981; font-weight: bold;"
            );
            delete window.__navStartTime;
            delete window.__targetRoute;
          }, 0);
        });
      }
      prevPathname.current = location.pathname;
      setIsNavigating(true);
      const timer = setTimeout(() => setIsNavigating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return isNavigating ? <ModernLoader message="Loading page..." /> : null;
});

const BaseLayout = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const tenantSlug = user?.tenantSlug || localStorage.getItem("x-tenant-slug") || "admin";

  const tenantRoutes = useMemo(() => {
    const expanded = [];
    for (const r of routes) {
      expanded.push(r);
      if (r.path) {
        if (r.path.startsWith("admin/")) {
          const subPath = r.path.replace(/^admin\//, "");
          // Standalone Platform Admin routes without tenant slug
          expanded.push({
            ...r,
            path: `platform-admin/${subPath}`,
          });
          // Backward compatible tenant-prefixed routes
          expanded.push({
            ...r,
            path: `/:tenantSlug/${subPath}`,
          });
        } else {
          expanded.push({
            ...r,
            path: `/:tenantSlug/${r.path}`,
          });
        }
      }
    }
    return expanded;
  }, []);

  const element = useRoutes(tenantRoutes);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Stable callbacks — declared at the top before any early returns to respect the Rules of Hooks
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleToggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  // Auto-collapse on mobile
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const handler = (e) => setSidebarOpen(!e.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Close mobile overlay on navigation
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  const publicPaths = ["/login", "/forgot-password", "/reset-password", "/academy"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-ink-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (location.pathname === "/login") return <Login />;
  if (location.pathname === "/forgot-password") return <ForgotPassword />;
  if (location.pathname === "/reset-password") return <ResetPassword />;
  if (location.pathname === "/academy") return <AcademyLayout />;

  if (!user && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  const isPlatformAdminRoute = location.pathname.startsWith('/platform-admin');

  if (user && publicPaths.includes(location.pathname)) {
    const isGlobalAdmin = user.userType === 'global_admin' || user.isGlobalAdmin;
    const landingPath = isGlobalAdmin ? `/platform-admin/tenant-management` : `/${tenantSlug}/dashboard`;
    return <Navigate to={landingPath} replace />;
  }

  if (user && !isPlatformAdminRoute) {
    const isTenantPrefixed = location.pathname.startsWith(`/${tenantSlug}/`) || location.pathname === `/${tenantSlug}`;
    if (!isTenantPrefixed) {
      if (location.pathname === "/" || location.pathname === "/dashboard" || location.pathname === "/dashboard/") {
        const isGlobalAdmin = user.userType === 'global_admin' || user.isGlobalAdmin;
        const landingPath = isGlobalAdmin ? `/platform-admin/tenant-management` : `/${tenantSlug}/dashboard`;
        return <Navigate to={landingPath} replace />;
      }
      return <Navigate to={`/${tenantSlug}${location.pathname.startsWith('/') ? '' : '/'}${location.pathname}${location.search}`} replace />;
    }
  }

  if (isPlatformAdminRoute) {
    return <PlatformAdminLayout fallbackElement={element} />;
  }

  return (
    <div className="lmx-app-shell">
      {/* NavigationLoader manages its own location subscription — BaseLayout stays stable */}
      <NavigationLoader />

      {sidebarOpen && (
        <div
          className="fixed inset-0 tracker-overlay z-30 lg:hidden"
          onClick={handleCloseSidebar}
          aria-hidden
        />
      )}

      <MemoSidebar
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        onOpen={handleOpenSidebar}
      />

      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300"
        style={{ marginLeft: 0 }}
      >
        <MemoTopNavBar onToggleSidebar={handleToggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-canvas relative">
          <div className="lmx-content">
            <ErrorBoundary key={location.pathname}>
              {element}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global Jarvis AI Assistant Widget */}
      <JarvisWidget />
    </div>
  );
};

export default BaseLayout;
