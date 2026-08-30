import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Printer,
  Mail,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { PayrollService, MasterDataService } from '@services';

const MONTHS_FULL = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function numberToWordsINR(amount) {
  if (!amount || isNaN(amount) || amount === 0) return 'Rupees Zero Only';
  const num = Math.floor(amount);
  const paise = Math.round((amount - num) * 100);

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n) {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let words = '';
  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundred = rem;

  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (hundred > 0) words += convertGroup(hundred) + ' ';

  words = words.trim();
  if (!words) words = 'Zero';
  let result = 'Rupees ' + words;
  if (paise > 0) {
    result += ' and ' + convertGroup(paise) + ' Paise';
  }
  return result + ' Only';
}

function formatDateFull(dateVal) {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return String(dateVal);
  }
}

export default function ProfessionalPayslipVoucher({ record, onBack }) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [company, setCompany] = useState(null);
  const [deptMap, setDeptMap] = useState({});
  const [desigMap, setDesigMap] = useState({});

  useEffect(() => {
    // 1. Dynamic tenant company resolution
    MasterDataService.executePopulate('read', 'companies', { limit: 1 })
      .then(res => {
        if (res?.data && res.data.length > 0) {
          setCompany(res.data[0]);
        } else {
          MasterDataService.executePopulate('read', 'general_settings', { limit: 1 })
            .then(gsRes => {
              if (gsRes?.data && gsRes.data.length > 0) {
                const gs = gsRes.data[0];
                setCompany({
                  companyName: gs?.organization?.companyName,
                  logoUrl: gs?.organization?.branding?.logoUrl
                });
              }
            }).catch(() => {});
        }
      })
      .catch(() => {});

    // 2. Lookup Maps for Department & Designation IDs
    MasterDataService.executePopulate('read', 'departments', { limit: 500 })
      .then(res => {
        const map = {};
        (res.data || []).forEach(d => { map[d._id] = d.name || d.title; });
        setDeptMap(map);
      }).catch(() => {});

    MasterDataService.executePopulate('read', 'designations', { limit: 500 })
      .then(res => {
        const map = {};
        (res.data || []).forEach(d => { map[d._id] = d.name || d.title; });
        setDesigMap(map);
      }).catch(() => {});
  }, []);

  const emp = record?.employeeId || {};
  const monthIdx = (record?.month || 1) - 1;
  const monthName = MONTHS_FULL[monthIdx] || '';
  const year = record?.year || '';
  const paySlipMonthTitle = `Pay Register and Slip (With Form 25 B & Pay Slip for the month of ${monthName} ${year})`;

  // Helper resolvers
  const resolveDepartment = (val) => {
    if (!val) return '-';
    if (typeof val === 'object') return val.name || val.title || '-';
    if (deptMap[val]) return deptMap[val];
    if (/^[0-9a-fA-F]{24}$/.test(val)) return '-';
    return String(val);
  };

  const resolveDesignation = (val) => {
    if (!val) return '-';
    if (typeof val === 'object') return val.name || val.title || '-';
    if (desigMap[val]) return desigMap[val];
    if (/^[0-9a-fA-F]{24}$/.test(val)) return '-';
    return String(val);
  };

  // Breakdown map to array
  const earnedRaw = record?.earnedBreakdown
    ? (record.earnedBreakdown instanceof Map ? Object.fromEntries(record.earnedBreakdown) : record.earnedBreakdown)
    : {};
  const deductedRaw = record?.deductionBreakdown
    ? (record.deductionBreakdown instanceof Map ? Object.fromEntries(record.deductionBreakdown) : record.deductionBreakdown)
    : {};

  const earnedList = Object.entries(earnedRaw).map(([k, v]) => ({ name: k, amount: v }));
  if (record?.overtimePay > 0) {
    earnedList.push({ name: 'Overtime Pay', amount: record.overtimePay });
  }

  const deductedList = Object.entries(deductedRaw).map(([k, v]) => ({ name: k, amount: v }));

  // Ensure consistent row counts for balanced side-by-side table
  const maxRows = Math.max(earnedList.length, deductedList.length, 4);
  const rows = [];
  for (let i = 0; i < maxRows; i++) {
    rows.push({
      earned: earnedList[i] || null,
      deducted: deductedList[i] || null
    });
  }

  const totalGross = record?.grossSalary || 0;
  const totalDeductions = record?.totalDeductions || (totalGross - (record?.netSalary || 0));
  const netPay = record?.netSalary || 0;

  // Exact Employee Data Resolution
  const employeeName = [emp?.basicInfo?.firstName, emp?.basicInfo?.lastName].filter(Boolean).join(' ') || '-';
  const employeeCode = emp?.professionalInfo?.empId || '-';
  const department = resolveDepartment(emp?.professionalInfo?.department);
  const designation = resolveDesignation(emp?.professionalInfo?.designation);
  const dojVal = emp?.professionalInfo?.doj || emp?.professionalInfo?.dateOfJoining || emp?.doj;
  const dojFormatted = formatDateFull(dojVal);

  const uan = emp?.personalDocuments?.pf || emp?.statutoryInfo?.uan || emp?.personalDocuments?.uan || '';
  const esi = emp?.personalDocuments?.esi || emp?.statutoryInfo?.esiNumber || emp?.personalDocuments?.esiNumber || '';
  const uanEsi = [uan, esi].filter(Boolean).join(' / ') || '-';

  const totalMonthDays = record?.workingDays != null ? Number(record.workingDays).toFixed(1) : '-';
  const totalPaidDays = record?.presentDays != null ? Number(record.presentDays).toFixed(1) : '0.0';
  const lopDays = record?.lopDays != null ? Number(record.lopDays).toFixed(1) : '0.0';

  // Bank Info Resolution across all schema variants
  const bankName = emp?.accountDetails?.bankName || emp?.bankInfo?.bankName || emp?.financialInfo?.bankName || '-';
  const bankAccount = emp?.accountDetails?.accountNo || emp?.accountDetails?.accountNumber || emp?.bankInfo?.accountNumber || '-';

  // Gross Salary per month (CTC / 12 or base gross)
  const monthlyCtc = record?.salaryStructureId?.ctc ? (record.salaryStructureId.ctc / 12) : null;
  const grossPerMonth = monthlyCtc || totalGross;

  const companyName = company?.companyName || company?.legalName || '';
  const companyAddress = company?.address
    ? [company.address.street, company.address.city, company.address.state, company.address.zip].filter(Boolean).join(', ')
    : '';

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      const res = await PayrollService.emailPayslip(record._id);
      toast.success(res.message || `Payslip for ${monthName} ${year} sent to employee email!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send payslip email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Print isolation styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #statutory-payslip-voucher, #statutory-payslip-voucher * {
            visibility: visible !important;
          }
          #statutory-payslip-voucher {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 99999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Controls Toolbar */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-hairline">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl border border-hairline bg-surface hover:bg-surface-1 text-ink transition shadow-xs"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="lmx-page-eyebrow">FORM 25 B PAYSLIP</span>
              <span className="pay-status-chip pay-status-chip--approved text-[10px] uppercase font-bold">
                {record?.status || 'PROCESSED'}
              </span>
            </div>
            <h2 className="text-[19px] font-bold text-ink tracking-tight">
              Pay Register & Slip · {monthName} {year}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="tracker-btn-brand text-[13px] py-2 px-3.5 flex items-center gap-1.5 shadow-xs"
            title="Send voucher to employee's email"
          >
            {sendingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            <span>{sendingEmail ? 'Sending…' : 'Send to Email'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="tracker-btn-ghost text-[13px] py-2 px-3.5 border border-hairline flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Voucher
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * STATUTORY FORM 25 B PAY REGISTER & SLIP (Pure Dynamic Tenancy)
       * ───────────────────────────────────────────────────────────── */}
      <div
        id="statutory-payslip-voucher"
        className="bg-white text-black p-6 md:p-8 font-sans border-2 border-black rounded-sm shadow-md"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif' }}
      >
        {/* Table Container with Outer Border */}
        <table className="w-full border-collapse border border-black text-[13px] leading-tight">
          <tbody>
            {/* 1. Header: Logo & Company Address */}
            <tr>
              <td className="w-1/4 p-3 border border-black text-center align-middle bg-white">
                <div className="flex flex-col items-center justify-center">
                  {company?.logoUrl ? (
                    <img src={company.logoUrl} alt={companyName} className="h-10 max-w-[140px] object-contain" />
                  ) : companyName ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-900 text-white font-black text-sm flex items-center justify-center rounded-sm border border-black">
                        {companyName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[16px] font-black tracking-tight text-blue-950 uppercase">{companyName}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-sm uppercase">Company</span>
                  )}
                </div>
              </td>
              <td colSpan={3} className="p-3 border border-black text-center align-middle bg-white">
                <h1 className="text-[15px] font-bold tracking-tight uppercase text-black">
                  {companyName || 'Corporate Payroll'}
                </h1>
                {companyAddress && (
                  <p className="text-[11px] font-normal text-black mt-0.5">
                    {companyAddress}
                  </p>
                )}
              </td>
            </tr>

            {/* 2. Banner Title: Form 25 B & Pay Slip Month */}
            <tr>
              <td
                colSpan={4}
                className="p-2 border border-black text-center font-bold text-[12px] bg-gray-100 text-black tracking-wide"
              >
                {paySlipMonthTitle}
              </td>
            </tr>

            {/* 3. Employee Particulars Matrix (4 Columns) */}
            <tr>
              <td className="w-1/4 p-1.5 px-2 border border-black font-normal text-black">Employee Name</td>
              <td className="w-1/4 p-1.5 px-2 border border-black font-bold text-black">{employeeName}</td>
              <td className="w-1/4 p-1.5 px-2 border border-black font-normal text-black">Date of Joining</td>
              <td className="w-1/4 p-1.5 px-2 border border-black font-bold text-black">{dojFormatted}</td>
            </tr>
            <tr>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Employee Code</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">{employeeCode}</td>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Uan Number / ESI Numbe</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">{uanEsi}</td>
            </tr>
            <tr>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Department</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">{department}</td>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Total Month Days</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">{totalMonthDays}</td>
            </tr>
            <tr>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Designation</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">{designation}</td>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Total Paid Days</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">{totalPaidDays}</td>
            </tr>
            <tr>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Gross Salary Per Month</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">Rs.{fmt(grossPerMonth)}/-</td>
              <td className="p-1.5 px-2 border border-black font-normal text-black">Loss of Pay Days</td>
              <td className="p-1.5 px-2 border border-black font-bold text-black">{lopDays}</td>
            </tr>

            {/* 4. Earnings & Deductions Section Header */}
            <tr>
              <td
                colSpan={2}
                className="p-1.5 border border-black text-center font-bold text-[12.5px]"
                style={{ backgroundColor: '#d8a3a3', color: '#000000' }}
              >
                Earnings & Reimbursement
              </td>
              <td
                colSpan={2}
                className="p-1.5 border border-black text-center font-bold text-[12.5px]"
                style={{ backgroundColor: '#d8a3a3', color: '#000000' }}
              >
                Deductions & Recoveries
              </td>
            </tr>

            {/* 5. Sub-headers: Particulars & Amount */}
            <tr style={{ backgroundColor: '#f2dede' }}>
              <td className="w-1/4 p-1.5 px-2 border border-black font-bold text-center text-black">Particulars</td>
              <td className="w-1/4 p-1.5 px-2 border border-black font-bold text-center text-black">Amount</td>
              <td className="w-1/4 p-1.5 px-2 border border-black font-bold text-center text-black">Particulars</td>
              <td className="w-1/4 p-1.5 px-2 border border-black font-bold text-center text-black">Amount</td>
            </tr>

            {/* 6. Dynamic Breakdown Rows */}
            {rows.map((r, idx) => (
              <tr key={idx}>
                {/* Earnings Column */}
                <td className="p-1.5 px-2 border border-black text-left text-black">
                  {r.earned ? r.earned.name : ''}
                </td>
                <td className="p-1.5 px-2 border border-black text-right font-mono text-black">
                  {r.earned ? fmt(r.earned.amount) : ''}
                </td>

                {/* Deductions Column */}
                <td className="p-1.5 px-2 border border-black text-left text-black">
                  {r.deducted ? r.deducted.name : ''}
                </td>
                <td className="p-1.5 px-2 border border-black text-right font-mono text-black">
                  {r.deducted ? fmt(r.deducted.amount) : ''}
                </td>
              </tr>
            ))}

            {/* 7. Totals Row */}
            <tr className="font-bold">
              <td className="p-1.5 px-2 border border-black text-black">Total Earnings</td>
              <td className="p-1.5 px-2 border border-black text-right font-mono text-black">{fmt(totalGross)}</td>
              <td className="p-1.5 px-2 border border-black text-black">Total Deductions</td>
              <td className="p-1.5 px-2 border border-black text-right font-mono text-black">{fmt(totalDeductions)}</td>
            </tr>

            {/* 8. Net Salary Row */}
            <tr className="font-bold">
              <td colSpan={2} className="p-1.5 px-2 border border-black bg-white"></td>
              <td className="p-1.5 px-2 border border-black text-right text-black font-bold">Net Salary</td>
              <td className="p-1.5 px-2 border border-black text-right font-mono font-bold text-black text-[14px]">
                {fmt(netPay)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 9. Bottom Details: Net Pay in Words & Banking */}
        <div className="mt-4 space-y-1 text-[13px] text-black">
          <div className="flex items-start gap-4">
            <span className="w-28 font-bold text-black shrink-0">Net Pay</span>
            <span className="font-bold text-black">: {numberToWordsINR(netPay)}</span>
          </div>
          <div className="flex items-start gap-4">
            <span className="w-28 font-normal text-black shrink-0">Bank Name</span>
            <span className="font-normal text-black">: {bankName}</span>
          </div>
          <div className="flex items-start gap-4">
            <span className="w-28 font-normal text-black shrink-0">Bank A/c.No</span>
            <span className="font-mono font-normal text-black">: {bankAccount}</span>
          </div>

          <div className="pt-6 text-[11px] text-black">
            <p>This is a computer generated payslip does not require signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
