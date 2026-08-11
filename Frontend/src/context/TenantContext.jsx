/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authProvider";

const TenantContext = createContext();

export const TenantProvider = ({ children }) => {
  const { user } = useAuth();
  const [tenantId, setTenantId] = useState(() => localStorage.getItem("x-tenant-id") || "default");
  const [tenantSlug, setTenantSlug] = useState(() => localStorage.getItem("x-tenant-slug") || "admin");
  const [enabledModules, setEnabledModules] = useState(["*"]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (user?.tenantId) {
      setTenantId(user.tenantId);
      localStorage.setItem("x-tenant-id", user.tenantId);
    }
    if (user?.tenantSlug) {
      setTenantSlug(user.tenantSlug);
      localStorage.setItem("x-tenant-slug", user.tenantSlug);
    }
  }, [user]);

  const updateTenantState = (info) => {
    if (info?.tenantId) {
      setTenantId(info.tenantId);
      localStorage.setItem("x-tenant-id", info.tenantId);
    }
    if (info?.tenantSlug) {
      setTenantSlug(info.tenantSlug);
      localStorage.setItem("x-tenant-slug", info.tenantSlug);
    }
    if (info?.enabledModules) {
      setEnabledModules(info.enabledModules);
    }
    if (info?.subscription) {
      setSubscription(info.subscription);
    }
  };

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantSlug,
        enabledModules,
        subscription,
        updateTenantState
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
