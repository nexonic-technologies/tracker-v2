/**
 * onboardings.js — Service hooks for onboarding checklist.
 * Auto-computes completionPercent, verifiedPercent, state machine transitions,
 * Ready To Join gate, and Active Employee activation.
 */
export default function onboardings() {
  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      body.createdBy = user?.id;
      body.status = body.status || 'Pending';
      body.completionPercent = 0;
      body.verifiedPercent = 0;
      return body;
    },

    async afterUpdate(ctx) {
      const { docId, user } = ctx;
      if (!docId) return;

      const { default: Onboarding } = await import('../models/Onboarding.js');
      const { default: Employee } = await import('../models/Employee.js');
      const { default: NotificationDispatcher } = await import('./NotificationDispatcher.js');

      const doc = await Onboarding.findById(docId);
      if (!doc || !doc.checklist || doc.checklist.length === 0) return;

      // Ignore updates if already in terminal exception states (Cancelled, Postponed, No Show)
      if (['Cancelled', 'Postponed', 'No Show'].includes(doc.status) && !ctx.body?.status) {
        return;
      }

      const total = doc.checklist.length;
      const completed = doc.checklist.filter(c => c.isCompleted).length;
      const completionPct = Math.round((completed / total) * 100);

      // Document verification metrics
      const docItems = doc.checklist.filter(c => c.category === 'Documents' || c.documentType);
      const totalDocs = docItems.length;
      const verifiedDocs = docItems.filter(c => c.verified).length;
      const verifiedPct = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 100;

      const unuploadedDocs = docItems.filter(c => !c.fileUrl && !c.isCompleted);
      const pendingVerificationDocs = docItems.filter(c => c.fileUrl && !c.verified);

      const updates = { 
        completionPercent: completionPct,
        verifiedPercent: verifiedPct
      };

      const oldStatus = doc.status;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const joiningDateObj = doc.joiningDate ? new Date(doc.joiningDate) : new Date();
      joiningDateObj.setHours(0, 0, 0, 0);

      const isFullyDone = completionPct === 100 && (totalDocs === 0 || verifiedPct === 100);

      if (isFullyDone) {
        if (today < joiningDateObj) {
          // ── READY TO JOIN GATE ──
          // Onboarding complete before joining day -> Hold in Ready To Join & ReadyToJoin employee status
          updates.status = 'Ready To Join';
          await Employee.findByIdAndUpdate(doc.employeeId, { status: 'ReadyToJoin' });
        } else {
          // ── DAY-1 / POST-JOINING ACTIVATION ──
          updates.status = 'Completed';
          updates.joinedAt = doc.joinedAt || new Date();
          updates.completedAt = new Date();
          await Employee.findByIdAndUpdate(doc.employeeId, { 
            status: 'Active',
            'professionalInfo.confirmDate': new Date()
          });
        }
      } else if (completionPct > 0 || total - completed < total) {
        if (unuploadedDocs.length > 0) {
          updates.status = 'Documents Pending';
        } else if (pendingVerificationDocs.length > 0) {
          updates.status = 'Verification Pending';
        } else {
          updates.status = 'In Progress';
        }
      }

      await Onboarding.findByIdAndUpdate(docId, { $set: updates });

      // Notify reporting manager/HR if status transitioned
      if (updates.status && updates.status !== oldStatus) {
        try {
          const recipients = [];
          if (doc.reportingTo) recipients.push(doc.reportingTo.toString());
          if (doc.createdBy) recipients.push(doc.createdBy.toString());

          if (recipients.length > 0) {
            await NotificationDispatcher.dispatch({
              recipients: [...new Set(recipients)],
              sender: user?.id || doc.createdBy,
              title: `Onboarding Status: ${updates.status}`,
              message: `Employee onboarding for ${doc.employeeId} transitioned to ${updates.status} (${completionPct}% complete).`,
              type: 'system',
              meta: { model: 'onboardings', modelId: doc._id },
              path: '/hrms'
            });
          }
        } catch (nErr) {
          console.warn('[onboardings.afterUpdate] Notification warning:', nErr.message);
        }
      }
    }
  };
}
