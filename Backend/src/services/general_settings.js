// src/services/general_settings.js
import { encrypt } from '../utils/cryptoHelper.js';

export default function general_settingsService() {
  return {
    async beforeCreate(ctx) {
      const { body } = ctx;
      if (body?.notification?.firebase?.serviceAccountKey) {
        try {
          body.notification.firebase.serviceAccountKeyEncrypted = encrypt(body.notification.firebase.serviceAccountKey);
          delete body.notification.firebase.serviceAccountKey;
        } catch (err) {
          throw new Error(`Failed to encrypt Firebase credentials: ${err.message}`);
        }
      }
    },

    async beforeUpdate(ctx) {
      const { body } = ctx;
      if (body?.notification?.firebase?.serviceAccountKey) {
        try {
          body.notification.firebase.serviceAccountKeyEncrypted = encrypt(body.notification.firebase.serviceAccountKey);
          delete body.notification.firebase.serviceAccountKey;
        } catch (err) {
          throw new Error(`Failed to encrypt Firebase credentials: ${err.message}`);
        }
      }
    }
  };
}
