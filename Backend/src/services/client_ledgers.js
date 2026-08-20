export default function clients_ledgers() {
  return {
    async beforeCreate(ctx) {
      const { body, user } = ctx;
      const userId = user?.id;
      const { default: models } = await import('../models/Collection.js');

      // Enforce entryBy stamp
      if (!body.entryBy && userId) body.entryBy = userId;

      // Find the last ledger entry for this client to compute running balance
      const lastEntry = await models.clients_ledgers.findOne({ clientId: body.clientId })
        .sort({ date: -1, createdAt: -1 });

      const lastBalance = lastEntry ? lastEntry.runningBalance : 0;
      const change = body.type === 'Credit' ? body.amount : -body.amount;
      body.runningBalance = Number((lastBalance + change).toFixed(2));
    },

    async beforeUpdate(ctx) {
      throw new Error('Client Ledger entries are append-only and cannot be updated. Create adjustment entries for corrections.');
    },

    async beforeDelete(ctx) {
      throw new Error('Client Ledger entries are permanent and cannot be deleted.');
    }
  };
}
