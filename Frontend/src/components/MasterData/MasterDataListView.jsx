import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import TableGenerator from "../Common/TableGenerator";
import { entityFormPath } from "../../utils/formRoutes";
import FormDraftBanner from "../Forms/FormDraftBanner";
import toast from "react-hot-toast";

/**
 * List-only master data view. Forms live at `{basePath}/form`.
 */
const MasterDataListView = ({ config }) => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    model,
    title,
    subtitle,
    basePath,
    list = {},
    singularName,
    addLabel = `Add ${title.replace(/s$/, "")}`,
  } = config;

  const itemLabel = (singularName || title.replace(/s$/, "")).toLowerCase();

  const fetchData = async () => {
    try {
      setLoading(true);
      const payload = {
        limit: 1000,
        ...(list.populateFields ? { populate: list.populateFields } : {})
      };
      const res = await axiosInstance.post(`/populate/read/${model}`, payload);
      let rows = res.data?.data || [];
      if (list.cleanData) rows = rows.map(list.cleanData);
      if (list.mapTableData) rows = rows.map(list.mapTableData);
      setData(rows);
    } catch (err) {
      console.error(`Error fetching ${model}:`, err);
      toast.error(list.fetchError || `Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [model]);

  const goToForm = (target) => {
    const id = typeof target === "object" && target !== null ? (target._id || target.id) : target;
    navigate(entityFormPath(basePath, id));
  };

  const handleDelete = async (row) => {
    const id = row._id || row.id;
    const msg =
      typeof list.confirmDelete === "function"
        ? list.confirmDelete(row)
        : list.confirmDelete || "Are you sure you want to delete this item?";
    if (!window.confirm(msg)) return;
    try {
      await axiosInstance.delete(`/populate/delete/${model}/${id}`);
      toast.success(list.deleteSuccess || "Deleted successfully");
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(list.deleteError || "Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-canvas-muted dark:bg-canvas min-h-full">
      <FormDraftBanner
        model={model}
        formPath={entityFormPath(basePath)}
        label={itemLabel}
      />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="text-ink-muted text-sm mt-0.5">{subtitle}</p>}
        </div>
        <button type="button" onClick={() => goToForm()} className="tracker-btn-accent px-4 py-2">
          {addLabel}
        </button>
      </div>

      <div className="tracker-card overflow-hidden">
        <TableGenerator
          data={data}
          customColumns={list.customColumns}
          hiddenColumns={list.hiddenColumns || ["_id", "createdAt", "updatedAt", "__v"]}
          onEdit={(row) => goToForm(row)}
          onDelete={list.disableDelete ? undefined : handleDelete}
          customRender={list.customRender}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default MasterDataListView;
