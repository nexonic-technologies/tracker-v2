import { useState, useEffect, useMemo } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/authProvider";
import FormRenderer from "../../components/Common/FormRenderer";
import FormDraftBanner from "../../components/Forms/FormDraftBanner";
import ProfileImage from "../../components/Common/ProfileImage";
import {
  profileFormFields,
  profileSubmitButton,
  PROFILE_FORM_TABS,
  PROFILE_SUBMIT_LABELS,
} from "../../constants/profileForm";
import { splitFieldsIntoTabs } from "../../utils/formFieldTabs";
import { enqueueFormSubmit } from "../../services/formSubmitQueue";
import { formDraftKey } from "../../utils/formDrafts";
import { buildEmployeeUpdateFormData } from "../../utils/profileSubmit";
import toast from "react-hot-toast";
import { SECTION_GRADIENTS, PROFILE_PAGE } from "../../constants/uiTokens";
import MyAssetsView from "../../components/Assets/MyAssetsView";

// --- Compact Icons (w-4 h-4) ---
const I = ({ d }) => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>;
const icons = {
  user: <I d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />,
  mail: <I d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />,
  phone: <I d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />,
  cal: <I d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />,
  id: <I d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />,
  bldg: <I d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />,
  star: <I d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />,
  shield: <I d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />,
  credit: <I d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />,
  hash: <I d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.6 19.5m-2.1-19.5l-3.6 19.5" />,
  pin: <I d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />,
  case: <I d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />,
  doc: <I d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />,
  bank: <I d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />,
  edit: <I d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />,
  x: <I d="M6 18L18 6M6 6l12 12" />,
  device: <I d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25" />
};

