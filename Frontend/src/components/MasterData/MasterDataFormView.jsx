import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import EntityFormPage from "../Forms/EntityFormPage";
import { enqueueFormSubmit } from "../../services/formSubmitQueue";
import { formDraftKey } from "../../utils/formDrafts";
import toast from "react-hot-toast";

const MasterDataFormView = ({ config, fields: fieldsProp }) => {
  const navigate = useNavigate();
  const {
    model,
    title,
    subtitle,
    basePath,
    fields: configFields = [],
    tabs,
    submitButton,
    singularName,
    transformSubmit,
    loadRecord: customLoad,
  } = config;

  const fields = fieldsProp || configFields;
  const label = singularName || title.replace(/s$/, "");

  const loadRecord = customLoad
    ? customLoad
    : async (id) => {
        try {
          const res = await axiosInstance.get(`/populate/read/${model}/${id}`);
          const data = res.data?.data;
          const rec = Array.isArray(data) ? data[0] : data;
          if (rec && rec.isActive !== undefined && !rec.Status) {
            rec.Status = rec.isActive ? "Active" : "Inactive";
          }
          return rec;
        } catch (err) {
          console.error(`[MasterDataFormView] Error loading ${model}/${id}:`, err);
          toast.error(`Failed to load ${label}`);
          return null;
        }
      };

  const handleSubmit = (payload, meta) => {
    const id = new URLSearchParams(window.location.search).get("id");
    const isEdit = Boolean(id);
    const draftKey = formDraftKey(model, id || "new");

    let body = isEdit
      ? payload
      : transformSubmit
        ? transformSubmit(meta.fullPayload, { isEdit, meta })
        : meta.fullPayload;

    if (body && body.Status !== undefined) {
      body.isActive = body.Status === "Active";
    }

    console.log('[MasterDataFormView] Submit:', { model, id, isEdit, payload, body, meta });

    enqueueFormSubmit({
      draftKey,
      draft: { formData: meta.fullPayload, patch: payload, isEdit },
      execute: async () => {
        console.log('[MasterDataFormView] Executing:', { isEdit, url: isEdit ? `/populate/update/${model}/${id}` : `/populate/create/${model}`, body });
        if (isEdit) {
          await axiosInstance.put(`/populate/update/${model}/${id}`, body);
        } else {
          await axiosInstance.post(`/populate/create/${model}`, body);
        }
      },
      onSuccess: () =>
        toast.success(isEdit ? `${label} updated` : `${label} created`),
    });

    navigate(basePath);
  };

  return (
    <EntityFormPage
      title={label}
      subtitle={subtitle}
      backTo={basePath}
      fields={fields}
      tabs={tabs}
      draftModel={model}
      submitButton={submitButton}
      loadRecord={loadRecord}
      onSubmit={handleSubmit}
    />
  );
};

export default MasterDataFormView;
