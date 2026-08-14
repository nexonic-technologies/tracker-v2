import { useState, useEffect } from "react";
import { useAuth } from "../context/authProvider";
import axiosInstance from "../api/axiosInstance";

// In-memory cache for role capabilities
const roleCache = new Map();

export const useUserRole = () => {
    const { user } = useAuth();
    
    // Derive role name synchronously from user session token
    const sessionRoleName = (
        typeof user?.role === 'string'
            ? user.role
            : user?.role?.name || ''
    ).toLowerCase();

    const isSuperAdmin = !!(
        user?.isSuperAdmin ||
        user?.role?.isSuperAdmin ||
        sessionRoleName === 'super admin'
    );

    const [userRole, setUserRole] = useState(sessionRoleName || null);
    const [capabilities, setCapabilities] = useState(roleCache.get(sessionRoleName)?.capabilities || []);
    const [policies, setPolicies] = useState({});
    const [loading, setLoading] = useState(!sessionRoleName && !isSuperAdmin);
    const [error, SetError] = useState("");

    useEffect(() => {
        if (!user?.role) {
            setLoading(false);
            return;
        }

        const normalizedRole = (
            typeof user.role === 'string'
                ? user.role
                : user.role?.name || ''
        ).toLowerCase();

        setUserRole(normalizedRole);

        // Super Admin doesn't need remote capabilities query
        if (isSuperAdmin) {
            setLoading(false);
            return;
        }

        // Check memory cache first
        if (roleCache.has(normalizedRole)) {
            setCapabilities(roleCache.get(normalizedRole).capabilities || []);
            setLoading(false);
            return;
        }

        // Check sessionStorage cache next
        try {
            const cachedRole = sessionStorage.getItem(`role_cap_${normalizedRole}`);
            if (cachedRole) {
                const parsed = JSON.parse(cachedRole);
                roleCache.set(normalizedRole, parsed);
                setCapabilities(parsed.capabilities || []);
                setLoading(false);
                return;
            }
        } catch (_) {}

        const fetchUserRoleName = async () => {
            try {
                const response = await axiosInstance.get(`populate/read/roles/${user.role}`);
                const roleDoc = response?.data?.data;
                if (roleDoc) {
                    const caps = roleDoc.capabilities || [];
                    setUserRole(roleDoc.name?.toLowerCase());
                    setCapabilities(caps);
                    setPolicies({});
                    roleCache.set(normalizedRole, { capabilities: caps });
                    try {
                        sessionStorage.setItem(`role_cap_${normalizedRole}`, JSON.stringify({ capabilities: caps }));
                    } catch (_) {}
                }
            } catch (err) {
                SetError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserRoleName();
    }, [user, isSuperAdmin]);

    return { userRole, capabilities, policies, loading, error, userId: user?._id || user?.id };
};