import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/authProvider';

const profileCache = new Map();

export const useUserProfile = () => {
  const { user } = useAuth();
  const targetId = user?.id || user?._id || user?.userId || user?.employeeId;

  // Derive initial values immediately from user session token
  const initialRole = typeof user?.role === 'string' ? user.role : user?.role?.name || null;
  const initialName = user?.name || null;

  // Check memory or sessionStorage cache
  const cached = targetId ? profileCache.get(targetId) : null;

  const [profileImage, setProfileImage] = useState(cached?.profileImage || null);
  const [roleName, setRoleName] = useState(cached?.roleName || initialRole);
  const [userName, setUserName] = useState(cached?.userName || initialName);
  const [loading, setLoading] = useState(!cached && !initialName);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }

    // Hydrate from sessionStorage if available
    try {
      const stored = sessionStorage.getItem(`user_profile_${targetId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.profileImage) setProfileImage(parsed.profileImage);
        if (parsed.roleName) setRoleName(parsed.roleName);
        if (parsed.userName) setUserName(parsed.userName);
        profileCache.set(targetId, parsed);
        setLoading(false);
      }
    } catch (_) {}

    const fetchUserProfile = async () => {
      try {
        const populateFields = {
          'professionalInfo.role': 'name'
        };

        const response = await axiosInstance.post(`/populate/read/employees/${targetId}`, {
          populateFields
        });
        const employee = response.data?.data;

        if (employee) {
          const newImg = employee?.basicInfo?.profileImage || null;
          const newRole = employee?.professionalInfo?.role?.name || initialRole;
          const fullName = [employee?.basicInfo?.firstName, employee?.basicInfo?.lastName].filter(Boolean).join(' ');
          const newName = fullName || initialName;

          if (newImg) setProfileImage(newImg);
          if (newRole) setRoleName(newRole);
          if (newName) setUserName(newName);

          const toCache = { profileImage: newImg, roleName: newRole, userName: newName };
          profileCache.set(targetId, toCache);
          try {
            sessionStorage.setItem(`user_profile_${targetId}`, JSON.stringify(toCache));
          } catch (_) {}
        }
      } catch (error) {
        // Non-blocking fallback to session token data
        if (initialName && !userName) setUserName(initialName);
        if (initialRole && !roleName) setRoleName(initialRole);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [targetId, initialName, initialRole]);

  return { profileImage, roleName: roleName || initialRole, userName: userName || initialName, loading };
};