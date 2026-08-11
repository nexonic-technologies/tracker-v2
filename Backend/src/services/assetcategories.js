// services/assets_categories.js
// Service hooks for the assets_categories collection.
// Loaded automatically by servicesCache.js — filename must match collection key in Collection.js.

import models from '../models/Collection.js';


export default function () {
  return {

    /**
     * beforeCreate
     * ─────────────
     * 1. Normalize code to UPPERCASE.
     * 2. Guard against duplicate code (case-insensitive).
     */
    beforeCreate: async (ctx) => {
      const { body } = ctx;
      const data = body;
      // 1. Normalize
      if (data.code) {
        data.code = data.code.toUpperCase().trim();
      }

      // 2. Duplicate code guard
      if (data.code) {
        const existing = await models.assets_categories.findOne({
          code: data.code,
          isActive: true
        }).lean();
        if (existing) {
          throw new Error(`Asset category code "${data.code}" already exists. Use a unique code.`);
        }
      }

      return data;
    },

    /**
     * beforeUpdate
     * ─────────────
     * 1. Normalize code if being updated.
     * 2. Guard duplicate code collision on update.
     */
    beforeUpdate: async (ctx) => {
      const { body, docId } = ctx;
      const data = body;
      if (data.code) {
        data.code = data.code.toUpperCase().trim();

        // Check collision with any other document (exclude self)
        const existing = await models.assets_categories.findOne({
          code: data.code,
          _id: { $ne: docId }
        }).lean();
        if (existing) {
          throw new Error(`Asset category code "${data.code}" is already used by another category.`);
        }
      }

      return data;
    },

  };
}

