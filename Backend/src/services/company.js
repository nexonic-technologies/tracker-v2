import reportService from './business/reportService.js';

export default function companiesService() {
  return {
    /**
     * beforeReport hook for Company model
     * Handles MIS-04 Monthly Business Review (MBR) dynamic cross-module ERP reporting
     */
    async beforeReport(ctx) {
      const month = Number(ctx.query?.month || ctx.body?.month || (new Date().getMonth() + 1));
      const year = Number(ctx.query?.year || ctx.body?.year || new Date().getFullYear());

      // Pull current and previous month MBR report metrics
      const mbrData = await reportService.getMonthlyBusinessReviewReport(month, year);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevMbrData = await reportService.getMonthlyBusinessReviewReport(prevMonth, prevYear);

      const calcMom = (curr, prev) => {
        if (typeof curr !== 'number' || typeof prev !== 'number') return '—';
        if (!prev || prev === 0) {
          return curr > 0 ? 'Baseline' : '—';
        }
        const diff = ((curr - prev) / prev) * 100;
        const sign = diff >= 0 ? '+' : '';
        return `${sign}${diff.toFixed(1)}%`;
      };

      const result = {
        reportId: 'MIS-04',
        reportName: 'Monthly Business Review (MBR)',
        period: `${month.toString().padStart(2, '0')}/${year}`,
        summary: mbrData,
        drilldown: mbrData.drilldown,
        metrics: [
          { 
            metric: 'Total Invoiced Revenue', 
            current: mbrData.totalInvoicedRevenue, 
            previous: prevMbrData.totalInvoicedRevenue, 
            momChange: calcMom(mbrData.totalInvoicedRevenue, prevMbrData.totalInvoicedRevenue), 
            target: Math.round(mbrData.totalInvoicedRevenue * 1.1),
            drilldownKey: 'invoices',
            drilldownTitle: 'Invoices & Commercial Orders Ledger'
          },
          { 
            metric: 'Total Collections', 
            current: mbrData.totalCollections, 
            previous: prevMbrData.totalCollections, 
            momChange: calcMom(mbrData.totalCollections, prevMbrData.totalCollections), 
            target: Math.round(mbrData.totalCollections * 1.1),
            drilldownKey: 'collections',
            drilldownTitle: 'Client Bank Collections & Payment Journals'
          },
          { 
            metric: 'Payroll Cost (Gross)', 
            current: mbrData.totalPayrollCost, 
            previous: prevMbrData.totalPayrollCost, 
            momChange: calcMom(mbrData.totalPayrollCost, prevMbrData.totalPayrollCost), 
            target: mbrData.totalPayrollCost,
            coverage: mbrData.payrollCoveragePercent,
            drilldownKey: 'payrolls',
            drilldownTitle: 'Employee Payroll Salary Disbursals'
          },
          { 
            metric: 'Operational Opex', 
            current: mbrData.totalOperationalOpex, 
            previous: prevMbrData.totalOperationalOpex, 
            momChange: calcMom(mbrData.totalOperationalOpex, prevMbrData.totalOperationalOpex), 
            target: Math.round(mbrData.totalOperationalOpex * 0.95),
            drilldownKey: 'expenses',
            drilldownTitle: 'Approved Employee Expense Claims'
          },
          { 
            metric: 'Capex Purchases', 
            current: mbrData.totalCapex, 
            previous: prevMbrData.totalCapex, 
            momChange: calcMom(mbrData.totalCapex, prevMbrData.totalCapex), 
            target: mbrData.totalCapex,
            drilldownKey: null
          },
          { 
            metric: 'Net Operating Margin', 
            current: mbrData.netOperatingMargin, 
            previous: prevMbrData.netOperatingMargin, 
            momChange: calcMom(mbrData.netOperatingMargin, prevMbrData.netOperatingMargin), 
            target: Math.round(mbrData.netOperatingMargin * 1.15),
            drilldownKey: null
          },
          { 
            metric: 'Active Headcount', 
            current: mbrData.activeHeadcount, 
            previous: prevMbrData.activeHeadcount, 
            momChange: '0.0%', 
            target: mbrData.activeHeadcount + 2,
            drilldownKey: 'headcount',
            drilldownTitle: 'Active Employee Directory Roster'
          },
          { 
            metric: 'Avg Employee Attendance', 
            current: mbrData.avgEmployeeAttendance, 
            previous: prevMbrData.avgEmployeeAttendance || '0%', 
            momChange: '+0.0%', 
            target: '95.0%',
            drilldownKey: null
          },
          { 
            metric: 'SLA Compliance %', 
            current: mbrData.slaCompliancePercent, 
            previous: prevMbrData.slaCompliancePercent || '100%', 
            momChange: '+0.0%', 
            target: '98.0%',
            drilldownKey: null
          }
        ]
      };

      return { data: result };
    }
  };
}
