import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "clients", required: true, index: true },
  oaId: { type: mongoose.Schema.Types.ObjectId, ref: "orderacknowledgments", index: true },
  
  amount: { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, required: true, default: Date.now },
  paymentMethod: { 
    type: String, 
    enum: ["Bank Transfer", "Check", "Cash", "Online"], 
    default: "Bank Transfer" 
  },
  referenceNo: { type: String, trim: true },
  
  status: { 
    type: String, 
    enum: ["Pending", "Confirmed", "Failed"], 
    default: "Confirmed",
    index: true
  },
  
  notes: { type: String, trim: true },
  attachments: [{ type: String }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" }
}, { timestamps: true });

// Compound index for client history
PaymentSchema.index({ clientId: 1, paymentDate: -1 });

export default mongoose.model("payments", PaymentSchema);
