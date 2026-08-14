/**
 * candidates.js — Service hooks for recruitment pipeline.
 * Handles stage transitions, interview scheduling, offer/rejection,
 * and auto-creates Employee + Onboarding on Hired.
 *
 * ARCHITECTURE: All model access is resolved via ctx.tenantContext.getModel()
 * to enforce multi-tenant isolation. Zero static model imports.
 */
export default function candidates() {
  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      body.createdBy = user?.id;
      body.stage = body.stage || 'Applied';
      if (!body.applicationId) {
        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        body.applicationId = `APP-${year}-${rand}`;
      }
      body.stageHistory = [{
        stage: body.stage,
        movedAt: new Date(),
        movedBy: user?.id,
        note: 'Application submitted'
      }];
      return body;
    },

    async beforeUpdate(ctx) {
      const { body, docId, user, tenantContext } = ctx;
      const userId = user?.id;
      if (!docId) return body;

      const Candidate = tenantContext.getModel('Candidate');
      const existing = await Candidate.findById(docId).lean();
      if (!existing) throw new Error('Candidate not found');

      if (body.stage && body.stage !== existing.stage) {
        const VALID = {
          Applied: ['Screening', 'Rejected', 'Withdrawn'],
          Screening: ['Interview', 'Rejected', 'Withdrawn'],
          Interview: ['Offered', 'Rejected', 'Withdrawn'],
          Offered: ['Hired', 'Rejected', 'Withdrawn'],
        };
        const allowed = VALID[existing.stage] || [];
        if (!allowed.includes(body.stage)) {
          throw new Error(`Invalid stage transition: ${existing.stage} → ${body.stage}`);
        }
        body.$push = body.$push || {};
        body.$push.stageHistory = {
          stage: body.stage, movedAt: new Date(), movedBy: userId, note: body.stageNote || ''
        };
        delete body.stageNote;
      }
      body._oldStage = existing.stage;
      return body;
    },

    async afterUpdate(ctx) {
      const { docId, body, user, tenantContext } = ctx;
      const userId = user?.id;
      if (!docId) return;

      const Candidate = tenantContext.getModel('Candidate');
      const candidate = await Candidate.findById(docId).lean();
      if (!candidate) return;

      // ─── STAGE: Offered ────────────────────────────────────────────────────
      if (body._oldStage !== 'Offered' && candidate.stage === 'Offered') {
        try {
          const JobOpening = tenantContext.getModel('JobOpening');
          const Department = tenantContext.getModel('Department');
          const Designation = tenantContext.getModel('Designation');
          const Employee = tenantContext.getModel('Employee');
          const EmailConfig = tenantContext.getModel('email_config');
          const Company = tenantContext.getModel('Company');

          const { default: pdfService } = await import('../utils/pdfService.js');
          const nodemailer = await import('nodemailer');
          const fs = await import('fs');
          const path = await import('path');
          const { fileURLToPath } = await import('url');

          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);

          const job = candidate.jobOpeningId ? await JobOpening.findById(candidate.jobOpeningId).lean() : null;
          const dept = job?.department ? await Department.findById(job.department).lean() : null;
          const desg = job?.designation ? await Designation.findById(job.designation).lean() : null;

          let company = await Company.findOne().lean();
          if (!company) {
            company = await Company.create({
              companyName: 'Axinix Technologies Group',
              legalName: 'Axinix Technologies Infomatic (India) Pvt. Ltd.',
              tagline: 'Leverage Technology to Enable Outcomes that Matter',
              aboutText: 'Axinix Technologies Group, a conglomerate with the vision "Leverage Technology to Enable Outcomes that Matter", focuses on cutting-edge technology areas in Biometric, IoT, Cloud, & IT System Integration solutions and IT infrastructure management services, under the banners of Axinix Technologies Infomatic, Axinix Technologies Techserve, Axinix Technologies Biometric and Axinix Technologies Galaxy. Headquartered in Chennai, with a geographic spread of 8 branches and 250+ satellite locations Pan-India, Axinix Technologies\'s 2200+ employee network offers exceptional services supporting a large client base across varied industry segments.',
              website: 'www.axinixtech.com',
              hrEmail: 'hr@axinixtech.com',
              itEmail: 'it@axinixtech.com',
              payrollEmail: 'payroll@axinixtech.com',
              contactEmail: 'prism@axinixtech.com'
            });
          }

          let managerName = 'Reporting Manager';
          let managerEmail = company.hrEmail || 'hr@axinixtech.com';
          if (body.reportingManager) {
            const mgrObj = await Employee.findById(body.reportingManager).lean();
            if (mgrObj) {
              managerName = `${mgrObj.basicInfo?.firstName || ''} ${mgrObj.basicInfo?.lastName || ''}`.trim();
              managerEmail = mgrObj.authInfo?.workEmail || mgrObj.basicInfo?.email || company.hrEmail;
            }
          }

          const jobData = {
            title: job?.title || 'Trainee Technical Engineer',
            departmentName: dept?.name || 'Engineering',
            designationName: desg?.title || 'Technical Engineer',
            department: job?.department,
            designation: job?.designation
          };

          const uploadsDir = path.resolve(__dirname, '../../uploads/offer_letters');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const pdfFilename = `offer_${candidate._id.toString()}_${Date.now()}.pdf`;
          const pdfPath = path.join(uploadsDir, pdfFilename);

          await pdfService.generateOfferLetter(candidate, jobData, company, pdfPath);

          // Update Candidate with offerLetterUrl
          const relativeUrl = `/uploads/offer_letters/${pdfFilename}`;
          await Candidate.findByIdAndUpdate(docId, { offerLetterUrl: relativeUrl });

          // Send email with PDF offer letter attachment
          const emailCfg = await EmailConfig.findOne();
          if (emailCfg && emailCfg.enabled) {
            const transporter = nodemailer.createTransport({
              host: emailCfg.host,
              port: emailCfg.port,
              secure: emailCfg.port === 465,
              auth: { user: emailCfg.username, pass: emailCfg.password },
              tls: { rejectUnauthorized: false }
            });

            const joiningDateStr = candidate.joiningDate ? new Date(candidate.joiningDate).toLocaleDateString('en-IN') : 'To Be Confirmed';
            const joiningLocation = job?.location || candidate.address?.city || 'Coimbatore';

            const annualCTC = Number(candidate.offeredSalary) || 150024;
            const monthlyCTC = Math.round(annualCTC / 12);
            const monthlyESI = Math.round(monthlyCTC * 0.0315);
            const monthlyGross = monthlyCTC - monthlyESI;
            const monthlyDeductionESI = Math.round(monthlyGross * 0.0075) || 91;
            const monthlyNetPay = monthlyGross - monthlyDeductionESI;

            const emailSubject = `Offer Letter - ${company.companyName}`;
            const preJoiningUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/hrms`;

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 25px; border-radius: 8px; color: #1e293b; line-height: 1.6;">
                <p style="font-size: 15px; font-weight: bold; margin-bottom: 5px;">Dear ${candidate.firstName} ${candidate.lastName || ''},</p>
                <p style="margin-top: 0; color: #059669; font-weight: bold;">Greetings from ${company.companyName}!</p>
                
                <p style="text-align: justify; color: #334155; font-size: 13px;">
                  ${company.aboutText}
                </p>
                
                <p style="color: #334155; font-size: 13px;">
                  We congratulate you on being selected for the post of <strong>${jobData.title}</strong>. You are advised to report for training/joining on <strong>${joiningDateStr}</strong> at <strong>${joiningLocation}</strong>. You will report to <strong>${managerName}</strong> during the period of training/induction.
                </p>
                
                <p style="color: #334155; font-size: 13px;">
                  Upon selection you will be paid a monthly stipend/salary of <strong>Rs. ${monthlyNetPay.toLocaleString('en-IN')}/- p.m.</strong> (Net Pay). The detailed structure is attached in the Annexure PDF. Kindly note that it is protected for maintaining confidentiality.
                </p>
                
                <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; padding: 12px 15px; margin: 15px 0; font-size: 13px; border-radius: 4px;">
                  <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">Please ensure that all documents as specified below are mandatorily uploaded on the Candidate Self-Registration Portal (CSRP) before your date of joining:</p>
                  <ol style="margin: 0; padding-left: 20px; color: #334155;">
                    <li>Updated resume</li>
                    <li>Passport Size Photo</li>
                    <li>Educational Documents – 10th/SSLC, 12th/HSC and provisional certificate or course completion certificate</li>
                    <li>Offer letter, pay slips, and experience certificate if previously employed</li>
                    <li>Professional Certifications if any</li>
                  </ol>
                </div>
                
                <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; margin: 15px 0; font-size: 12px; color: #78350f; border-radius: 4px;">
                  <strong>Notice:</strong> Kindly note that this is only a Conditional offer letter and should not be construed as a letter of appointment from ${company.companyName}. A formal letter will be issued on your date of joining and upon satisfactory completion of:
                  <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                    <li>Background Verification</li>
                    <li>Medical fitness</li>
                    <li>Contract registration process (where applicable)</li>
                  </ul>
                </div>
                
                <p style="color: #334155; font-size: 13px;">
                  We take immense pleasure in inviting you to be a part of our organization on its journey in changing the future of technology, thereby changing the lives of all associated with us - for the best.
                </p>
                
                <p style="margin: 25px 0; text-align: center;">
                  <a href="${preJoiningUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">→ Pre - Joining Confirmation</a>
                </p>
                
                <p style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 13px; color: #334155;">
                  <strong>Regards,</strong><br><br>
                  <strong>HR Team</strong><br>
                  ${company.companyName}<br>
                  <span style="font-size: 11px; color: #94a3b8; font-style: italic;">This is a system-generated e-mail, please don't reply to this message.</span>
                </p>
              </div>
            `;

            const ccEmails = [company.hrEmail, company.payrollEmail].filter(Boolean);

            await transporter.sendMail({
              from: `"${company.companyName} HR" <${emailCfg.fromEmail}>`,
              to: candidate.email,
              cc: ccEmails.length > 0 ? ccEmails : undefined,
              subject: emailSubject,
              html: emailHtml,
              attachments: [
                {
                  filename: `Offer_Letter_${candidate.firstName}.pdf`,
                  path: pdfPath
                }
              ]
            });
            console.log(`[CandidatesHook] Offer letter generated with Annexure table and emailed to ${candidate.email} (CC: ${ccEmails.join(', ')})`);
          } else {
            console.warn('[CandidatesHook] SMTP email skipped: service not enabled or configured.');
          }
        } catch (err) {
          console.error('[CandidatesHook] Offered stage hook error:', err.message);
        }
      }

      // ─── STAGE: Hired ──────────────────────────────────────────────────────
      if (body._oldStage !== 'Hired' && candidate.stage === 'Hired') {
        const mongoose = (await import('mongoose')).default;
        let session = null;
        try {
          session = await mongoose.startSession();
          session.startTransaction();
        } catch (sErr) {
          session = null;
        }

        try {
          const Employee = tenantContext.getModel('Employee');
          const JobOpening = tenantContext.getModel('JobOpening');
          const Onboarding = tenantContext.getModel('Onboarding');
          const OnboardingTemplate = tenantContext.getModel('OnboardingTemplate');
          const bcrypt = await import('bcryptjs');

          const job = candidate.jobOpeningId ? await JobOpening.findById(candidate.jobOpeningId).session(session).lean() : null;

          let hashedPassword = '';
          if (body.password) {
            const salt = await bcrypt.genSalt(12);
            hashedPassword = await bcrypt.hash(body.password, salt);
          }

          // Create Employee in initial 'Onboarding' status
          const empArray = await Employee.create([{
            basicInfo: {
              firstName: candidate.firstName,
              lastName: candidate.lastName || '',
              email: candidate.email,
              phone: candidate.phone || '',
              dob: candidate.dob || null,
              gender: candidate.gender || null,
              maritalStatus: candidate.maritalStatus || null,
              fatherName: candidate.fatherName || '',
              motherName: candidate.motherName || '',
              address: candidate.address || {},
            },
            professionalInfo: {
              empId: body.empId || `EMP-${Date.now().toString().slice(-6)}`,
              role: body.role || null,
              department: job?.department || null,
              designation: job?.designation || null,
              dateOfJoining: candidate.joiningDate || new Date(),
              employmentType: job?.jobType || 'Full-Time',
              reportingManager: body.reportingManager || null,
              isActive: true,
            },
            authInfo: {
              workEmail: body.workEmail || candidate.email,
              password: hashedPassword
            },
            status: 'Onboarding'
          }], session ? { session } : {});

          const emp = empArray[0];

          await Candidate.findByIdAndUpdate(docId, { employeeId: emp._id }, session ? { session } : {});

          // Create Initial SalaryStructure via salaryRevisionService inside transaction session
          try {
            const { default: salaryRevisionService } = await import('./business/salaryRevisionService.js');
            const annualCTC = Number(candidate.offeredSalary) || 150024;
            await salaryRevisionService.createOrReviseStructure({
              employeeId: emp._id,
              ctc: annualCTC,
              effectiveFrom: candidate.joiningDate || new Date(),
              createdBy: userId,
              reason: 'Initial Hire Package',
              changeType: 'InitialBaseline',
              session
            });
          } catch (sErr) {
            console.warn('[CandidatesHook] SalaryStructure initialization warning:', sErr.message);
          }

          // ── 3-Tier Checklist Template Lookup ──
          let checklist = [];

          // Tier 1: OnboardingTemplate lookup
          try {
            let template = await OnboardingTemplate.findOne({
              department: job?.department,
              designation: job?.designation,
              employmentType: { $in: [job?.jobType || 'Full-Time', 'All'] },
              isActive: true
            }).session(session).lean();

            if (!template && job?.department) {
              template = await OnboardingTemplate.findOne({
                department: job?.department,
                isActive: true
              }).session(session).lean();
            }

            if (!template) {
              template = await OnboardingTemplate.findOne({
                isDefault: true,
                isActive: true
              }).session(session).lean();
            }

            if (template && template.checklist && template.checklist.length > 0) {
              const joiningBase = candidate.joiningDate ? new Date(candidate.joiningDate) : new Date();
              checklist = template.checklist.map(item => ({
                task: item.task,
                category: item.category || 'Other',
                documentType: item.documentType || null,
                isCompleted: false,
                dueDate: new Date(joiningBase.getTime() + (item.relativeDueDays || 0) * 86400000)
              }));
            }
          } catch (tErr) {
            console.warn('[CandidatesHook] OnboardingTemplate lookup warning:', tErr.message);
          }

          // Tier 2: Workflow engine lookup fallback
          if (checklist.length === 0) {
            try {
              const Workflow = tenantContext.getModel('Workflow');
              const onboardingWorkflow = await Workflow.findOne({
                modelName: 'onboardings',
                triggerType: 'Onboarding',
                isActive: true
              }).session(session).lean();

              if (onboardingWorkflow && onboardingWorkflow.steps && onboardingWorkflow.steps.length > 0) {
                checklist = onboardingWorkflow.steps.map(step => ({
                  task: step.requiredDocumentType ? `Upload ${step.requiredDocumentType}` : (step.updateStatusTo || 'Onboarding task'),
                  category: step.requiredDocumentType ? 'Documents' : 'Other',
                  documentType: step.requiredDocumentType || null,
                  isCompleted: false
                }));
              }
            } catch (wfErr) {
              console.warn('[CandidatesHook] Workflow lookup warning:', wfErr.message);
            }
          }

          // Tier 3: Default 16-item hardcoded checklist fallback
          if (checklist.length === 0) {
            const defaultDocTypes = [
              'Resume', 'Photo', 'PAN', 'Aadhaar', 'Passport', 'Degree',
              'Experience Letter', 'Relieving Letter', 'Offer Letter',
              'Joining Letter', 'Bank Proof', 'Medical Certificate'
            ];
            checklist = defaultDocTypes.map(docType => ({
              task: `Upload ${docType}`,
              category: 'Documents',
              documentType: docType,
              isCompleted: false
            }));

            checklist.push(
              { task: 'Laptop/desktop allocation', category: 'IT Setup', isCompleted: false },
              { task: 'Email & tool access', category: 'IT Setup', isCompleted: false },
              { task: 'NDA & agreement signed', category: 'HR Formalities', isCompleted: false },
              { task: 'Department induction', category: 'Training', isCompleted: false }
            );
          }

          const joiningDateObj = candidate.joiningDate ? new Date(candidate.joiningDate) : new Date();
          const targetCompletionDate = new Date(joiningDateObj.getTime() + 7 * 86400000); // 7 days after joining

          const onboardingArray = await Onboarding.create([{
            employeeId: emp._id,
            candidateId: candidate._id,
            joiningDate: joiningDateObj,
            targetCompletionDate,
            department: job?.department,
            designation: job?.designation,
            createdBy: userId,
            reportingTo: body.reportingManager || null,
            status: 'Pending',
            checklist
          }], session ? { session } : {});

          const createdOnboarding = onboardingArray[0];

          if (candidate.jobOpeningId) {
            await JobOpening.findByIdAndUpdate(candidate.jobOpeningId, { $inc: { filled: 1 } }, session ? { session } : {});
          }

          if (session) {
            await session.commitTransaction();
            session.endSession();
          }

          // Emit Domain Event for Onboarding Started
          try {
            const { default: domainEventService } = await import('../utils/domainEventService.js');
            domainEventService.emit('create', {
              eventId: `onboarding_start_${createdOnboarding._id}_${Date.now()}`,
              modelName: 'onboardings',
              modelId: createdOnboarding._id,
              actorId: userId
            });
          } catch (eErr) {
            console.warn('[CandidatesHook] Domain event emit failed:', eErr.message);
          }

        } catch (err) {
          if (session) {
            await session.abortTransaction();
            session.endSession();
          }
          console.error('[candidates.afterUpdate] Hired→Employee error (rolled back):', err.message);
        }
      }
    }
  };
}