// --- Compact Field Row ---
const Row = ({ icon, label, value, masked }) => {
  const [show, setShow] = useState(false);
  const v = value || "—";
  const display = masked && !show ? v.replace(/./g, '•').slice(0, 6) + v.slice(-4) : v;
  return (
    <div className="group flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors">
      <span className="text-gray-400 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0">{icon}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium truncate ${value ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600 italic'}`}>{display}</span>
      {masked && value && <button onClick={() => setShow(!show)} className="ml-auto text-[10px] text-indigo-500 font-semibold flex-shrink-0">{show ? 'Hide' : 'Show'}</button>}
    </div>
  );
};

// --- Compact Section Card ---
const Card = ({ icon, title, color = 'indigo', children }) => {
  const g = SECTION_GRADIENTS;
  return (
    <div className="tracker-card-profile">
      <div className={`h-0.5 bg-gradient-to-r ${g[color]}`} />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${g[color]} flex items-center justify-center text-white shadow-sm`}>{icon}</div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <div className="space-y-0.5">{children}</div>
      </div>
    </div>
  );
};

// --- Compact Tab ---
const Tab = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${active ? PROFILE_PAGE.tabActive : PROFILE_PAGE.tabInactive}`}>
    {icon}{label}
  </button>
);

// --- Completion Ring (compact) ---
const Ring = ({ pct }) => {
  const r = 34, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-gray-200 dark:text-white/10" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="url(#rg)" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={PROFILE_PAGE.ringGradient.start} /><stop offset="100%" stopColor={PROFILE_PAGE.ringGradient.end} /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">{Math.round(pct)}%</span>
      </div>
    </div>
  );
};

// =============================================================================
const Profile = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('personal');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const pop = {
        'professionalInfo.designation': 'title,description',
        'professionalInfo.department': 'name,head',
        'professionalInfo.role': 'name',
        'professionalInfo.reportingManager': 'basicInfo.firstName,basicInfo.lastName,basicInfo.email',
        'professionalInfo.teamLead': 'basicInfo.firstName,basicInfo.lastName,basicInfo.email'
      };
      const [empRes, leave_typesRes] = await Promise.all([
        axiosInstance.post(`/populate/read/employees/${user.id}`, { populateFields: pop }),
        axiosInstance.post('/populate/read/leave_types', {}).catch(() => null)
      ]);
      let emp = empRes.data.data;
      const leave_types = leave_typesRes?.data?.data || [];
      if (emp) {
        const p = v => { if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) { try { return JSON.parse(v); } catch { return v; } } return v; };
        emp.basicInfo = p(emp.basicInfo); emp.personalDocuments = p(emp.personalDocuments);
        emp.professionalDocuments = p(emp.professionalDocuments); emp.accountDetails = p(emp.accountDetails);

        if (emp.leaveStatus && leave_types.length > 0) {
          emp.leaveStatus = emp.leaveStatus.map(ls => {
            const matchedType = leave_types.find(lt => lt._id === (ls.leaveType?._id || ls.leaveType));
            return {
              ...ls,
              leaveType: matchedType || ls.leaveType
            };
          });
        }
      }
      setEmployee(emp);
    } catch (e) { console.error("Error fetching profile:", e); }
    finally { setLoading(false); }
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const extract = v => typeof v === 'object' && v?.name ? v.name : typeof v === 'string' ? v : null;
  const personName = p => p ? `${p.basicInfo?.firstName || ''} ${p.basicInfo?.lastName || ''}`.trim() || null : null;

  const completion = (() => {
    if (!employee) return 0;
    const f = [employee.basicInfo?.firstName, employee.basicInfo?.lastName, employee.basicInfo?.email, employee.basicInfo?.phone, employee.basicInfo?.dob, employee.basicInfo?.fatherName, employee.basicInfo?.motherName, employee.basicInfo?.address?.street, employee.basicInfo?.address?.city, employee.basicInfo?.address?.state, employee.basicInfo?.address?.country, employee.basicInfo?.profileImage, employee.accountDetails?.accountName, employee.accountDetails?.accountNo, employee.accountDetails?.bankName, employee.accountDetails?.ifscCode, employee.personalDocuments?.pan, employee.personalDocuments?.aadhar];
    return (f.filter(v => v && v.toString().trim() !== '').length / f.length) * 100;
  })();

  const handleUpdate = (payload, meta) => {
    const draftKey = formDraftKey("profile", user.id);

    enqueueFormSubmit({
      draftKey,
      draft: { formData: meta.fullPayload, patch: payload, tab },
      execute: async () => {
        const fd = buildEmployeeUpdateFormData(payload);
        if (![...fd.entries()].length) return;
        await axiosInstance.put(`/populate/update/employees/${user.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      },
      onSuccess: () => {
        toast.success("Profile updated");
        fetchProfile();
        setEditing(false);
      },
    });
  };

  const allProfileFields = useMemo(
    () => (employee ? profileFormFields(employee) : []),
    [employee]
  );

  const profileFieldsByTab = useMemo(
    () => splitFieldsIntoTabs(allProfileFields, PROFILE_FORM_TABS),
    [allProfileFields]
  );

  if (loading) return (
    <div className={`min-h-screen ${PROFILE_PAGE.canvasLight} ${PROFILE_PAGE.canvasDark} flex items-center justify-center`}>
      <div className="w-10 h-10 rounded-full border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-500 animate-spin" />
    </div>
  );
  if (!employee) return <div className={`min-h-screen ${PROFILE_PAGE.canvasLight} ${PROFILE_PAGE.canvasDark} flex items-center justify-center text-ink-muted text-sm`}>Profile not found</div>;

  return (
    <div className="tracker-page -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6" data-module="hr">
      {/* ══ HERO ══ */}
      <div className="relative overflow-hidden">
        <div className={`absolute inset-0 ${PROFILE_PAGE.heroGradient}`} />
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.12) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-400/20 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-5 pt-8 pb-24">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar */}
            <div className="relative">
              <ProfileImage profileImage={employee.basicInfo?.profileImage} firstName={employee.basicInfo?.firstName} lastName={employee.basicInfo?.lastName} size="xl" className="ring-3 ring-white/25 shadow-xl" />
              <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{employee.basicInfo?.firstName} {employee.basicInfo?.lastName}</h1>
              <p className="text-sm text-white/75 font-medium mt-0.5">{employee.professionalInfo?.designation?.title || "Employee"}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {[
                  { icon: icons.bldg, text: employee.professionalInfo?.department?.name || "Department" },
                  { icon: icons.id, text: employee.professionalInfo?.empId || "N/A" },
                  employee.professionalInfo?.role?.name && { icon: icons.star, text: employee.professionalInfo.role.name },
                ].filter(Boolean).map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white/85 text-xs font-medium">{c.icon} {c.text}</span>
                ))}
              </div>
            </div>

            {/* Edit btn */}
            <button onClick={() => setEditing(!editing)} className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 shadow-md mb-1 ${editing ? 'bg-white/20 backdrop-blur text-white border border-white/25 hover:bg-white/30' : 'bg-white text-indigo-600 hover:bg-gray-50 hover:shadow-lg hover:-translate-y-0.5'}`}>
              {editing ? <>{icons.x} Cancel</> : <>{icons.edit} Edit Profile</>}
            </button>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="max-w-5xl mx-auto px-5 -mt-16 relative z-10 pb-10">
        <FormDraftBanner
          model="profile"
          recordId={user.id}
          label="profile changes"
          onRestore={(draft) => {
            const formValues = draft.data?.formData || draft.data;
            setEmployee((prev) => ({ ...prev, ...formValues }));
            setEditing(true);
            toast.success("Draft restored");
          }}
        />

        {/* Completion bar */}
        <div className={`bg-surface ${PROFILE_PAGE.surfaceDark} border border-gray-100 ${PROFILE_PAGE.borderDark} rounded-xl shadow-lg dark:shadow-black/40 p-4 mb-6 flex items-center gap-5`}>
          <Ring pct={completion} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Profile Completion</h3>
              <span className="text-xs font-semibold text-indigo-500">{Math.round(completion * 18 / 100)}/18</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div className={`h-full ${PROFILE_PAGE.progressBar} rounded-full transition-all duration-700`} style={{ width: `${completion}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{completion < 100 ? 'Complete your profile to unlock all features.' : 'All information filled in ✓'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`lmx-tab-bar mb-6`}>
          <Tab active={tab === 'personal'} onClick={() => setTab('personal')} icon={icons.user} label="Personal" />
          <Tab active={tab === 'professional'} onClick={() => setTab('professional')} icon={icons.case} label="Professional" />
          <Tab active={tab === 'security'} onClick={() => setTab('security')} icon={icons.shield} label="Security" />
          <Tab active={tab === 'financial'} onClick={() => setTab('financial')} icon={icons.bank} label="Financial" />
          <Tab active={tab === 'documents'} onClick={() => setTab('documents')} icon={icons.doc} label="Documents" />
          <Tab active={tab === 'assets'} onClick={() => setTab('assets')} icon={icons.device} label="My Assets" />
          <Tab active={tab === 'leaves'} onClick={() => setTab('leaves')} icon={icons.cal} label="Leave Balance" />
        </div>

        {editing && tab !== "professional" && tab !== "leaves" ? (
          <FormRenderer
            key={employee._id}
            fields={allProfileFields}
            fieldsByTab={profileFieldsByTab}
            activeTab={tab}
            data={employee}
            onSubmit={handleUpdate}
            submitButton={{
              ...profileSubmitButton,
              text: PROFILE_SUBMIT_LABELS[tab] || profileSubmitButton.text,
            }}
          />
        ) : (
          <>
            {tab === 'personal' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card icon={icons.user} title="Basic Info" color="indigo">
                  <Row icon={icons.user} label="First Name" value={employee.basicInfo?.firstName} />
                  <Row icon={icons.user} label="Last Name" value={employee.basicInfo?.lastName} />
                  <Row icon={icons.mail} label="Email" value={employee.basicInfo?.email} />
                  <Row icon={icons.phone} label="Phone" value={employee.basicInfo?.phone} />
                  <Row icon={icons.cal} label="DOB" value={fmtDate(employee.basicInfo?.dob)} />
                </Card>
                <Card icon={icons.user} title="Family" color="rose">
                  <Row icon={icons.user} label="Father" value={employee.basicInfo?.fatherName} />
                  <Row icon={icons.user} label="Mother" value={employee.basicInfo?.motherName} />
                  <Row icon={icons.user} label="Marital" value={employee.basicInfo?.maritalStatus} />
                </Card>
                <div className="lg:col-span-2">
                  <Card icon={icons.pin} title="Address" color="cyan">
                    <Row icon={icons.pin} label="Street" value={employee.basicInfo?.address?.street} />
                    <div className="grid grid-cols-2 sm:grid-cols-4">
                      <Row icon={icons.bldg} label="City" value={extract(employee.basicInfo?.address?.city)} />
                      <Row icon={icons.bldg} label="State" value={extract(employee.basicInfo?.address?.state)} />
                      <Row icon={icons.bldg} label="Country" value={extract(employee.basicInfo?.address?.country)} />
                      <Row icon={icons.hash} label="ZIP" value={employee.basicInfo?.address?.zip} />
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {tab === 'professional' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {editing && (
                  <div className="lg:col-span-2 mb-2 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm flex items-center gap-2 border border-amber-200 dark:border-amber-800/30">
                    {icons.shield} Professional information can only be updated by HR or Administrators.
                  </div>
                )}
                <Card icon={icons.case} title="Work Profile" color="emerald">
                  <Row icon={icons.id} label="Employee ID" value={employee.professionalInfo?.empId} />
                  <Row icon={icons.bldg} label="Department" value={employee.professionalInfo?.department?.name} />
                  <Row icon={icons.star} label="Designation" value={employee.professionalInfo?.designation?.title} />
                  <Row icon={icons.shield} label="Role" value={employee.professionalInfo?.role?.name} />
                  <Row icon={icons.star} label="Level" value={employee.professionalInfo?.level} />
                </Card>
                <Card icon={icons.cal} title="Reporting & Dates" color="amber">
                  <Row icon={icons.user} label="Manager" value={personName(employee.professionalInfo?.reportingManager)} />
                  <Row icon={icons.user} label="Team Lead" value={personName(employee.professionalInfo?.teamLead)} />
                  <Row icon={icons.cal} label="Joined" value={fmtDate(employee.professionalInfo?.doj)} />
                  <Row icon={icons.cal} label="Probation" value={employee.professionalInfo?.probationPeriod} />
                  <Row icon={icons.cal} label="Confirmed" value={fmtDate(employee.professionalInfo?.confirmDate)} />
                </Card>
              </div>
            )}

            {tab === 'security' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card icon={icons.shield} title="Security & SSO Linkage" color="indigo">
                  <Row icon={icons.mail} label="Google Email" value={employee.authInfo?.googleEmail} />
                  <Row icon={icons.shield} label="Google Sign-In" value={employee.authInfo?.googleLoginEnabled ? "Enabled" : "Disabled"} />
                </Card>
              </div>
            )}

            {tab === 'financial' && (
              <div className="max-w-lg">
                <Card icon={icons.bank} title="Bank Account" color="emerald">
                  <Row icon={icons.user} label="Holder" value={employee.accountDetails?.accountName} />
                  <Row icon={icons.credit} label="Account No" value={employee.accountDetails?.accountNo} masked />
                  <Row icon={icons.bldg} label="Bank" value={employee.accountDetails?.bankName} />
                  <Row icon={icons.bldg} label="Branch" value={employee.accountDetails?.branch} />
                  <Row icon={icons.hash} label="IFSC" value={employee.accountDetails?.ifscCode} />
                </Card>
              </div>
            )}

            {tab === 'documents' && (
              <div className="max-w-lg">
                <Card icon={icons.doc} title="Identity Documents" color="amber">
                  <Row icon={icons.shield} label="PAN" value={employee.personalDocuments?.pan} masked />
                  <Row icon={icons.shield} label="Aadhar" value={employee.personalDocuments?.aadhar} masked />
                  <Row icon={icons.shield} label="ESI" value={employee.personalDocuments?.esi} masked />
                  <Row icon={icons.shield} label="PF" value={employee.personalDocuments?.pf} masked />
                </Card>
              </div>
            )}

            {tab === 'assets' && (
              <MyAssetsView employeeId={user.id} />
            )}
            {tab === 'leaves' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {employee.leaveStatus && employee.leaveStatus.length > 0 ? (
                  employee.leaveStatus.map((ls, idx) => (
                    <div key={idx} className="tracker-card-plain bg-surface border border-hairline rounded-[14px] overflow-hidden shadow-sm">
                      <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500" />
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                              {ls.leaveType?.name || "Leave"}
                            </h3>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold mt-0.5">
                              Leave Bucket
                            </p>
                          </div>
                          <div className={`px-2.5 py-1 text-xs font-bold rounded-lg ${ls.available > 0
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                            }`}>
                            {ls.available > 0 ? "Active" : "Exhausted"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/[0.04] pt-4 mt-2">
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Available</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                              {ls.available} <span className="text-xs font-medium text-gray-400 dark:text-gray-500">days</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Used (Year)</p>
                            <p className="text-xl font-bold text-gray-500 dark:text-gray-400 mt-1">
                              {ls.usedThisYear} <span className="text-xs font-medium text-gray-400 dark:text-gray-500">days</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Used (Month)</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                              {ls.usedThisMonth} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">days</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Carried Over</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
                              {ls.carriedForward} <span className="text-xs font-normal text-gray-400 dark:text-gray-500">days</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full tracker-card-plain bg-surface border border-hairline rounded-[14px] p-6 text-center text-gray-400 dark:text-gray-500 shadow-sm">
                    No leave configuration found for this profile.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;