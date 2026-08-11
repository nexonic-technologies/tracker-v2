import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@api/axiosInstance";
import TableGenerator from "@components/Common/TableGenerator";
import { entityFormPath } from "@utils/formRoutes";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { usePermission } from "@context/permissionProvider";

const Menu = () => {
  const navigate = useNavigate();
  const { hasCapability } = usePermission();
  const [sidebarData, setSidebarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const basePath = "/settings/menu";

  const fetchSidebar = async () => {
    try {
      setLoading(true);
      const filterObj = JSON.stringify({
        isActive: { $in: [true, false] },
        isDeleted: { $ne: true }
      });
      const response = await axiosInstance.get(`populate/read/sidebars?limit=100&sort=-order&filter=${encodeURIComponent(filterObj)}`);
      setSidebarData(
        (response.data.data || []).map((item) => ({
          ...item,
          _id: item._id?.$oid || item._id,
        }))
      );
    } catch (error) {
      console.error("Error fetching sidebar:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSidebar();
  }, []);

  const handleDelete = async (row) => {
    if (!window.confirm(`Are you sure you want to delete "${row.title}"?`)) return;
    try {
      await axiosInstance.delete(`populate/delete/sidebars/${row._id}`);
      toast.success("Menu item deleted successfully");
      fetchSidebar();
    } catch (error) {
      console.error("Error deleting sidebar:", error);
      toast.error("Failed to delete menu item");
    }
  };

  const customRender = {
    icon: (row) => (
      <div className="flex items-center gap-2">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {row.icon?.iconName || "No Icon"}{" "}
          <span className="text-gray-400">({row.icon?.iconPackage || "None"})</span>
        </span>
      </div>
    ),
    parentId: (row) => <span>{row.parentId?.title || "-"}</span>,
    capabilities: (row) => {
      const caps = row.capabilities || [];
      if (caps.length === 0) return <span className="text-gray-400 text-xs">-</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {caps.map((cap) => {
            const capKey = typeof cap === 'string' ? cap : (cap.key || cap._id);
            return (
              <span key={capKey} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
                {capKey}
              </span>
            );
          })}
        </div>
      );
    },
    isActive: (row) => (
      <span
        className={`px-2 py-1 rounded text-xs ${row.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
      >
        {row.isActive ? "Active" : "Inactive"}
      </span>
    ),
  };

  return (
    <div className="p-1 space-y-4 bg-canvas min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink">Menu Management</h1>
          <p className="text-ink-muted text-sm">Manage sidebar menu items and structure</p>
        </div>
        {hasCapability("Sidebar:create") && (
          <button
            type="button"
            onClick={() => navigate(entityFormPath(basePath))}
            className="tracker-btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Plus size={18} />
            Add Menu Item
          </button>
        )}
      </div>

      <TableGenerator
        data={sidebarData}
        customRender={customRender}
        onEdit={hasCapability("Sidebar:edit") ? (row) => navigate(entityFormPath(basePath, row._id)) : undefined}
        onDelete={hasCapability("Sidebar:delete") ? handleDelete : undefined}
        hiddenColumns={["_id", "__v", "createdAt", "updatedAt", "routes", "allowedDepartments", "allowedDesignations", "isParent", "hasChildren", "isDeleted", "resourceId"]}
        loading={loading}
      />
    </div>
  );
};

export default Menu;
