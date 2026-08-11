// services/assets_invoices.js
// Service hooks for the assets_invoices collection.
// Loaded automatically by servicesCache.js.

import models from '../models/Collection.js';


export default function () {
  return {
    /**
     * beforeCreate
     */
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      const data = body;

      // Enforce default status
      if (!data.status) {
        data.status = 'Pending';
      }

      return data;
    }
  };
}

