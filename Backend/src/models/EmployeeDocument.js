import mongoose from 'mongoose';

/**
 * EmployeeDocument — tracks employee personal documents (Aadhaar, PAN, etc.)
 * with approval status workflow.
 */
const employee_documentschema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    required: true,
    index: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['Resume', 'Photo', 'PAN', 'Aadhaar', 'Passport', 'Degree', 'Experience Letter', 'Relieving Letter', 'Offer Letter', 'Joining Letter', 'Bank Proof', 'Medical Certificate', 'Other'],
    trim: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees'
  },
  remarks: {
    type: String,
    trim: true
  }
}, { timestamps: true });

employee_documentschema.index({ employeeId: 1, documentType: 1 });

export default mongoose.model('employee_documents', employee_documentschema);
