import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGenericAPI from "../../components/useGenericAPI";
import { getCanonicalPageRoute } from "../../utils/canonicalRoutes";
import {
  ChevronLeft, AlertCircle, FileText, Calendar, User, Database, Layers
} from "lucide-react";

export default function DynamicModelPage() {
  const { model, id } = useParams();
  const navigate = useNavigate();
  const { readDetailed } = useGenericAPI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tenantSlug = localStorage.getItem("x-tenant-slug") || "admin";

  // 1. Declarative Routing Redirect: If model has a dedicated first-class route, redirect immediately
  useEffect(() => {
    if (!model || !id) return;
    const canonicalRoute = getCanonicalPageRoute(model, id);
    if (canonicalRoute) {
      const clean = canonicalRoute.startsWith("/") ? canonicalRoute : `/${canonicalRoute}`;
      const target = clean.startsWith(`/${tenantSlug}/`) || clean === `/${tenantSlug}` ? clean : `/${tenantSlug}${clean}`;
      navigate(target, { replace: true });
    }
  }, [model, id, tenantSlug, navigate]);

  // 2. Fetch generic record details if no canonical route redirect was triggered
  const fetchRecord = useCallback(async () => {
    if (!model || !id) return;
    try {
      setError(null);
      const res = await readDetailed(model, { id });
      if (res?.data) {
        setData(res.data);
      } else {
        setError(`Record of ${model} with ID ${id} not found.`);
      }
    } catch (err) {
      setError(`Failed to load ${model} record.`);
    } finally {
      setLoading(false);
    }
  }, [model, id, readDetailed]);

  useEffect(() => {
    const canonicalRoute = getCanonicalPageRoute(model, id);
    if (!canonicalRoute) {
      fetchRecord();
    }
  }, [model, id, fetchRecord]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh] bg-canvas" data-module="core">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-[var(--module-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-muted">Resolving record route...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="lmx-content py-8" data-module="core">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink transition-colors mb-6 min-h-[40px] px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="p-6 bg-surface border border-hairline rounded-tracker-card flex flex-col items-center gap-4 text-center max-w-lg mx-auto shadow-xs">
          <AlertCircle className="text-tracker-danger" size={48} />
          <div>
            <h2 className="text-lg font-bold text-ink">Record Not Found</h2>
            <p className="text-sm text-ink-muted mt-1">{error || `The ${model} record could not be loaded.`}</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Clean Universal Record Inspector for standard generic models
  const keys = Object.keys(data).filter((k) => !k.startsWith("__") && k !== "password");

  return (
    <div className="lmx-content py-6" data-module="core">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors min-h-[40px] px-3 rounded-tracker-md border border-hairline bg-surface cursor-pointer"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <span className="text-xs font-mono text-ink-subtle">
          {model} / {id}
        </span>
      </div>

      <div className="tracker-card p-6 bg-surface space-y-6">
        <div className="flex items-center justify-between border-b border-hairline-soft pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--tracker-surface-2)] flex items-center justify-center text-[var(--module-accent)]">
              <Database size={20} />
            </div>
            <div>
              <span className="lmx-page-eyebrow">Universal Record Inspector</span>
              <h1 className="text-xl font-bold text-ink capitalize mt-0.5">
                {model.replace(/_/g, " ")} Details
              </h1>
            </div>
          </div>
          {data.status && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--tracker-surface-2)] text-ink border border-hairline">
              {String(data.status)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {keys.map((key) => {
            const val = data[key];
            const displayVal =
              val === null || val === undefined
                ? "—"
                : typeof val === "object"
                ? JSON.stringify(val)
                : String(val);

            return (
              <div
                key={key}
                className="p-3.5 rounded-tracker-md bg-[var(--tracker-surface-1)] border border-hairline space-y-1 overflow-hidden"
              >
                <span className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider block truncate">
                  {key}
                </span>
                <span className="text-sm font-medium text-ink block break-words">
                  {displayVal}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
