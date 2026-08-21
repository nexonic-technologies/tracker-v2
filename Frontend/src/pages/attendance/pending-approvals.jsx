import { useState, useEffect } from "react";
import useGenericAPI from "../../components/useGenericAPI";
import { useAuth } from "../../context/authProvider";
import { usePermissions } from "../../hooks/usePermissions";
import TableGenerator from "../../components/Common/TableGenerator";
import { Check, X, Clock, ShieldCheck, ChevronLeft, Calendar } from "lucide-react";

const PendingApprovals = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canApprove = can('approve', 'leaves') || can('approve', 'regularizations') || can('update', 'leaves') || can('update', 'regularizations');

  const { read, update, loading } = useGenericAPI();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [actionType, setActionType] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchPendingRequests = async () => {
    try {
      const [leavesRes, regularizationsRes] = await Promise.all([
        read('leaves', { 
          filter: { status: 'Pending' },
          populateFields: {
            employeeId: 'basicInfo.firstName,basicInfo.lastName'
          }
        }),
        read('regularizations', { 
          filter: { status: 'Pending' },
          populateFields: {
            employeeId: 'basicInfo.firstName,basicInfo.lastName'
          }
        }),
      ]);

      const getEmpName = (item) => {
        if (item.employeeName) return item.employeeName;
        if (item.employeeId?.basicInfo) {
          const { firstName = '', lastName = '' } = item.employeeId.basicInfo;
          return `${firstName} ${lastName}`.trim();
        }
        return '—';
      };

      const leaves = (leavesRes?.data || []).map(item => ({
        ...item,
        requestType: 'Leave',
        employeeName: getEmpName(item),
        requestDate: item.startDate
      }));

      const regularizations = (regularizationsRes?.data || []).map(item => ({
        ...item,
        requestType: 'Regularization',
        employeeName: getEmpName(item),
        requestDate: item.requestDate
      }));

      setPendingRequests([...leaves, ...regularizations]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowDrawer(true);
  };

  const submitAction = async () => {
    try {
      const model = selectedRequest.requestType === 'Leave' ? 'leaves' : 'regularizations';
      await update(model, selectedRequest._id, {
        status: actionType === 'approve' ? 'Approved' : 'Rejected',
        approverComment: comment,
        approvedAt: new Date(),
      }, actionType === 'approve' ? 'Request approved' : 'Request rejected');

      setShowDrawer(false);
      setComment("");
      fetchPendingRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const customRender = {
    requestDate: (row) => row.requestDate ? new Date(row.requestDate).toLocaleDateString() : '—',
    requestType: (row) => (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
        row.requestType === 'Regularization'
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      }`}>
        {row.requestType}
      </span>
    ),
    status: (row) => (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--tracker-warning-light)] text-[var(--tracker-warning)]">
        {row.status}
      </span>
    ),
    actions: (row) => canApprove ? (
      <div className="flex gap-2">
        <button
          onClick={() => handleAction(row, 'approve')}
          className="px-3 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
        >
          Approve
        </button>
        <button
          onClick={() => handleAction(row, 'reject')}
          className="px-3 py-1 text-xs font-semibold bg-[var(--tracker-danger-light)] text-[var(--tracker-danger)] rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
        >
          Reject
        </button>
      </div>
    ) : (
      <span className="text-xs text-ink-subtle italic">Review pending</span>
    )
  };

  return (
    <div className="p-4 sm:p-6 bg-canvas min-h-screen text-ink space-y-4" data-module="hr">
      <div className="flex items-center justify-between">
        <div>
          <p className="lmx-page-eyebrow mb-0.5">HUMAN RESOURCES</p>
          <h1 className="text-[20px] font-semibold text-ink tracking-tight flex items-center gap-2">
            <ShieldCheck size={20} className="text-[var(--module-hr)]" />
            Pending Approvals
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Review and resolve pending leave and attendance regularization requests
          </p>
        </div>
      </div>

      <div className="bg-surface border border-hairline rounded-tracker-card shadow-xs overflow-hidden">
        <TableGenerator
          data={pendingRequests}
          customColumns={["employeeName", "requestType", "requestDate", "reason", "status", "actions"]}
          customRender={customRender}
          enableActions={false}
          loading={loading}
          emptyMessage="No pending requests found"
        />
      </div>

      {/* Slide-over Review Drawer (Anti-Popup Law) */}
      {showDrawer && selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="absolute inset-0" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col p-6 animate-slide-in overflow-y-auto border-l border-hairline">
            <div className="flex items-center justify-between pb-4 border-b border-hairline">
              <h2 className="text-[17px] font-semibold text-ink">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Request
              </h2>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-surface-1 text-ink-muted hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3 bg-surface-1 p-3.5 rounded-xl border border-hairline-soft">
                <div>
                  <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Employee</span>
                  <span className="text-sm font-bold text-ink">{selectedRequest.employeeName}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Request Type</span>
                  <span className="text-sm font-bold text-ink">{selectedRequest.requestType}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Request Date</span>
                  <span className="text-sm font-semibold text-ink">
                    {new Date(selectedRequest.requestDate).toLocaleDateString()}
                  </span>
                </div>
                {selectedRequest.requestType === 'Leave' && (
                  <div>
                    <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-0.5">Total Days</span>
                    <span className="text-sm font-bold text-ink">{selectedRequest.totalDays || 1}</span>
                  </div>
                )}
              </div>

              {selectedRequest.requestType === 'Regularization' && (
                <div className="bg-surface-1 p-3.5 rounded-xl border border-hairline-soft space-y-2">
                  <span className="text-[11px] font-semibold text-ink-subtle uppercase block">Requested Time Correction</span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>Original In: <strong className="text-ink">{formatTime(selectedRequest.originalCheckIn)}</strong></div>
                    <div>Original Out: <strong className="text-ink">{formatTime(selectedRequest.originalCheckOut)}</strong></div>
                    <div>Requested In: <strong className="text-emerald-600 font-bold">{formatTime(selectedRequest.requestedCheckIn)}</strong></div>
                    <div>Requested Out: <strong className="text-amber-600 font-bold">{formatTime(selectedRequest.requestedCheckOut)}</strong></div>
                  </div>
                </div>
              )}

              <div className="bg-surface-1 p-3.5 rounded-xl border border-hairline-soft">
                <span className="text-[11px] font-semibold text-ink-subtle uppercase block mb-1">Employee Reason</span>
                <p className="text-xs text-ink italic leading-relaxed">"{selectedRequest.reason || 'No description provided'}"</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-ink-subtle uppercase block mb-1.5">
                  Reviewer Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-2.5 text-xs text-ink bg-surface border border-hairline rounded-xl outline-none focus:border-[var(--module-hr)]"
                  rows="3"
                  placeholder={`Add your ${actionType === 'approve' ? 'approval' : 'rejection'} comment...`}
                />
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-hairline flex justify-end gap-2.5">
              <button
                onClick={() => setShowDrawer(false)}
                className="px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-surface-1 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitAction}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl cursor-pointer transition-colors shadow-xs ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;