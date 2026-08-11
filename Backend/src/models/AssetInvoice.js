import mongoose from "mongoose";

const assets_invoiceschema = new mongoose.Schema({
  purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "assets_purchases", required: true, index: true },
  invoiceNumber: { type: String, required: true, unique: true, trim: true, index: true },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  subTotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Paid", "Void"],
    default: "Pending",
    index: true
  }
}, { timestamps: true });

assets_invoiceschema.index({ dueDate: 1 });

export default mongoose.model("assets_invoices", assets_invoiceschema);
