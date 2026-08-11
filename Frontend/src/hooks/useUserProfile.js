import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/authProvider';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const targetId = user?.id || user?._id || user?.userId || user?.employeeId;
      if (!targetId) {
        setLoading(false);
        return;
      }

      try {
        const populateFields = {
          'professionalInfo.role': 'name'
        };

        const response = await axiosInstance.post(`/populate/read/employees/${targetId}`, {
          populateFields
        });
        const employee = response.data.data;

        // Set profile image
        if (employee?.basicInfo?.profileImage) {
          setProfileImage(employee.basicInfo.profileImage);
        }

        // Set role name
        if (employee?.professionalInfo?.role?.name) {
          setRoleName(employee.professionalInfo.role.name);
        }

        // Set full user name
        if (employee?.basicInfo) {
          const fullName = [employee.basicInfo.firstName, employee.basicInfo.lastName].filter(Boolean).join(' ');
          if (fullName) {
            setUserName(fullName);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id, user?._id, user?.userId, user?.employeeId]);

  return { profileImage, roleName, userName, loading };
};