import mongoose from "mongoose";

const ExpenseItemSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    enum: ["travel", "accommodation", "miscellaneous", "food"],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
  // GST tracking for input credit analysis
  isGSTApplicable: { type: Boolean, default: false },
  gstAmount: { type: Number, default: 0, min: 0 },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }]
});

const ExpenseSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true, index: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "clients", required: true, index: true },

  // Optional project linkage — enables project-level expense reports
  projectTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "project_types", default: null, index: true },

  // Is this expense billable to the client? Affects client margin calculation.
  isBillable: { type: Boolean, default: false },

  date: { type: Date, required: true, index: true },

  // Derived from date at beforeCreate — 'YYYY-MM' for period closure queries
  // Example: date=2026-06-15 → expensePeriod='2026-06'
  expensePeriod: { type: String, index: true },

  expenses: [ExpenseItemSchema],

  dayTotal: { type: Number, required: true, min: 0 }, // Sum of all item amounts
  totalExpenses: { type: Number, required: true, min: 0 }, // Count of items (legacy field name retained)

  status: {
    type: String,
    default: "pending",
    index: true
  },

  metaStatus: {
    type: String,
    default: 'active',
    index: true
  },

  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" },
  approvedAt: { type: Date },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },

  // Reimbursement tracking — when was the employee actually paid?
  reimbursedAt: { type: Date, default: null },
  reimbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees", default: null },

  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for performance
ExpenseSchema.index({ employeeId: 1, date: -1 });
ExpenseSchema.index({ clientId: 1, status: 1 });
ExpenseSchema.index({ status: 1, submittedAt: -1 });
ExpenseSchema.index({ employeeId: 1, clientId: 1, date: 1 }, { unique: true });
ExpenseSchema.index({ expensePeriod: 1, status: 1 });          // Period closure queries
ExpenseSchema.index({ projectTypeId: 1, status: 1 });          // Project expense reports
ExpenseSchema.index({ expensePeriod: 1, clientId: 1 });        // Client billing by period

export default mongoose.model("expenses", ExpenseSchema);