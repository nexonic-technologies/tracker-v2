import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * PDF Generation Service
 * Generates Order Acknowledgments and Candidates Offer Letters with Annexure
 */
const pdfService = {
  async generateOA(oaData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // --- Header ---
        doc.fontSize(20).text('ORDER ACKNOWLEDGMENT', { align: 'right' });
        doc.fontSize(10).text(`Date: ${new Date(oaData.createdAt).toLocaleDateString()}`, { align: 'right' });
        doc.text(`OA Number: ${oaData.oaNumber}`, { align: 'right' });
        doc.moveDown();

        // --- Parties ---
        const startY = doc.y;
        doc.fontSize(12).font('Helvetica-Bold').text('PROVIDER DETAILS');
        doc.font('Helvetica').fontSize(10).text('Tracker Solutions');
        doc.text('Support & Implementation Center');
        doc.text('Email: support@tracker.com');

        doc.y = startY;
        doc.font('Helvetica-Bold').fontSize(12).text('BUYER DETAILS', 200, startY);
        doc.font('Helvetica').fontSize(10).text(oaData.clientId?.name || oaData.clientName, 200);
        doc.text(`Contact: ${oaData.clientId?.email || 'N/A'}`, 200);
        doc.moveDown(4);

        // --- Table Header ---
        const tableTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Description', 50, tableTop);
        doc.text('Quantity', 250, tableTop, { width: 50, align: 'right' });
        doc.text('Rate', 320, tableTop, { width: 80, align: 'right' });
        doc.text('GST (%)', 410, tableTop, { width: 50, align: 'right' });
        doc.text('Total', 480, tableTop, { width: 80, align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();
        doc.moveDown();

        // --- Table Items ---
        let currentY = tableTop + 25;
        (oaData.items || []).forEach(item => {
          doc.font('Helvetica').fontSize(9);
          doc.text(item.productName || 'N/A', 50, currentY, { width: 180 });
          doc.text((item.quantity || 0).toString(), 250, currentY, { width: 50, align: 'right' });
          doc.text((item.unitPrice || 0).toLocaleString(), 320, currentY, { width: 80, align: 'right' });
          doc.text((item.tax || 0).toString(), 410, currentY, { width: 50, align: 'right' });
          doc.text((item.total || 0).toLocaleString(), 480, currentY, { width: 80, align: 'right' });
          currentY += 20;
        });

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  },

  async generateOfferLetter(candidateData, jobData, companyData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        const compName = companyData?.companyName || 'Axinix Technologies Group';
        const legalName = companyData?.legalName || 'Axinix Technologies Infomatic (India) Pvt. Ltd.';
        const hrEmail = companyData?.hrEmail || 'hr@axinixtech.com';
        const itEmail = companyData?.itEmail || 'it@axinixtech.com';
        const candFullName = `${candidateData.firstName} ${candidateData.lastName || ''}`.trim();

        // ── PAGE 1: OFFER LETTER ──────────────────────────────────────────────

        // --- Header / Logo ---
        doc.fillColor('#059669').fontSize(22).font('Helvetica-Bold').text(compName.toUpperCase(), { align: 'left' });
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(`${legalName} | Human Resources Department`, { align: 'left' });
        doc.moveDown();
        doc.moveTo(50, doc.y).lineTo(560, doc.y).strokeColor('#CBD5E1').lineWidth(1).stroke();
        doc.moveDown(1.5);

        // --- Title & Ref ---
        doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text('CONDITIONAL OFFER OF EMPLOYMENT', { align: 'center' });
        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
        doc.text(`Ref: PRCS/OFFER/${candidateData._id.toString().slice(-6).toUpperCase()}`, { align: 'right' });
        doc.moveDown();

        // --- Candidate Address ---
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('To,');
        doc.font('Helvetica-Bold').fontSize(11).text(candFullName);
        doc.font('Helvetica').fontSize(10).fillColor('#334155');
        doc.text(`Email: ${candidateData.email}`);
        doc.text(`Phone: ${candidateData.phone || 'N/A'}`);
        if (candidateData.address?.street) {
          doc.text(`${candidateData.address.street || ''}, ${candidateData.address.city || ''}`);
          doc.text(`${candidateData.address.state || ''} - ${candidateData.address.zip || ''}`);
        }
        doc.moveDown(1.5);

        // --- Salutation & Body ---
        doc.font('Helvetica-Bold').fillColor('#0F172A').text(`Dear ${candidateData.firstName},`);
        doc.moveDown(0.5);
        doc.font('Helvetica').fillColor('#334155').text(
          `Greetings from ${compName}! We are pleased to offer you employment with ${legalName} for the post of ${jobData.title || 'Trainee Technical Engineer'}. We were highly impressed by your credentials and look forward to welcoming you to our team.`,
          { align: 'justify', lineGap: 3 }
        );
        doc.moveDown(1);

        // --- Key Position Details ---
        doc.font('Helvetica-Bold').text('Position & Compensation Summary:');
        doc.moveDown(0.5);
        doc.font('Helvetica');
        doc.text(`• Department: ${jobData.departmentName || jobData.department?.name || 'Engineering'}`);
        doc.text(`• Designation: ${jobData.designationName || jobData.designation?.title || jobData.title || 'Technical Engineer'}`);
        doc.text(`• Offered Annual CTC: Rs. ${(candidateData.offeredSalary || 0).toLocaleString('en-IN')}/- p.a.`);
        doc.text(`• Reporting Date & Location: ${candidateData.joiningDate ? new Date(candidateData.joiningDate).toLocaleDateString('en-IN') : 'To Be Confirmed'}`);
        doc.text(`• Offer Validity Date: Until ${candidateData.offerExpiryDate ? new Date(candidateData.offerExpiryDate).toLocaleDateString('en-IN') : 'N/A'}`);

        doc.moveDown(1.5);

        // --- Mandatory Pre-joining Documentation ---
        doc.font('Helvetica-Bold').fillColor('#1E3A8A').text('Mandatory Pre-Joining Documentation Requirement:');
        doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(
          'Please ensure that all required documents are mandatorily uploaded on the Candidate Self-Registration Portal (CSRP) before your date of joining:\n' +
          '  1. Updated Resume & Passport Size Photograph\n' +
          '  2. Educational Certificates (10th/SSLC, 12th/HSC, Degree/Provisional Certificate)\n' +
          '  3. Offer Letter, Pay Slips, and Experience Certificate if previously employed\n' +
          '  4. Identity & Address Proofs (Aadhaar Card, PAN Card)'
          , { lineGap: 2 });

        doc.moveDown(1.5);

        // --- Sign-off ---
        doc.font('Helvetica').fillColor('#334155').text('Please review the detailed salary breakup attached in the Annexure. Kindly confirm your acceptance by logging into the portal.');
        doc.moveDown(1.5);

        doc.font('Helvetica-Bold').text(`For ${legalName},`);
        doc.moveDown(2.5);
        doc.font('Helvetica-Bold').text('Authorized HR Signatory');

        // ── PAGE 2: ANNEXURE (SALARY BREAKDOWN TABLE) ─────────────────────────
        doc.addPage({ margin: 50 });

        // Annexure Header
        doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold').text('ANNEXURE', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text(`Salary details of ${candFullName}`, { align: 'left' });
        doc.moveDown(1);

        // Calculations
        const annualCTC = Number(candidateData.offeredSalary) || 150024;
        const monthlyCTC = Math.round(annualCTC / 12);
        const monthlyESI = Math.round(monthlyCTC * 0.0315);
        const monthlyGross = monthlyCTC - monthlyESI;
        const monthlyBasic = monthlyGross;
        const annualBasic = monthlyBasic * 12;
        const annualGross = monthlyGross * 12;
        const annualESI = monthlyESI * 12;

        const monthlyDeductionESI = Math.round(monthlyGross * 0.0075) || 91;
        const annualDeductionESI = monthlyDeductionESI * 12;
        const monthlyNetPay = monthlyGross - monthlyDeductionESI;
        const annualNetPay = monthlyNetPay * 12;

        // Table Drawing
        const tableTop = doc.y;
        const col1X = 50;
        const col2X = 330;
        const col3X = 450;
        const tableWidth = 510;

        // Table Outer Header Box
        doc.rect(col1X, tableTop, tableWidth, 22).strokeColor('#000000').lineWidth(1).stroke();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
        doc.text('COMPONENTS', col1X + 5, tableTop + 6);
        doc.text('AMOUNT PER MONTH', col2X + 5, tableTop + 6, { width: 110, align: 'right' });
        doc.text('AMOUNT PER ANNUM', col3X + 5, tableTop + 6, { width: 100, align: 'right' });

        let y = tableTop + 22;

        const drawTableRow = (label, monthVal, annumVal, isHeaderRow = false, isBold = false) => {
          if (isHeaderRow) {
            doc.fillColor('#F1F5F9').rect(col1X, y, tableWidth, 18).fill();
            doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9.5).text(label, col1X + 5, y + 4);
          } else {
            doc.fillColor('#000000').font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
            doc.text(label, col1X + 5, y + 4);
            doc.text(monthVal !== null ? Number(monthVal).toLocaleString('en-IN') : '', col2X + 5, y + 4, { width: 110, align: 'right' });
            doc.text(annumVal !== null ? Number(annumVal).toLocaleString('en-IN') : '', col3X + 5, y + 4, { width: 100, align: 'right' });
          }
          doc.rect(col1X, y, tableWidth, 20).strokeColor('#000000').lineWidth(0.5).stroke();
          y += 20;
        };

        drawTableRow('MONTHLY', null, null, true);
        drawTableRow('BASIC SALARY', monthlyBasic, annualBasic);
        drawTableRow('MONTHLY GROSS SALARY (A)', monthlyGross, annualGross, false, true);

        drawTableRow('STATUTORY', null, null, true);
        drawTableRow('ESI', monthlyESI, annualESI);
        drawTableRow('TOTAL STATUTORY', monthlyESI, annualESI, false, true);
        drawTableRow('COST TO COMPANY (CTC)', monthlyCTC, annualCTC, false, true);

        drawTableRow('DEDUCTION', null, null, true);
        drawTableRow('ESI', monthlyDeductionESI, annualDeductionESI);
        drawTableRow('TOTAL DEDUCTION', monthlyDeductionESI, annualDeductionESI, false, true);
        drawTableRow('NET PAY', monthlyNetPay, annualNetPay, false, true);

        // Vertical Divider Lines
        doc.moveTo(col2X, tableTop).lineTo(col2X, y).strokeColor('#000000').stroke();
        doc.moveTo(col3X, tableTop).lineTo(col3X, y).strokeColor('#000000').stroke();

        // Footer Confidential Text
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000').text('Confidential', col3X + 20, y + 25, { align: 'right' });

        doc.end();
        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Generates a statutory Form 25 B Payslip PDF Buffer for email attachments
   */
  async generatePayslipPDFBuffer({ payroll, employee, company, periodLabel, numberToWords }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 36 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const startX = 36;
        let startY = 36;
        const totalWidth = 523;
        const halfWidth = totalWidth / 2;

        const companyName = company?.companyName || company?.legalName || 'Corporate Payroll';
        const companyAddress = company?.address
          ? [company.address.street, company.address.city, company.address.state, company.address.zip].filter(Boolean).join(', ')
          : '';

        const empName = [employee?.basicInfo?.firstName, employee?.basicInfo?.lastName].filter(Boolean).join(' ') || '-';
        const empId = employee?.professionalInfo?.empId || '-';
        const department = (typeof employee?.professionalInfo?.department === 'object' ? employee?.professionalInfo?.department?.name : employee?.professionalInfo?.department) || '-';
        const designation = (typeof employee?.professionalInfo?.designation === 'object' ? employee?.professionalInfo?.designation?.name : employee?.professionalInfo?.designation) || '-';
        
        let dojFormatted = '-';
        const doj = employee?.professionalInfo?.doj || employee?.professionalInfo?.dateOfJoining;
        if (doj) {
          try {
            dojFormatted = new Date(doj).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          } catch {
            dojFormatted = String(doj);
          }
        }

        const pf = employee?.personalDocuments?.pf || employee?.statutoryInfo?.uan || '';
        const esi = employee?.personalDocuments?.esi || employee?.statutoryInfo?.esiNumber || '';
        const uanEsi = [pf, esi].filter(Boolean).join(' / ') || '-';

        const totalMonthDays = payroll.workingDays != null ? Number(payroll.workingDays).toFixed(1) : '-';
        const totalPaidDays = payroll.presentDays != null ? Number(payroll.presentDays).toFixed(1) : '0.0';
        const lopDays = payroll.lopDays != null ? Number(payroll.lopDays).toFixed(1) : '0.0';

        const monthlyCtc = payroll.salaryStructureId?.ctc ? (payroll.salaryStructureId.ctc / 12) : null;
        const grossSalaryPerMonth = monthlyCtc || (payroll.grossSalary || 0);

        const bankName = employee?.accountDetails?.bankName || employee?.bankInfo?.bankName || '-';
        const bankAccount = employee?.accountDetails?.accountNo || employee?.accountDetails?.accountNumber || employee?.bankInfo?.accountNumber || '-';

        const earnedRaw = payroll.earnedBreakdown
          ? (payroll.earnedBreakdown instanceof Map ? Object.fromEntries(payroll.earnedBreakdown) : payroll.earnedBreakdown)
          : {};
        const deductedRaw = payroll.deductionBreakdown
          ? (payroll.deductionBreakdown instanceof Map ? Object.fromEntries(payroll.deductionBreakdown) : payroll.deductionBreakdown)
          : {};

        const earnedList = Object.entries(earnedRaw).map(([k, v]) => ({ name: k, amount: v }));
        if (payroll.overtimePay > 0) {
          earnedList.push({ name: 'Overtime Pay', amount: payroll.overtimePay });
        }
        const deductedList = Object.entries(deductedRaw).map(([k, v]) => ({ name: k, amount: v }));

        const maxRows = Math.max(earnedList.length, deductedList.length, 4);
        const rows = [];
        for (let i = 0; i < maxRows; i++) {
          rows.push({
            earned: earnedList[i] || null,
            deducted: deductedList[i] || null
          });
        }

        const totalGross = payroll.grossSalary || 0;
        const totalDeductions = payroll.totalDeductions || (totalGross - (payroll.netSalary || 0));
        const netSalary = payroll.netSalary || 0;

        const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // 1. Header Box (Company & Logo)
        const headerH = 46;
        doc.rect(startX, startY, totalWidth, headerH).strokeColor('#000000').lineWidth(1).stroke();
        
        // Logo / Badge (Left 140pt)
        doc.rect(startX, startY, 140, headerH).strokeColor('#000000').stroke();
        doc.fillColor('#1E3A8A').font('Helvetica-Bold').fontSize(12).text(companyName.toUpperCase(), startX + 10, startY + 16, { width: 120, align: 'center' });

        // Company Details (Right)
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(12).text(companyName.toUpperCase(), startX + 150, startY + 12, { width: totalWidth - 160, align: 'center' });
        if (companyAddress) {
          doc.font('Helvetica').fontSize(8).text(companyAddress, startX + 150, startY + 28, { width: totalWidth - 160, align: 'center' });
        }
        startY += headerH;

        // 2. Month Bar
        const barH = 20;
        doc.fillColor('#F3F4F6').rect(startX, startY, totalWidth, barH).fill();
        doc.rect(startX, startY, totalWidth, barH).strokeColor('#000000').stroke();
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text(`Pay Register and Slip (With Form 25 B & Pay Slip for the month of ${periodLabel})`, startX, startY + 5, { width: totalWidth, align: 'center' });
        startY += barH;

        // 3. Employee Info Matrix (4 columns, 5 rows)
        const rowH = 17;
        const colW1 = 125;
        const colW2 = 136.5;
        const colW3 = 125;
        const colW4 = 136.5;

        const drawMatrixRow = (label1, val1, label2, val2) => {
          doc.rect(startX, startY, totalWidth, rowH).strokeColor('#000000').stroke();
          doc.moveTo(startX + colW1, startY).lineTo(startX + colW1, startY + rowH).stroke();
          doc.moveTo(startX + colW1 + colW2, startY).lineTo(startX + colW1 + colW2, startY + rowH).stroke();
          doc.moveTo(startX + colW1 + colW2 + colW3, startY).lineTo(startX + colW1 + colW2 + colW3, startY + rowH).stroke();

          doc.fillColor('#000000').font('Helvetica').fontSize(8).text(label1, startX + 5, startY + 4.5);
          doc.font('Helvetica-Bold').fontSize(8).text(val1, startX + colW1 + 5, startY + 4.5, { width: colW2 - 10, lineBreak: false });
          doc.font('Helvetica').fontSize(8).text(label2, startX + colW1 + colW2 + 5, startY + 4.5);
          doc.font('Helvetica-Bold').fontSize(8).text(val2, startX + colW1 + colW2 + colW3 + 5, startY + 4.5, { width: colW4 - 10, lineBreak: false });
          startY += rowH;
        };

        drawMatrixRow('Employee Name', empName, 'Date of Joining', dojFormatted);
        drawMatrixRow('Employee Code', empId, 'Uan Number / ESI Number', uanEsi);
        drawMatrixRow('Department', department, 'Total Month Days', totalMonthDays);
        drawMatrixRow('Designation', designation, 'Total Paid Days', totalPaidDays);
        drawMatrixRow('Gross Salary Per Month', `Rs.${fmt(grossSalaryPerMonth)}/-`, 'Loss of Pay Days', lopDays);

        // 4. Earnings & Deductions Headers
        const sectionH = 18;
        doc.fillColor('#D8A3A3').rect(startX, startY, halfWidth, sectionH).fill();
        doc.fillColor('#D8A3A3').rect(startX + halfWidth, startY, halfWidth, sectionH).fill();
        doc.rect(startX, startY, totalWidth, sectionH).strokeColor('#000000').stroke();
        doc.moveTo(startX + halfWidth, startY).lineTo(startX + halfWidth, startY + sectionH).stroke();

        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5).text('Earnings & Reimbursement', startX, startY + 4.5, { width: halfWidth, align: 'center' });
        doc.text('Deductions & Recoveries', startX + halfWidth, startY + 4.5, { width: halfWidth, align: 'center' });
        startY += sectionH;

        // 5. Subheaders (Particulars & Amount)
        const subH = 16;
        const partW = 160;
        const amtW = halfWidth - partW; // 101.5

        doc.fillColor('#F2DEDE').rect(startX, startY, totalWidth, subH).fill();
        doc.rect(startX, startY, totalWidth, subH).strokeColor('#000000').stroke();
        doc.moveTo(startX + partW, startY).lineTo(startX + partW, startY + subH).stroke();
        doc.moveTo(startX + halfWidth, startY).lineTo(startX + halfWidth, startY + subH).stroke();
        doc.moveTo(startX + halfWidth + partW, startY).lineTo(startX + halfWidth + partW, startY + subH).stroke();

        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text('Particulars', startX, startY + 4, { width: partW, align: 'center' });
        doc.text('Amount', startX + partW, startY + 4, { width: amtW, align: 'center' });
        doc.text('Particulars', startX + halfWidth, startY + 4, { width: partW, align: 'center' });
        doc.text('Amount', startX + halfWidth + partW, startY + 4, { width: amtW, align: 'center' });
        startY += subH;

        // 6. Breakdown Rows
        const itemH = 16;
        rows.forEach(r => {
          doc.rect(startX, startY, totalWidth, itemH).strokeColor('#000000').stroke();
          doc.moveTo(startX + partW, startY).lineTo(startX + partW, startY + itemH).stroke();
          doc.moveTo(startX + halfWidth, startY).lineTo(startX + halfWidth, startY + itemH).stroke();
          doc.moveTo(startX + halfWidth + partW, startY).lineTo(startX + halfWidth + partW, startY + itemH).stroke();

          doc.fillColor('#000000').font('Helvetica').fontSize(8);
          if (r.earned) {
            doc.text(r.earned.name, startX + 5, startY + 4, { width: partW - 10 });
            doc.text(fmt(r.earned.amount), startX + partW + 2, startY + 4, { width: amtW - 7, align: 'right' });
          }
          if (r.deducted) {
            doc.text(r.deducted.name, startX + halfWidth + 5, startY + 4, { width: partW - 10 });
            doc.text(fmt(r.deducted.amount), startX + halfWidth + partW + 2, startY + 4, { width: amtW - 7, align: 'right' });
          }
          startY += itemH;
        });

        // 7. Totals Row
        const totH = 18;
        doc.rect(startX, startY, totalWidth, totH).strokeColor('#000000').stroke();
        doc.moveTo(startX + partW, startY).lineTo(startX + partW, startY + totH).stroke();
        doc.moveTo(startX + halfWidth, startY).lineTo(startX + halfWidth, startY + totH).stroke();
        doc.moveTo(startX + halfWidth + partW, startY).lineTo(startX + halfWidth + partW, startY + totH).stroke();

        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5);
        doc.text('Total Earnings', startX + 5, startY + 4.5);
        doc.text(fmt(totalGross), startX + partW + 2, startY + 4.5, { width: amtW - 7, align: 'right' });
        doc.text('Total Deductions', startX + halfWidth + 5, startY + 4.5);
        doc.text(fmt(totalDeductions), startX + halfWidth + partW + 2, startY + 4.5, { width: amtW - 7, align: 'right' });
        startY += totH;

        // 8. Net Salary Row
        const netH = 20;
        doc.rect(startX, startY, totalWidth, netH).strokeColor('#000000').stroke();
        doc.moveTo(startX + halfWidth + partW, startY).lineTo(startX + halfWidth + partW, startY + netH).stroke();

        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
        doc.text('Net Salary', startX + halfWidth + 5, startY + 5.5, { width: partW - 10, align: 'right' });
        doc.fontSize(10).text(fmt(netSalary), startX + halfWidth + partW + 2, startY + 5, { width: amtW - 7, align: 'right' });
        startY += netH + 12;

        // 9. Bottom Banking Details & Words
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8.5).text('Net Pay', startX, startY);
        doc.font('Helvetica-Bold').text(`: ${numberToWords(netSalary)}`, startX + 90, startY);
        startY += 14;

        doc.font('Helvetica').fontSize(8.5).text('Bank Name', startX, startY);
        doc.text(`: ${bankName}`, startX + 90, startY);
        startY += 14;

        doc.font('Helvetica').fontSize(8.5).text('Bank A/c.No', startX, startY);
        doc.text(`: ${bankAccount}`, startX + 90, startY);
        startY += 20;

        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text('This is a computer generated payslip does not require signature', startX, startY);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
};

export default pdfService;
