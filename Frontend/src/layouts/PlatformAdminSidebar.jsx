import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  PlusCircle,
  Package,
  Boxes,
  Database,
  Activity,
  AlertOctagon,
  ShieldCheck,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@context/authProvider.jsx';

export default function PlatformAdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const tenantSlug = user?.tenantSlug || localStorage.getItem('x-tenant-slug') || 'admin';

  const menuItems = [
    {
      title: 'Tenant Management',
      icon: Building2,
      path: '/platform-admin/tenant-management',
      badge: 'Core',
    },
    {
      title: 'Tenant Provisioning',
      icon: PlusCircle,
      path: '/platform-admin/tenant-provisioning',
    },
    {
      title: 'Module Catalog',
      icon: Package,
      path: '/platform-admin/module-management',
    },
    {
      title: 'Model Definitions',
      icon: Boxes,
      path: '/platform-admin/model-definitions',
    },
    {
      title: 'Database Utilization',
      icon: Database,
      path: '/platform-admin/db-utilization',
      badge: 'Metrics',
    },
    {
      title: 'Usage Analytics',
      icon: Activity,
      path: '/platform-admin/usage-metrics',
    },
    {
      title: 'System Error Logs',
      icon: AlertOctagon,
      path: '/platform-admin/error-logs',
      badge: 'Audit',
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-slate-900 text-slate-100 flex flex-col justify-between
        border-r border-slate-800 shadow-2xl transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide uppercase text-white">Platform Admin</h2>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wider">GLOBAL CONTROL PLANE</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Control Plane Navigation
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.endsWith(item.path) || location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                    }`}
                  />
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer User Profile & Action */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
        <button
          onClick={() => navigate(`/${tenantSlug}/dashboard`)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <div className="flex items-center gap-2">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
            <span>Return to Tenant App</span>
          </div>
        </button>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md shadow-indigo-500/20">
              {user?.basicInfo?.firstName?.[0] || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-200 truncate">
                {user?.basicInfo?.firstName ? `${user.basicInfo.firstName} ${user.basicInfo.lastName || ''}` : 'Platform Admin'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate">{user?.email || 'admin@global'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
