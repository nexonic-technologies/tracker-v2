import express from 'express';
import { setCache } from '../utils/cache.js';
import models from '../models/Collection.js';
import { getAllowedModelKeys } from '../models/tenantRegistry.js';
import pdfService from '../utils/pdfService.js';

const router = express.Router();

/**
 * Middleware: Verify user has authority to modify platform access policies
 */
const requirePolicyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const isSuperAdmin = req.user.isSuperAdmin === true || req.isSuperAdmin === true;
    const tenantSlug = (req.user.tenantSlug || req.user.tenantId || '').toLowerCase();
    const isGlobalAdmin = tenantSlug === 'admin' || tenantSlug === 'default' || req.user.tenantId === 'admin';

    if (!isSuperAdmin && !isGlobalAdmin) {
        return res.status(403).json({
            success: false,
            message: "⛔ Access Denied: Policy modification is restricted to platform administrators only."
        });
    }
    next();
};

// Get list of all available models for dropdowns
// ?fields=true → also returns top-level schema field names per model
router.get('/models', (req, res) => {
    try {
        let modelNames = Object.keys(models).sort();

        const allowedModelKeys = getAllowedModelKeys(req.enabledModules);
        if (allowedModelKeys) {
            modelNames = modelNames.filter(name => allowedModelKeys.has(name.toLowerCase()));
        }

        if (req.query.fields === 'true') {
            const fieldMap = {};
            for (const name of modelNames) {
                try {
                    const model = models[name];
                    if (model && model.schema && model.schema.paths) {
                        // Extract top-level paths, exclude Mongoose internals
                        const paths = Object.keys(model.schema.paths).filter(
                            (p) => !p.startsWith('__') && p !== '_id' && !p.startsWith('$')
                        );
                        // Deduplicate nested (e.g. "professionalInfo.dept" → "professionalInfo")
                        const topLevel = [...new Set(paths.map((p) => p.split('.')[0]))];
                        fieldMap[name] = topLevel.sort();
                    } else {
                        fieldMap[name] = [];
                    }
                } catch (err) {
                    console.error(`[Config] Error reading fields for model ${name}:`, err);
                    fieldMap[name] = [];
                }
            }
            return res.json({ success: true, models: modelNames, fields: fieldMap });
        }

        res.json({ success: true, models: modelNames });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch models' });
    }
});

router.post('/refresh-policy', requirePolicyAdmin, async (req, res) => {
    try {
        await setCache();
        res.json({
            success: true,
            message: 'Access Policy Cache Refreshed Successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Config] Policy refresh failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh cache',
            error: error.message
        });
    }
});

/**
 * POST /api/config/seed-model-policies
 * Body: { models: ['status_configss','status_mappings'], permissions: { read, create, update, delete } }
 *
 * Creates AccessPolicy records for ALL existing roles for each listed model,
 * then refreshes the policy cache. Safe to call multiple times (upsert).
 */
