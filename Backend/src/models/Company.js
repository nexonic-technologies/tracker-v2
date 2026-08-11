import mongoose from 'mongoose';

/**
 * Company — Stores company profile, branding, contacts, and emails for system-wide document & email generation.
 */
const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true, default: "Workhub", trim: true },
  legalName: { type: String, default: "Axinix Technologies Pvt. Ltd.", trim: true },
  tagline: { type: String, default: "Make New Generation Applications" },
  aboutText: {
    type: String,
    default: "Axinix Technologies Pvt. Ltd. is a conglomerate with the vision 'Leverage Technology to Enable Outcomes that Matter', focuses on cutting-edge technology areas in Biometric, IoT, Cloud, & IT System Integration solutions and IT infrastructure management services."
  },
  logoUrl: { type: String },
  website: { type: String, default: "www.axinixtech.com" },

  // Department Email Contacts
  hrEmail: { type: String, default: "hr@axinixtech.com", lowercase: true, trim: true },
  itEmail: { type: String, default: "it@axinixtech.com", lowercase: true, trim: true },
  payrollEmail: { type: String, default: "payroll@axinixtech.com", lowercase: true, trim: true },
  contactEmail: { type: String, default: "prism@axinixtech.com", lowercase: true, trim: true },

  address: {
    street: { type: String, default: "Headquarters, Main Road" },
    city: { type: String, default: "coimbatore" },
    state: { type: String, default: "Tamil Nadu" },
    country: { type: String, default: "India" },
    zip: { type: String, default: "641001" }
  },

  isDefault: { type: Boolean, default: true, index: true }
}, { timestamps: true });

export default mongoose.model('Company', companySchema);
