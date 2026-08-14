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
  }
};

export default pdfService;
