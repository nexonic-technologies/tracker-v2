// src/services/notificationrules.js
import { invalidateRules } from '../utils/ruleCache.js';

export default function notificationrulesService() {
  return {
    async afterCreate(ctx) {
      invalidateRules();
    },
    async afterUpdate(ctx) {
      invalidateRules();
    },
    async afterDelete(ctx) {
      invalidateRules();
    }
  };
}
