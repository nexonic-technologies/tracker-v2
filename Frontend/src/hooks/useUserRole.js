import {useState, useEffect} from "react";
import {useAuth} from "../context/authProvider";
import axiosInstance from "../api/axiosInstance";

export const useUserRole = () => {
    const {user} = useAuth();
    const [userRole, setUserRole] = useState(null);
    const [capabilities, setCapabilities] = useState([]);
    const [policies, setPolicies] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, SetError] = useState("");
    
    const fetchUserRoleName = async(user) => {
        try {
            const response = await axiosInstance.get(`populate/read/roles/${user.role}`)
            const roleDoc = response?.data?.data;
            if (roleDoc) {
                setUserRole(roleDoc.name?.toLowerCase());
                setCapabilities(roleDoc.capabilities || []);
                setPolicies({});
            }
        }
        catch (error) {
            SetError(error);
        } finally {
            // Fix: setLoading(false) must be inside the async fn — not after calling it
            // Previously: setLoading(false) was called synchronously AFTER fetchUserRoleName(),
            // causing components to see loading=false before role was actually fetched.
            setLoading(false);
        }
    }

    useEffect(() => {
        if(!user?.role) {
            setLoading(false);
            return;
        }
        fetchUserRoleName(user);
        // DO NOT call setLoading(false) here — it creates a race condition
    }, [user]);

    return {userRole, capabilities, policies, loading, error, userId: user?._id};
}