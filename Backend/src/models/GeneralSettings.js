// src/models/general_settings.js
import mongoose from 'mongoose';

const general_settingsSchema = new mongoose.Schema({
  version: { type: Number, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'employees' },

  organization: {
    companyName: { type: String, default: "Work Hub ERP" },
    branding: {
      logoUrl: { type: String },
      primaryColor: { type: String, default: "#6366F1" }
    }
  },

  localization: {
    timezone: { type: String, default: "Asia/Kolkata" },
    timezoneOffset: { type: Number, default: 330 }, // Offset in minutes
    currency: { type: String, default: "INR" }
  },

  release: {
    web: {
      currentVersion: { type: String, default: "1.0.0" },
      minimumVersion: { type: String, default: "1.0.0" },
      buildNumber: { type: Number, default: 1 },
      releaseNotes: { type: String },
      releasedBy: { type: String },
      releaseDate: { type: Date },
      rollbackVersion: { type: String },
      forceUpdate: { type: Boolean, default: false },
      maintenanceRequired: { type: Boolean, default: false }
    },
    android: {
      currentVersion: { type: String, default: "1.0.0" },
      minimumVersion: { type: String, default: "1.0.0" },
      buildNumber: { type: Number, default: 1 },
      releaseNotes: { type: String },
      releasedBy: { type: String },
      releaseDate: { type: Date },
      rollbackVersion: { type: String },
      forceUpdate: { type: Boolean, default: false },
      maintenanceRequired: { type: Boolean, default: false }
    },
    ios: {
      currentVersion: { type: String, default: "1.0.0" },
      minimumVersion: { type: String, default: "1.0.0" },
      buildNumber: { type: Number, default: 1 },
      releaseNotes: { type: String },
      releasedBy: { type: String },
      releaseDate: { type: Date },
      rollbackVersion: { type: String },
      forceUpdate: { type: Boolean, default: false },
      maintenanceRequired: { type: Boolean, default: false }
    }
  },

  maintenance: {
    globalEnabled: { type: Boolean, default: false },
    webEnabled: { type: Boolean, default: false },
    mobileEnabled: { type: Boolean, default: false },
    message: { type: String, default: 'System is currently undergoing scheduled maintenance.' },
    // Per-platform role bypass — matched against req.user.role (string, no DB lookup)
    bypassRoles: {
      web: [{ type: String }],   // e.g. ["Super Admin", "Manager"]
      mobile: [{ type: String }]    // e.g. ["Super Admin"]
    },
    scheduledStart: { type: Date }, // display-only for MVP
    scheduledEnd: { type: Date }  // used for frontend countdown
  },

  // ETA auto-calculation config
  taskETA: {
    enabled: { type: Boolean, default: true },
    multiplier: { type: Number, default: 3 }
    // deliveryHours = queueAheadHours + (taskEstimatedHours × multiplier)
  },

  notification: {
    enabled: { type: Boolean, default: true },
    useDynamicNotifications: { type: Boolean, default: false },
    defaultProviders: { type: [String], default: ['socket'] },
    firebase: {
      enabled: { type: Boolean, default: false },
      apiKey: { type: String },
      authDomain: { type: String },
      projectId: { type: String },
      storageBucket: { type: String },
      messagingSenderId: { type: String },
      appId: { type: String },
      measurementId: { type: String },
      vapidKey: { type: String },
      serviceAccountKeyEncrypted: { type: String } // AES-256 encrypted string
    }
  },

  payroll: {
    pfCeiling: { type: Number, default: 15000 },
    pfPercent: { type: Number, default: 12 },
    esiThreshold: { type: Number, default: 21000 },
    esiPercent: { type: Number, default: 0.75 },
    esiEmployerPercent: { type: Number, default: 3.25 },  // Employer ESI rate
    roundOff: { type: Boolean, default: true }            // Round off net and line items to nearest rupee
  },

  // ── Finance / Accounting ──────────────────────────────────────────────────
  // Single source of truth for financial year configuration.
  // FY label (e.g. 'FY2025-26') is derived at query time via utils/financialYear.js.
  // Never store FY labels on individual documents — always derive from here.
  finance: {
    financialYearStart: { type: Number, default: 4, min: 1, max: 12 },
    // 4 = April  (Indian standard: Apr–Mar)
    // 1 = January (calendar year)
    // 7 = July   (some countries)

    expenseDailyLimit: { type: Number, default: 10000 },   // Max ₹ per day per employee
    expenseLimitByCategory: {
      travel: { type: Number, default: 5000 },
      accommodation: { type: Number, default: 3000 },
      food: { type: Number, default: 1000 },
      miscellaneous: { type: Number, default: 2000 }
    },

    salaryRevisionAlertThreshold: { type: Number, default: 30 }, // % CTC change triggers alert
    payrollVarianceAlertThreshold: { type: Number, default: 20 } // % gross change month-on-month
  },

  attendance: {
    workingHours: { type: Number, default: 8 },
    lateGraceMinutes: { type: Number, default: 15 }
  },

  storage: {
    activeProvider: { type: String, enum: ['local', 's3', 'r2', 'azure', 'gcs', 'minio'], default: 'local' }
  },

  cron: [{
    jobName: { type: String, required: true }, // e.g., "AttendanceCron"
    enabled: { type: Boolean, default: true },
    cronExpression: { type: String, default: "22 01 * * *" },
    timezone: { type: String, default: "Asia/Kolkata" }
  }]
}, { timestamps: true });

export default mongoose.model('general_settings', general_settingsSchema);
