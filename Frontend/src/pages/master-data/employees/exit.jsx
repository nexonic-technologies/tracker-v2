import { useState, useEffect } from "react";
import useGenericAPI from "../../../components/useGenericAPI";
import PageLoader from "../../../components/Common/PageLoader";
import { UserCheck, ShieldAlert, Award, FileText, CheckCircle2, User, RefreshCw, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

export default function ExitManagement() {
  const { read, update } = useGenericAPI();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Mock Exit Process Data (Simulating Mongoose model when wired)
  const [exitRequests, setExitRequests] = useState([
    {
      _id: "exit_1",
      employeeId: {
        _id: "emp_1",
        basicInfo: { firstName: "Suresh", lastName: "Kumar", email: "suresh@company.com" },
        professionalInfo: { empId: "EMP-9402", designation: "Senior Engineer", department: "Engineering" }
      },
      resignationDate: "2026-06-15",
      lastWorkingDay: "2026-07-15",
      status: "Notice Period",
      clearanceChecklist: [
        { task: "Return company laptop & monitor", department: "IT Department", isCleared: true, clearedBy: "Admin IT" },
        { task: "Signing offboarding policy & NDA", department: "HR Department", isCleared: false },
        { task: "Gratuity & final paycheck check", department: "Finance Department", isCleared: false }
      ],
      remarks: "Leaving for higher education."
    },
    {
      _id: "exit_2",
      employeeId: {
        _id: "emp_2",
        basicInfo: { firstName: "Deepa", lastName: "Sharma", email: "deepa@company.com" },
        professionalInfo: { empId: "EMP-1049", designation: "HR Generalist", department: "Human Resources" }
      },
      resignationDate: "2026-07-01",
      lastWorkingDay: "2026-07-31",
      status: "Submitted",
      clearanceChecklist: [
        { task: "Access revocation", department: "IT Department", isCleared: false },
        { task: "Handover document completion", department: "HR Department", isCleared: false },
        { task: "Reimbursements settlement", department: "Finance Department", isCleared: false }
      ],
      remarks: "Personal reasons."
    }
  ]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        // Load active employees list for potential exit processing initiates
        const res = await read("employees", { limit: 100 });
        setEmployees(res?.data || []);
      } catch (err) {
        console.error("Failed to load employees for exit:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const handleClearChecklistItem = (requestId, idx) => {
    setExitRequests(prev => prev.map(req => {
      if (req._id === requestId) {
        const updated = [...req.clearanceChecklist];
        updated[idx] = {
          ...updated[idx],
          isCleared: !updated[idx].isCleared,
          clearedBy: !updated[idx].isCleared ? "Current HR Manager" : undefined
        };
        // Update request status if all cleared
        const allCleared = updated.every(item => item.isCleared);
        return {
          ...req,
          clearanceChecklist: updated,
          status: allCleared ? "Cleared" : req.status
        };
      }
      return req;
    }));
    toast.success("Clearance checklist item toggled successfully");
  };

  const handleUpdateStatus = (requestId, nextStatus) => {
    setExitRequests(prev => prev.map(req => {
      if (req._id === requestId) {
        return { ...req, status: nextStatus };
      }
      return req;
    }));
    toast.success(`Exit status updated to: ${nextStatus}`);
  };

  if (loading) return <PageLoader />;

  return (
    <div className="h-full flex flex-col gap-4 p-6 bg-canvas text-ink" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      {/* Header */}
      <div>
        <p className="lmx-page-eyebrow mb-0.5">HRMS MODULE</p>
        <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-rose-500" />
          Exit & Offboarding Management
        </h1>
      </div>

      {/* Grid Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        
        {/* Main List Column */}
        <div className="lg:col-span-2 bg-surface border border-hairline rounded-tracker-card p-5 shadow-sm flex flex-col overflow-hidden">
          <h3 className="text-[14px] font-bold text-ink mb-4 flex items-center gap-1.5">
            <FileText className="h-4.5 w-4.5 text-indigo-500" />
            Active Resignations & Notice Periods
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {exitRequests.map(req => {
              const emp = req.employeeId;
              const name = `${emp.basicInfo?.firstName || ""} ${emp.basicInfo?.lastName || ""}`.trim();
              const isSelected = selectedRequest?._id === req._id;
              
              // Calculate checklist progress
              const clearedCount = req.clearanceChecklist.filter(item => item.isCleared).length;
              const progressPct = Math.round((clearedCount / req.clearanceChecklist.length) * 100);

              return (
                <div
                  key={req._id}
                  onClick={() => setSelectedRequest(req)}
                  className={`p-4 border rounded-tracker-card cursor-pointer transition-all ${
                    isSelected 
                      ? "border-indigo-500 bg-indigo-50/10" 
                      : "border-hairline hover:bg-surface-1"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-[13px] font-bold text-ink leading-tight">{name}</h4>
                      <p className="text-[10px] text-ink-subtle mt-1 font-medium">
                        ID: {emp.professionalInfo?.empId} | Dept: {emp.professionalInfo?.department}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'Cleared' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      req.status === 'Notice Period' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-hairline-soft text-[11px] text-ink-subtle">
                    <div>📅 Resigned: <strong>{req.resignationDate}</strong></div>
                    <div>📅 Last Working Day: <strong className="text-rose-600 dark:text-rose-400">{req.lastWorkingDay}</strong></div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-ink-subtle">
                      <span>Clearance Checklist Tasks</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{progressPct}% Approved</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action / Details Column */}
        <div className="bg-surface border border-hairline rounded-tracker-card p-5 shadow-sm flex flex-col overflow-hidden">
          {selectedRequest ? (
            <div className="flex flex-col h-full space-y-5">
              
              {/* Header */}
              <div className="border-b border-hairline-soft pb-4">
                <h3 className="text-[14px] font-bold text-ink">Offboarding Details</h3>
                <p className="text-[11px] text-ink-subtle mt-0.5">
                  ID: {selectedRequest.employeeId.professionalInfo?.empId} | {selectedRequest.employeeId.basicInfo?.email}
                </p>
              </div>

              {/* Clearance checklist details */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Clearance Status</h4>
                  <div className="space-y-2">
                    {selectedRequest.clearanceChecklist.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleClearChecklistItem(selectedRequest._id, idx)}
                        className={`p-3 border rounded-[8px] flex items-center justify-between gap-3 cursor-pointer transition ${
                          item.isCleared
                            ? "bg-emerald-50/20 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                            : "bg-surface-1 border-hairline hover:bg-surface-2 text-ink"
                        }`}
                      >
                        <div>
                          <p className="text-[12px] font-semibold leading-tight">{item.task}</p>
                          <p className="text-[9px] text-ink-tertiary mt-1">{item.department}</p>
                        </div>
                        <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          item.isCleared ? "bg-emerald-500 border-emerald-500 text-white" : "border-hairline bg-surface"
                        }`}>
                          {item.isCleared && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final status change actions */}
                <div className="space-y-2 pt-2 border-t border-hairline-soft">
                  <h4 className="text-[11px] font-bold text-ink-subtle uppercase tracking-wider">Workflow Action</h4>
                  <div className="flex flex-col gap-2">
                    {selectedRequest.status === "Notice Period" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedRequest._id, "Settled")}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-[8px] text-[12px] transition cursor-pointer"
                      >
                        Confirm Final Settlement (FnF)
                      </button>
                    )}
                    {selectedRequest.status === "Submitted" && (
                      <button
                        onClick={() => handleUpdateStatus(selectedRequest._id, "Notice Period")}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-[8px] text-[12px] transition cursor-pointer"
                      >
                        Approve Resignation & Set Notice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center text-ink-tertiary">
              <AlertTriangle className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-[12px]">Select an offboarding request to manage clearance and FnF settlement.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
