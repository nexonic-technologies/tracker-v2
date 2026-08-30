const VALID_STAGE_TRANSITIONS = {
  New: ['Discovery', 'Lost'],
  Discovery: ['Proposal', 'Lost'],
  Proposal: ['Negotiation', 'Lost'],
  Negotiation: ['Won', 'Lost'],
  Won: [],
  Lost: ['Discovery', 'Proposal']
};

const STAGE_PROBABILITIES = {
  New: 10,
  Discovery: 25,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0
};

export default function opportunities() {
  return {
    async beforeCreate(ctx) {
      const { body, userId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      if (!body.accountId) {
        throw new Error('Account ID (accountId) is required to create an Opportunity');
      }
      if (!body.name || !body.name.trim()) {
        throw new Error('Opportunity name is required');
      }

      // Verify Account exists
      const account = await models.clients.findById(body.accountId).lean();
      if (!account) {
        throw new Error(`Target Account "${body.accountId}" does not exist`);
      }

      // Auto-assign owner if not specified
      if (!body.ownerId && userId) {
        body.ownerId = userId;
      }
      if (userId) {
        body.createdBy = userId;
      }

      // Set probability from stage default if not manually overridden
      const stage = body.stage || 'New';
      if (body.probability === undefined) {
        body.probability = STAGE_PROBABILITIES[stage] ?? 10;
      }

      return body;
    },

    async beforeUpdate(ctx) {
      const { body, data: opportunity, docId } = ctx;
      const { default: models } = await import('../models/Collection.js');

      let currentOpp = opportunity;
      if (!currentOpp && docId) {
        currentOpp = await models.opportunities.findById(docId).lean();
      }

      if (!currentOpp) return;

      // 1. Declarative State Machine Validation
      if (body.stage && body.stage !== currentOpp.stage) {
        const allowed = VALID_STAGE_TRANSITIONS[currentOpp.stage] || [];
        if (!allowed.includes(body.stage)) {
          throw new Error(`Invalid opportunity stage transition: "${currentOpp.stage}" -> "${body.stage}"`);
        }

        // Auto-update probability to stage default if not manually overridden in body
        if (body.probability === undefined) {
          body.probability = STAGE_PROBABILITIES[body.stage] ?? currentOpp.probability;
        }

        // Set close date on terminal states
        if (body.stage === 'Won' || body.stage === 'Lost') {
          body.actualCloseDate = new Date();
        }

        // Validation for 'Lost'
        if (body.stage === 'Lost' && !body.lostReason && !currentOpp.lostReason) {
          throw new Error('Lost Reason is required when marking an opportunity as Lost');
        }

        // Validation for 'Won'
        if (body.stage === 'Won') {
          // If a quotation is linked, ensure it is in an approved state
          const quoteId = body.quotationId || currentOpp.quotationId;
          if (quoteId) {
            const quote = await models.quotations.findById(quoteId).lean();
            if (quote && !['Client Approved', 'Internally Approved', 'Converted to Order'].includes(quote.status)) {
              throw new Error(`Cannot win opportunity: Linked quotation ${quote.quotationNumber} is in "${quote.status}" status (must be Approved)`);
            }
          }
        }
      }
    },

    async afterUpdate(ctx) {
      const { body, data: opportunity, beforeDoc, userId } = ctx;
      const prevStage = beforeDoc?.stage || opportunity?.stage;
      const nextStage = body.stage;

      if (nextStage && prevStage !== nextStage) {
        try {
          const { default: models } = await import('../models/Collection.js');
          const oppId = opportunity?._id || ctx.docId;
          const accountId = opportunity?.accountId;

          // 1. Log immutable audit entry in CRMActivity
          if (accountId) {
            await models.crm_activities.create({
              clientId: accountId,
              type: 'System',
              content: `Opportunity "${opportunity?.name || 'Deal'}" stage changed from "${prevStage}" to "${nextStage}"`,
              performedBy: userId || null
            });
          }

          // 2. If Won, promote Account to Active if it was Inactive/Prospect
          if (nextStage === 'Won' && accountId) {
            await models.clients.findByIdAndUpdate(accountId, {
              Status: 'Active',
              leadStatus: 'Closed Won'
            });
          }
        } catch (err) {
          console.error('[Opportunities Service] Error during afterUpdate side-effects:', err.message);
        }
      }
    }
  };
}