router.post('/seed-model-policies', requirePolicyAdmin, async (req, res) => {
    try {
        const { models: modelNames = [], permissions = {} } = req.body;

        if (!modelNames.length) {
            return res.status(400).json({ success: false, message: 'Provide models array' });
        }

        const perms = {
            read: permissions.read ?? true,
            create: permissions.create ?? true,
            update: permissions.update ?? true,
            delete: permissions.delete ?? false,
        };

        const roles = await models.roles.find({}).lean();
        if (!roles.length) {
            return res.status(400).json({ success: false, message: 'No roles found in DB' });
        }

        const ops = [];
        for (const role of roles) {
            for (const modelName of modelNames) {
                ops.push({
                    updateOne: {
                        filter: { role: role._id, modelName },
                        update: {
                            $setOnInsert: {
                                role: role._id,
                                modelName,
                                permissions: perms,
                                forbiddenAccess: { read: [], create: [], update: [], delete: [] },
                                allowAccess: { read: [], create: [], update: [], delete: [] },
                                registry: [],
                                conditions: {},
                            },
                        },
                        upsert: true,
                    },
                });
            }
        }

        const result = await models.access_policies.bulkWrite(ops);

        // Refresh cache so new policies take effect immediately (no restart needed)
        await setCache();

        res.json({
            success: true,
            message: `Policies seeded for [${modelNames.join(', ')}] across ${roles.length} roles`,
            upserted: result.upsertedCount,
            matched: result.matchedCount,
        });
    } catch (error) {
        console.error('[Config] seed-model-policies error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * Endpoint: Send Payslip Voucher directly to Employee's Email
 */
router.post('/payroll/email-payslip/:payrollId', async (req, res) => {
    try {
        const { payrollId } = req.params;
        const { targetEmail } = req.body;
        const tenantContext = req.tenantContext;

        const Payroll = tenantContext?.getModel ? tenantContext.getModel('payrolls') : models.payrolls;
        const EmailConfig = tenantContext?.getModel ? tenantContext.getModel('email_configs') : models.email_configs;

        const payroll = await Payroll.findById(payrollId).populate('employeeId').lean();
        if (!payroll) {
            return res.status(404).json({ success: false, message: 'Payroll record not found' });
        }

        const emp = payroll.employeeId;
        const recipientEmail = targetEmail || emp?.authInfo?.workEmail || emp?.contactInfo?.email || emp?.email || req.user?.email;

        if (!recipientEmail) {
            return res.status(400).json({ success: false, message: 'No recipient email address found for this employee' });
        }

        const Company = tenantContext?.getModel ? tenantContext.getModel('companies') : models.companies;
        const GeneralSettings = tenantContext?.getModel ? tenantContext.getModel('general_settings') : models.general_settings;

        const companyDoc = Company ? await Company.findOne().lean() : null;
        const gsDoc = !companyDoc && GeneralSettings ? await GeneralSettings.findOne().lean() : null;

        const companyName = companyDoc?.companyName || companyDoc?.legalName || gsDoc?.organization?.companyName || 'Corporate Payroll';
        const companyAddress = companyDoc?.address
            ? [companyDoc.address.street, companyDoc.address.city, companyDoc.address.state, companyDoc.address.zip].filter(Boolean).join(', ')
            : '';

        const empName = [emp?.basicInfo?.firstName, emp?.basicInfo?.lastName].filter(Boolean).join(' ') || '-';
        const empId = emp?.professionalInfo?.empId || '-';
        const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        const periodLabel = `${MONTHS[(payroll.month || 1) - 1]} ${payroll.year}`;

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

        // Generate Form 25 B PDF Buffer
        const pdfBuffer = await pdfService.generatePayslipPDFBuffer({
            payroll,
            employee: emp,
            company: companyDoc || gsDoc?.organization || {},
            periodLabel,
            numberToWords: numberToWordsINR
        });

        // Professional Corporate Notification Email Template
        const emailHtml = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;background:#ffffff;color:#1e293b;">
            <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid #f1f5f9;">
              <h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;text-transform:uppercase;">${companyName}</h2>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Human Resources & Payroll Department</p>
            </div>
            
            <div style="padding:20px 0;">
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#1e293b;">Dear <strong>${empName}</strong>,</p>
              <p style="margin:0 0 16px;font-size:13.5px;line-height:1.6;color:#334155;">
                Your payslip voucher for the month of <strong>${periodLabel}</strong> has been generated and processed. Please find your official <strong>Form 25 B Statutory Payslip</strong> attached to this email as a PDF document.
              </p>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:18px 0;">
                <table style="width:100%;font-size:13px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Employee Code:</td>
                    <td style="padding:6px 0;font-weight:600;text-align:right;color:#0f172a;">${empId}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Pay Period:</td>
                    <td style="padding:6px 0;font-weight:600;text-align:right;color:#0f172a;">${periodLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;">Paid Days / Total Days:</td>
                    <td style="padding:6px 0;font-weight:600;text-align:right;color:#0f172a;">${payroll.presentDays != null ? Number(payroll.presentDays).toFixed(1) : '-'} / ${payroll.workingDays != null ? Number(payroll.workingDays).toFixed(1) : '-'}</td>
                  </tr>
                  <tr style="border-top:1px solid #cbd5e1;">
                    <td style="padding:10px 0 4px;font-size:14px;font-weight:700;color:#0f172a;">Net Salary Disbursed:</td>
                    <td style="padding:10px 0 4px;font-size:15px;font-weight:700;text-align:right;color:#059669;font-family:monospace;">₹${(payroll.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </table>
              </div>

              <p style="margin:16px 0 0;font-size:12.5px;line-height:1.6;color:#64748b;">
                The attached PDF contains your complete salary register including detailed line-item earnings, reimbursements, statutory deductions (PF/ESI), and bank account transfer records.
              </p>
            </div>

            <div style="padding-top:16px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;line-height:1.5;">
              <p style="margin:0 0 4px;">This is an automated communication from ${companyName}. If you have questions regarding your payslip, please reach out to your HR department.</p>
            </div>
          </div>
        `;

        const { default: nodemailer } = await import('nodemailer');
        const emailConfig = EmailConfig ? await EmailConfig.findOne().lean() : null;

        if (!emailConfig) {
            return res.status(400).json({
                success: false,
                message: 'No email configuration found. Please configure your SMTP server under Settings > Email Configuration.'
            });
        }

        if (!emailConfig.enabled) {
            return res.status(400).json({
                success: false,
                message: 'Email service is currently disabled. Please enable it under Settings > Email Configuration.'
            });
        }

        if (!emailConfig.host || !emailConfig.port || !emailConfig.username || !emailConfig.password || !emailConfig.fromEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email configuration is incomplete. Host, Port, Username, Password, and From Email must be set in Settings > Email Configuration.'
            });
        }

        const portNum = Number(emailConfig.port);
        const isSecure = portNum === 465; // Port 465 uses direct SSL/TLS; Port 587/25 use STARTTLS (secure: false)

        const authUser = emailConfig.username.trim().toLowerCase();
        const authPass = emailConfig.password.trim().replace(/\s+/g, '');

        const transporter = nodemailer.createTransport({
            host: emailConfig.host.trim(),
            port: portNum,
            secure: isSecure,
            auth: {
                user: authUser,
                pass: authPass
            }
        });

        const fromAddress = emailConfig.fromName
            ? `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`
            : emailConfig.fromEmail;

        const safeFilename = `Payslip_${periodLabel.replace(/\s+/g, '_')}_${empId}.pdf`;

        await transporter.sendMail({
            from: fromAddress,
            to: recipientEmail,
            subject: `Payslip Voucher · ${periodLabel} - ${empName}`,
            html: emailHtml,
            attachments: [
                {
                    filename: safeFilename,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });

        res.json({
            success: true,
            message: `Payslip voucher PDF for ${periodLabel} sent to ${recipientEmail}`,
            recipient: recipientEmail
        });
    } catch (error) {
        console.error('[PayrollEmail] Error sending email:', error);
        res.status(500).json({
            success: false,
            message: `Failed to dispatch email: ${error.message || 'SMTP server connection failure'}`
        });
    }
});

export default router;
