import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import PlatformAdminSidebar from '@layouts/PlatformAdminSidebar.jsx';
import TopNavBar from '@layouts/topNavBar.jsx';
import { ErrorBoundary } from '@components/ErrorBoundary.jsx';

// Static imports for Platform Admin Control Plane components via Vite path alias
import TenantManagementPage from '@platformAdmin/tenant-management.jsx';
import TenantProvisioningPage from '@platformAdmin/tenant-provisioning.jsx';
import ModuleManagementPage from '@platformAdmin/module-management.jsx';
import ModelDefinitionsPage from '@platformAdmin/model-definitions.jsx';
import DbUtilizationPage from '@platformAdmin/db-utilization.jsx';
import UsageMetricsPage from '@platformAdmin/usage-metrics.jsx';
import ErrorLogsPage from '@platformAdmin/error-logs.jsx';

const adminRouteMap = {
  '/platform-admin/tenant-management': TenantManagementPage,
  '/platform-admin/tenant-provisioning': TenantProvisioningPage,
  '/platform-admin/module-management': ModuleManagementPage,
  '/platform-admin/model-definitions': ModelDefinitionsPage,
  '/platform-admin/db-utilization': DbUtilizationPage,
  '/platform-admin/usage-metrics': UsageMetricsPage,
  '/platform-admin/error-logs': ErrorLogsPage,
};

export default function PlatformAdminLayout({ fallbackElement }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const cleanPath = location.pathname.replace(/\/$/, '');
  const MatchedAdminComponent = adminRouteMap[cleanPath];
  const activeContent = MatchedAdminComponent ? <MatchedAdminComponent /> : fallbackElement;

  return (
    <div className="lmx-app-shell">
      {sidebarOpen && (
        <div
          className="fixed inset-0 tracker-overlay z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <PlatformAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
        <TopNavBar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto bg-canvas relative">
          <div className="lmx-content">
            <ErrorBoundary key={location.pathname}>
              {activeContent}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
