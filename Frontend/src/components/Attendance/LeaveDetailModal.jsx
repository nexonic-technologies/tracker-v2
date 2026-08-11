import { useEffect, useState } from "react";
import { LeaveService } from "@services";
import { useAuth } from "@providers/AuthProvider";
import toast from "react-hot-toast";

const LeaveDetailModal = ({ id, onApprove, onReject, onClose }) => {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await LeaveService.getLeaveById(id);
        setData(res);
      } catch (err) {
        console.error(err);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleApprove = async () => {
    const payload = {
      employeeId: data?.data?.employeeId,
      employeeName: data?.data?.employeeName,
      startDate: data?.data?.startDate,
      endDate: data?.data?.endDate,
      reason: data?.data?.reason,
      managerId: user?.id,
      status: "Approved",
      leaveType: data?.data?.leaveType
    };
    try {
      await LeaveService.updateLeave(id, payload);
      if (onApprove) onApprove();
      if (onClose) onClose();
    } catch {
      toast.error("You can't update this leave request");
    }
  };

  const handleReject = async () => {
    const payload = {
      status: "Rejected",
      managerId: user?.id
    };
    try {
      await LeaveService.updateLeave(id, payload);
      if (onReject) onReject();
      if (onClose) onClose();
    } catch {
      toast.error("Failed to reject leave request");
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300">
        Leave Request Details
      </h1>

      <div className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 space-y-3 text-gray-700 dark:text-gray-200">
          <div className="flex justify-between">
            <span className="font-semibold">Employee Name</span>
            <span>{data?.data?.employeeName || "—"}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">From Date</span>
            <span>
              {data?.data?.startDate &&
                new Date(data.data.startDate)
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  .replace(/ /g, "-")}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="font-semibold">To Date</span>
            <span>
              {data?.data?.endDate &&
                new Date(data.data.endDate)
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  .replace(/ /g, "-")}
            </span>
          </div>

          <div>
            <span className="font-semibold block mb-1">Reason</span>
            <p className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg min-h-16 text-sm leading-6">
              {data?.data?.reason || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4 pt-2">
        <button 
          onClick={handleApprove}
          className="px-5 py-2.5 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition shadow"
        >
          Approve
        </button>
        <button 
          onClick={handleReject}
          className="px-5 py-2.5 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition shadow"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default LeaveDetailModal;
