import { useState, useEffect } from "react";
import FormRenderer from "../../components/Common/FormRenderer";
import { leaveFormFields, leaveSubmitButton } from "../../constants/leaveForm";
import {
  regularizationFormFields,
  regularizationSubmitButton,
} from "../../constants/regularizationForm";
import { wfhFormFields, wfhSubmitButton } from "../../constants/wfhForm";
import { compOffFormFields, compOffSubmitButton } from "../../constants/compOffForm";
import useGenericAPI from "../../components/useGenericAPI";
import { useAuth } from "../../context/authProvider";
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Home, Briefcase } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const getLocalDateString = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const LeaveAndRegularization = ({ onClose, onSuccess, onFailed, defaultType = "" }) => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  const [formType, setFormType] = useState(defaultType || typeParam || "leave");
  const [showDateSelection, setShowDateSelection] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { read, create } = useGenericAPI();
  const [userData, setUserData] = useState(null);
  const [liveForm, setLiveForm] = useState({});
  const [availableDays, setAvailableDays] = useState(null);
  const [attendanceIssues, setAttendanceIssues] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // Auto trigger regularization date selection if accessed directly
  useEffect(() => {
    if (formType === "regularization" && !selectedDate && attendanceIssues.length === 0) {
      setShowDateSelection(true);
      fetchAttendanceIssues();
    }
  }, [formType, selectedDate]);

  // fetch logged-in employee full profile
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await read('employees', { id: user.id });
        setUserData(res?.data);
      } catch (error) {
        // error toast handled by useGenericAPI
      }
    };
    fetchUserData();
  }, [user.id]);

  // fetch attendance issues for regularization
  const fetchAttendanceIssues = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      // Restrict to the first day of the current calendar month
      startDate.setDate(1);

      const startLocalDate = getLocalDateString(startDate);
      const endLocalDate = getLocalDateString(endDate);

      const res = await read('attendances', {
        filter: {
          employee: user.id,
          date: {
            $gte: `${startLocalDate}T00:00:00.000Z`,
            $lte: `${endLocalDate}T23:59:59.999Z`
          }
        }
      });

      const issues = (res?.data || []).filter(record => {
        return !record.checkIn || !record.checkOut ||
          record.status === 'Absent' || record.status === 'Half Day';
      });

      setAttendanceIssues(issues);
    } catch (error) {
      // error toast handled by useGenericAPI
    }
  };

  // handle regularization flow
  const handleRegularizationClick = () => {
    setFormType("regularization");
    setShowDateSelection(true);
    fetchAttendanceIssues();
  };

  // handle date selection and prefill form
  const handleDateSelect = (attendanceRecord) => {
    setSelectedDate(attendanceRecord);
    setLiveForm({
      requestDate: attendanceRecord.date,
      requestedCheckIn: attendanceRecord.checkIn || '09:00',
      requestedCheckOut: attendanceRecord.checkOut || '18:00',
      reason: ''
    });
    setShowDateSelection(false);
  };

  // monitor values in form (FormRenderer sends updates)
  const handleFormChange = (updated) => setLiveForm(updated);

  // fetch available leave balance when leave type changes
  useEffect(() => {
    if (formType !== "leave") return;
    const leaveTypeId = liveForm?.leaveType?._id;
    if (!leaveTypeId) return;

    const fetchAvailable = async () => {
      try {
        const res = await read('employees', { id: user.id, filter: leaveTypeId });
        const stats = res?.data?.leaveStatus || [];
        const match = stats.find((l) => l.leaveType === leaveTypeId);
        setAvailableDays(match?.available ?? 0);
      } catch (err) {
        // error toast handled by useGenericAPI
      }
    };

    fetchAvailable();
  }, [liveForm?.leaveType]);

  // auto calculate totalDays
  useEffect(() => {
    if (formType !== "leave") return;
    const { startDate, endDate } = liveForm;
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return;

    const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;
    setLiveForm((prev) => ({ ...prev, totalDays: diff }));
  }, [liveForm.startDate, liveForm.endDate, formType]);

  // FINAL SUBMIT
  const handleSubmit = async (data) => {
    if (!userData) return;

    if (formType === "leave") {
      if (liveForm.totalDays > availableDays) {
        onFailed?.("Insufficient Leave Balance");
        return;
      }

      const leave = data.leaveType;
      const payload = {
        employeeId: userData._id,
        employeeName: userData.basicInfo.firstName,
        departmentId: leave?.departmentId,
        leaveTypeId: leave?.leaveTypeId,
        leaveName: leave?.name,
        managerId: userData.professionalInfo?.reportingManager,
        status: leave?.statusId,
        statusOrderKey: leave?.orderKey,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: liveForm.totalDays,
        reason: data.reason,
      };

      try {
        await create('leaves', payload, "Leave requested successfully!");
        onSuccess?.();
        onClose ? onClose() : navigate(-1);
      } catch (err) {
        onFailed?.(err);
      }
      return;
    }

    if (formType === "regularization") {
      if (!selectedDate) {
        onFailed?.("Please select a date first");
        return;
      }

      const payload = {
        attendanceId: selectedDate._id,
        requestDate: data.requestDate,
        requestedCheckIn: data.requestedCheckIn,
        requestedCheckOut: data.requestedCheckOut,
        reason: data.reason
      };

      try {
        await create('regularizations', payload, "Regularization requested successfully!");
        onSuccess?.();
        onClose ? onClose() : navigate(-1);
      } catch (err) {
        onFailed?.(err);
      }
      return;
    }

    if (formType === "wfh") {
      try {
        await create('wfh_requests', { ...data, employeeId: userData._id }, "WFH requested successfully!");
        onSuccess?.();
        onClose ? onClose() : navigate(-1);
      } catch (err) { onFailed?.(err); }
      return;
    }

    if (formType === "compoff") {
      try {
        await create('comp_off_requests', { ...data, employeeId: userData._id }, "Comp-Off requested successfully!");
        onSuccess?.();
        onClose ? onClose() : navigate(-1);
      } catch (err) { onFailed?.(err); }
      return;
    }
  };

  const getIssueType = (record) => {
    if (!record.checkIn && !record.checkOut) return 'No Check-in/Check-out';
    if (!record.checkIn) return 'Missing Check-in';
    if (!record.checkOut) return 'Missing Check-out';
    if (record.status === 'Absent') return 'Marked Absent';
    if (record.status === 'Half Day') return 'Half Day';
    return 'Attendance Issue';
  };

  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : null;

  /* ── DYNAMIC CONTENT BASED ON STATE ── */
  let innerContent = null;

  if (!formType) {
    innerContent = (
      <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div className="mb-6">
          <h2 className="text-[18px] font-medium text-[#111111]">New Request</h2>
          <p className="text-[14px] text-[#626260] mt-1">Choose the type of request</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setFormType("leave")}
            className="group flex flex-col sm:flex-row items-start gap-3 p-4 rounded-[12px] border border-[#d3cec6] hover:bg-[#f5f1ec]/50 transition-all text-left cursor-pointer"
          >
            <div className="h-10 w-10 rounded-[8px] bg-[#f5f1ec] flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
              <Calendar className="h-5 w-5 text-[#111111]" />
            </div>
            <div>
              <span className="text-[14px] font-medium text-[#111111] block mb-1">Apply for Leave</span>
              <span className="text-[12px] text-[#7b7b78] leading-snug block">Vacation, sick days, or personal time</span>
            </div>
          </button>

          <button
            onClick={handleRegularizationClick}
            className="group flex flex-col sm:flex-row items-start gap-3 p-4 rounded-[12px] border border-[#d3cec6] hover:bg-[#f5f1ec]/50 transition-all text-left cursor-pointer"
          >
            <div className="h-10 w-10 rounded-[8px] bg-[#f5f1ec] flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
              <Clock className="h-5 w-5 text-[#111111]" />
            </div>
            <div>
              <span className="text-[14px] font-medium text-[#111111] block mb-1">Regularization</span>
              <span className="text-[12px] text-[#7b7b78] leading-snug block">Fix missed check-ins or check-outs</span>
            </div>
          </button>

          <button
            onClick={() => setFormType("wfh")}
            className="group flex flex-col sm:flex-row items-start gap-3 p-4 rounded-[12px] border border-[#d3cec6] hover:bg-[#f5f1ec]/50 transition-all text-left cursor-pointer"
          >
            <div className="h-10 w-10 rounded-[8px] bg-[#f5f1ec] flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
              <Home className="h-5 w-5 text-[#111111]" />
            </div>
            <div>
              <span className="text-[14px] font-medium text-[#111111] block mb-1">Work From Home</span>
              <span className="text-[12px] text-[#7b7b78] leading-snug block">Request to work remotely</span>
            </div>
          </button>

          <button
            onClick={() => setFormType("compoff")}
            className="group flex flex-col sm:flex-row items-start gap-3 p-4 rounded-[12px] border border-[#d3cec6] hover:bg-[#f5f1ec]/50 transition-all text-left cursor-pointer"
          >
            <div className="h-10 w-10 rounded-[8px] bg-[#f5f1ec] flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
              <Briefcase className="h-5 w-5 text-[#111111]" />
            </div>
            <div>
              <span className="text-[14px] font-medium text-[#111111] block mb-1">Comp-Off</span>
              <span className="text-[12px] text-[#7b7b78] leading-snug block">Request compensatory time off</span>
            </div>
          </button>
        </div>
      </div>
    );
  } else if (showDateSelection) {
    innerContent = (
      <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => {
              if (typeParam) {
                if (onClose) onClose();
                else navigate(-1);
              } else {
                setShowDateSelection(false);
                setFormType("leave");
              }
            }}
            className="p-2 rounded-[8px] hover:bg-[#f5f1ec] text-[#626260] transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-[16px] font-medium text-[#111111]">Select Date</h2>
            <p className="text-[12px] text-[#7b7b78]">Choose the attendance record to regularize</p>
          </div>
        </div>

        {attendanceIssues.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-[#0bdf50]/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-[#0bdf50]" />
            </div>
            <p className="text-[15px] font-medium text-[#111111]">No Issues Found</p>
            <p className="text-[13px] text-[#626260] mt-1">All records from the last 30 days are complete.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-[#7b7b78] mb-1">
              {attendanceIssues.length} record{attendanceIssues.length > 1 ? 's' : ''} found:
            </p>
            {attendanceIssues.map((record, index) => {
              const date = new Date(record.date);
              return (
                <button
                  key={index}
                  onClick={() => handleDateSelect(record)}
                  className="w-full flex items-center justify-between p-3.5 rounded-[8px] border border-[#ebe7e1] hover:border-[#d3cec6] hover:bg-[#f5f1ec]/50 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-[6px] bg-[#c41c1c]/10 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-[#c41c1c]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#111111]">
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#c41c1c] font-medium">{getIssueType(record)}</span>
                        <span className="text-[11px] text-[#9c9fa5]">
                          {fmtTime(record.checkIn) || '—'} → {fmtTime(record.checkOut) || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#d3cec6] group-hover:text-[#111111] transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  } else {
    innerContent = (
      <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        {/* Tab switcher */}
        {!typeParam && (
          <div className="flex gap-1 p-1 bg-[#f5f1ec] rounded-[8px] mb-5">
            <button
              onClick={() => { setFormType("leave"); setShowDateSelection(false); setSelectedDate(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${formType === "leave"
                ? "bg-white text-[#111111] shadow-sm"
                : "text-[#626260] hover:text-[#111111]"
                }`}
            >
              <Calendar className="h-4 w-4" />
              Leave
            </button>
            <button
              onClick={() => {
                if (formType !== "regularization") {
                  handleRegularizationClick();
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${formType === "regularization"
                ? "bg-white text-[#111111] shadow-sm"
                : "text-[#626260] hover:text-[#111111]"
                }`}
            >
              <Clock className="h-4 w-4" />
              Regularize
            </button>
            <button
              onClick={() => { setFormType("wfh"); setShowDateSelection(false); setSelectedDate(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${formType === "wfh"
                ? "bg-white text-[#111111] shadow-sm"
                : "text-[#626260] hover:text-[#111111]"
                }`}
            >
              <Home className="h-4 w-4" />
              WFH
            </button>
            <button
              onClick={() => { setFormType("compoff"); setShowDateSelection(false); setSelectedDate(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-all cursor-pointer ${formType === "compoff"
                ? "bg-white text-[#111111] shadow-sm"
                : "text-[#626260] hover:text-[#111111]"
                }`}
            >
              <Briefcase className="h-4 w-4" />
              Comp-Off
            </button>
          </div>
        )}

        {/* Leave form */}
        {formType === "leave" && (
          <div>
            {!userData ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <FormRenderer
                fields={leaveFormFields(userData).map(f =>
                  f.name === "availableDays" ? { ...f, externalValue: availableDays } : f
                )}
                submitButton={leaveSubmitButton}
                onSubmit={handleSubmit}
                onChange={handleFormChange}
              />
            )}
          </div>
        )}

        {/* Regularization: form after date selected */}
        {formType === "regularization" && !showDateSelection && selectedDate && (
          <div>
            <div className="flex items-center gap-2 mb-5 px-4 py-2.5 rounded-[8px] bg-[#f5f1ec] border border-[#d3cec6]">
              <Calendar className="h-4 w-4 text-[#111111]" />
              <span className="text-[13px] font-medium text-[#111111]">
                {new Date(selectedDate.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <button
                onClick={() => setShowDateSelection(true)}
                className="ml-auto text-[12px] text-[#626260] hover:text-[#111111] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
            <FormRenderer
              fields={regularizationFormFields}
              submitButton={regularizationSubmitButton}
              onSubmit={handleSubmit}
            />
          </div>
        )}

        {/* WFH form */}
        {formType === "wfh" && (
          <div>
            {!userData ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <FormRenderer
                fields={wfhFormFields(userData)}
                submitButton={wfhSubmitButton}
                onSubmit={handleSubmit}
                onChange={handleFormChange}
              />
            )}
          </div>
        )}

        {/* Comp-Off form */}
        {formType === "compoff" && (
          <div>
            {!userData ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <FormRenderer
                fields={compOffFormFields(userData)}
                submitButton={compOffSubmitButton}
                onSubmit={handleSubmit}
                onChange={handleFormChange}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // If there's no onClose provided, we assume it's a full page
  if (!onClose) {
    return (
      <div className="min-h-screen bg-[#f5f1ec] p-4 lg:p-6" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div className="max-w-2xl mx-auto bg-white border border-[#d3cec6] rounded-[16px] shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6 border-b border-[#ebe7e1] pb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-[8px] hover:bg-[#f5f1ec] text-[#626260] hover:text-[#111111] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="text-[20px] font-medium text-[#111111]">
              Leave & Regularization
            </h1>
          </div>
          {innerContent}
        </div>
      </div>
    );
  }

  return innerContent;
};

export default LeaveAndRegularization;
