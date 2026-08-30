import models from '../models/Collection.js';


const crm_meetings = {
  async beforeUpdate(ctx) {
    const { body, data: meeting } = ctx;
    // Lifecycle transitions
    if (body.status === 'Started' && !meeting.actualStartTime) {
      body.actualStartTime = new Date();
    }

    if (body.status === 'Completed' && !meeting.actualEndTime) {
      body.actualEndTime = new Date();
    }
  },

  async afterUpdate(ctx) {
    const { body, data: meeting } = ctx;
    // If meeting is completed, create follow-up activity if nextAction is provided
    if (body.status === 'Completed') {
      console.log(`[CRM Meeting Service] Meeting ${meeting._id} completed by ${body.updatedBy || 'unknown'}. Outcome: ${body.outcome || 'No outcome recorded'}`);

      if (body.nextAction) {
        try {
          const { default: CRMActivity } = await import('../models/CRMActivity.js');
          await CRMActivity.create({
            clientId: meeting.clientId,
            type: 'Task',
            content: `Follow-up Task: ${body.nextAction} (Scheduled for: ${body.nextActionDate ? new Date(body.nextActionDate).toLocaleDateString() : 'Not Set'})`,
            performedBy: meeting.createdBy || null,
            timestamp: body.nextActionDate ? new Date(body.nextActionDate) : new Date()
          });
        } catch (err) {
          console.error('[CRM Meeting Service] Error creating follow-up task activity:', err.message);
        }
      }
    }
  },

  /**
   * C-01: CRM Lead & Activity Pipeline Report
   */
  async beforeReport(ctx) {
    const { default: reportService } = await import('./business/reportService.js');
    const startDate = ctx.query?.startDate || ctx.body?.startDate || null;
    const endDate = ctx.query?.endDate || ctx.body?.endDate || null;

    const data = await reportService.getCRMActivityPipelineReport(startDate, endDate);
    return { data };
  }
};

export default () => crm_meetings;

