import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/authProvider.jsx";
import toast from "react-hot-toast";
import {
  FileText, CheckCircle2, XCircle, Clock, Upload,
  Trash2, ShieldCheck, AlertTriangle, RefreshCw
} from "lucide-react";

/* ── Constants ─────────────────────────────────── */
const DOC_TYPES = [
  "Resume", "Photo", "PAN", "Aadhaar", "Passport", "Degree",
  "Experience Letter", "Relieving Letter", "Offer Letter",
  "Joining Letter", "Bank Proof", "Medical Certificate", "Other"
];

const STATUS_META = {
  Pending:  { icon: Clock,         cls: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800" },
  Approved: { icon: CheckCircle2,  cls: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800" },
  Rejected: { icon: XCircle,       cls: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800" },
};

/* ── Helper: Status Badge ───────────────────────── */
const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.Pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.cls}`}>
      <Icon size={11} />
      {status}
    </span>
  );
};

/* ── Main Component ─────────────────────────────── */
const EmployeeDocumentVault = ({ record, employeeId }) => {
  const { user } = useAuth();
  const isHR = user?.role?.permissions?.includes("hr_manage") ||
               ["Admin", "Super Admin", "HR Manager"].includes(user?.role?.name);

  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [docType, setDocType]   = useState(DOC_TYPES[0]);
  const [fileUrl, setFileUrl]   = useState("");

  // HR review state
  const [reviewing, setReviewing]   = useState(null); // { id, action }
  const [remarks, setRemarks]       = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  /* ── Fetch ────────────────────────────────────── */
  const fetchDocs = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const res = await axiosInstance.post("/populate/read/employee_documents", {
        filter: { employeeId },
        sort: { createdAt: -1 },
        limit: 200,
      });
      setDocs(res.data?.data || []);
    } catch {
      toast.error("Failed to load document vault.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  /* ── Upload ───────────────────────────────────── */
  const handleUpload = async () => {
    if (!fileUrl.trim()) { toast.error("Please enter a file URL."); return; }
    setUploading(true);
    try {
      await axiosInstance.post("/populate/create/employee_documents", {
        employeeId,
        documentType: docType,
        fileUrl: fileUrl.trim(),
        status: "Pending",
      });
      toast.success(`${docType} uploaded — awaiting HR review`);
      setFileUrl("");
      fetchDocs();
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  /* ── HR Review ────────────────────────────────── */
  const submitReview = async () => {
    if (!reviewing) return;
    setSubmittingReview(true);
    try {
      await axiosInstance.post("/populate/update/employee_documents", {
        docId: reviewing.id,
        update: {
          status: reviewing.action,
          approvedBy: user?._id,
          remarks: remarks.trim() || undefined,
        },
      });
      toast.success(`Document ${reviewing.action.toLowerCase()} successfully`);
      setReviewing(null);
      setRemarks("");
      fetchDocs();
    } catch {
      toast.error("Review action failed.");
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ── Grouped by type ──────────────────────────── */
  const byType = DOC_TYPES.reduce((acc, t) => {
    acc[t] = docs.filter((d) => d.documentType === t);
    return acc;
  }, {});

  const uploadedTypes = DOC_TYPES.filter((t) => byType[t].length > 0);
  const pendingCount  = docs.filter((d) => d.status === "Pending").length;

  /* ── Render ───────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/40">
            <ShieldCheck size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-ink text-base">Document Vault</h3>
            <p className="text-ink-muted text-xs">
              {docs.length} document{docs.length !== 1 ? "s" : ""} uploaded
              {pendingCount > 0 && ` · ${pendingCount} pending review`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchDocs}
          className="p-2 rounded-lg hover:bg-surface-2 transition text-ink-muted"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Upload Form */}
      <div className="tracker-card p-4 space-y-3">
        <p className="text-sm font-semibold text-ink">Upload New Document</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="tracker-input flex-shrink-0 w-full sm:w-56"
          >
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="url"
            placeholder="Paste file URL (Google Drive, S3, etc.)"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="tracker-input flex-1"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="tracker-btn-accent px-4 py-2 flex items-center gap-2 flex-shrink-0"
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : uploadedTypes.length === 0 ? (
        <div className="tracker-card p-10 flex flex-col items-center gap-3 text-ink-muted">
          <FileText size={36} strokeWidth={1.2} />
          <p className="text-sm">No documents uploaded yet.</p>
          <p className="text-xs">Upload your first document using the form above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {uploadedTypes.map((type) => (
            <div key={type} className="tracker-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-divide bg-surface-1 dark:bg-surface-2">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{type}</span>
              </div>
              <div className="divide-y divide-divide">
                {byType[type].map((doc) => (
                  <div key={doc._id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileText size={16} className="text-ink-muted mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-accent hover:underline truncate block"
                        >
                          {doc.fileUrl.split("/").pop() || "View Document"}
                        </a>
                        <p className="text-xs text-ink-muted mt-0.5">
                          {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                          {doc.remarks && (
                            <span className="ml-2 text-rose-500">· {doc.remarks}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={doc.status} />
                      {isHR && doc.status === "Pending" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setReviewing({ id: doc._id, action: "Approved" }); setRemarks(""); }}
                            className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition"
                            title="Approve"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => { setReviewing({ id: doc._id, action: "Rejected" }); setRemarks(""); }}
                            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 transition"
                            title="Reject"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* HR Review Modal */}
      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              {reviewing.action === "Approved" ? (
                <CheckCircle2 size={20} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={20} className="text-rose-500" />
              )}
              <h4 className="font-semibold text-ink">
                {reviewing.action === "Approved" ? "Approve Document" : "Reject Document"}
              </h4>
            </div>
            <textarea
              placeholder={reviewing.action === "Rejected"
                ? "Reason for rejection (required for employee)"
                : "Remarks (optional)"}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="tracker-input w-full resize-none"
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setReviewing(null)}
                className="tracker-btn flex-1 py-2"
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submittingReview}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
                  reviewing.action === "Approved"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white"
                }`}
              >
                {submittingReview ? "Saving…" : `Confirm ${reviewing.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDocumentVault;
