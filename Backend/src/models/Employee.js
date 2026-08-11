// models/Employee.js
import { Schema, model } from 'mongoose';

const EmployeeSchema = new Schema({
  basicInfo: {
    firstName: { type: String, trim: true, index: true },
    lastName: { type: String, trim: true, index: true },
    dob: { type: Date },
    /** Date of Anniversary (Wedding Anniversary) */
    doa: { type: Date },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
    gender: { type: String, enum: ['male', 'female', 'other'], index: true },
    phone: { type: String, validate: { validator: function (v) { return !v || /^(\+\d{1,3}[- ]?)?\d{10}$/.test(v); }, message: props => `${props.value} is not a valid phone number!` } },
    email: { type: String, lowercase: true, trim: true, index: true, validate: { validator: function (v) { return !v || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v); }, message: props => `${props.value} is not a valid email!` } },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    },
    profileImage: { type: String }
  },
  professionalInfo: {
    empId: { type: String, trim: true, unique: true },
    designation: { type: Schema.Types.ObjectId, ref: 'designations', index: true },
    department: { type: Schema.Types.ObjectId, ref: 'departments', index: true },
    role: { type: Schema.Types.ObjectId, ref: 'roles', index: true },
    reportingManager: { type: Schema.Types.ObjectId, ref: 'employees', index: true },
    teamLead: { type: Schema.Types.ObjectId, ref: 'employees', index: true },
    level: { type: String, enum: ['L1', 'L2', 'L3', 'L4'], index: true },
    doj: { type: Date, index: true },
    probationPeriod: { type: String },
    confirmDate: { type: Date },
    leavePolicyOverride: { type: Schema.Types.ObjectId, ref: 'leave_policies', index: true },
    policyAssignments: [{
      policy: { type: Schema.Types.ObjectId, ref: 'attendance_policies', required: true },
      shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, default: null } // null = current active
    }]
  },
  authInfo: {
    workEmail: { type: String, lowercase: true, trim: true, unique: true, validate: { validator: function (v) { return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v); }, message: props => `${props.value} is not a valid email!` } },
    password: { type: String },
    googleEmail: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    googleLoginEnabled: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date }
  },

  accountDetails: {
    accountName: { type: String },
    accountNo: { type: String },
    bankName: { type: String },
    branch: { type: String },
    ifscCode: { type: String, validate: { validator: function (v) { return !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v); }, message: props => `${props.value} is not a valid IFSC code!` } },
  },
  salaryStructure: { type: Schema.Types.ObjectId, ref: 'salary_structures', default: null, index: true },
  personalDocuments: {
    pan: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: props => `${props.value} is not a valid PAN number!`
      }
    },
    aadhar: { type: String, validate: { validator: function (v) { return !v || /^\d{12}$/.test(v); }, message: props => `${props.value} is not a valid Aadhar number!` } },
    esi: { type: String },
    pf: { type: String },
    documentFiles: [{ type: String }]
  },
  professionalDocuments: {
    offerLetter: { type: String },
    appraisalLetter: { type: String },
    otherDocuments: [{ type: String }]
  },
  leaveStatus: [{
    leaveType: { type: Schema.Types.ObjectId, ref: "leave_types" },
    usedThisMonth: { type: Number, default: 0 },
    usedThisYear: { type: Number, default: 0 },
    carriedForward: { type: Number, default: 0 },
    available: { type: Number, default: 0 }
  }],
  status: { type: String, enum: ['Onboarding', 'ReadyToJoin', 'Active', 'Inactive', 'Terminated'], default: 'Active', index: true },
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Compound indexes for team and role-based filtering
EmployeeSchema.index({ 'professionalInfo.reportingManager': 1, 'status': 1 });
EmployeeSchema.index({ 'professionalInfo.teamLead': 1, 'status': 1 });
EmployeeSchema.index({ 'professionalInfo.department': 1, 'status': 1 });
EmployeeSchema.index({ 'professionalInfo.role': 1, 'status': 1 });
EmployeeSchema.index({ 'basicInfo.firstName': 1, 'basicInfo.lastName': 1 }); // Name search
EmployeeSchema.index({ 'isActive': 1, 'status': 1, 'isDeleted': 1 }); // Active employee queries

export default model('employees', EmployeeSchema);