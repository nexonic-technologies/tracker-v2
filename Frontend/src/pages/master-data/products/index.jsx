import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../../api/axiosInstance";
import TableGenerator from "../../../components/Common/TableGenerator";
import PolicyGuard from "../../../components/Common/PolicyGuard";
import { useUserRole } from "../../../hooks/useUserRole";
import { entityFormPath } from "../../../utils/formRoutes";
import { productsConfig } from "./config";

const Products = () => {
    const navigate = useNavigate();
    const { userRole, policies } = useUserRole();
    const roleLower = (userRole || "").toLowerCase();
    const canUpdate =
      roleLower === "super admin" ||
      roleLower === "admin" ||
      (policies?.products?.update);
    const canDelete =
      roleLower === "super admin" ||
      roleLower === "admin" ||
      (policies?.products?.delete);
  
    const [productsData, setProductsData] = useState([]);
    const basePath = productsConfig.basePath;
  
    const fetchProducts = async () => {
      try {
        const res = await axiosInstance.post("/populate/read/products", { limit: 1000 });
        setProductsData(res.data?.data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
      }
    };
  
  
    useEffect(() => {
      fetchProducts();
    }, []);
  
    const tableData = productsData.map((product) => {
      return {
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        Status: product.Status || "Inactive",
      };
    });
  
    const handleDelete = async (row) => {
      try {
        await axiosInstance.delete(`/populate/delete/products/${row._id}`);
        fetchProducts();
      } catch (err) {
        console.error("Delete error:", err);
      }
    };
  
    const toggleStatus = async (row) => {
      try {
        const newStatus = row.Status === "Active" ? "Inactive" : "Active";
        await axiosInstance.put(`/populate/update/products/${row._id}`, { Status: newStatus });
        fetchProducts();
      } catch (err) {
        console.error("Status update error:", err);
      }
    };
  
  
    return (
      <div className="p-6 space-y-6 bg-canvas-muted dark:bg-canvas min-h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-ink">Products</h1>
            <p className="text-ink-muted text-sm">Product management</p>
          </div>
          <PolicyGuard model="products" action="create" requiredRoles={["hr admin", "hr", "super admin", "admin"]}>
            <button
              type="button"
              onClick={() => navigate(entityFormPath(basePath))}
              className="tracker-btn-accent px-4 py-2"
            >
              Add Product
            </button>
          </PolicyGuard>
        </div>
  
        <div className="tracker-card overflow-hidden">
          <TableGenerator
            data={tableData}
            hiddenColumns={["_id"]}
            onEdit={canUpdate ? (row) => navigate(entityFormPath(basePath, row._id)) : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            customRender={{
              Status: (row) => (
                <button
                  type="button"
                  onClick={() => toggleStatus(row)}
                  className={`px-2 py-1 text-xs rounded-full ${
                    row.Status === "Active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {row.Status}
                </button>
              ),
            }}
          />
        </div>
      </div>
    );
  };
  
  export default Products;
  