import mongoose from "mongoose";

const assets_paymentschema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "assets_invoices", required: true, index: true },
  paymentDate: { type: Date, default: Date.now, index: true },
  amountPaid: { type: Number, required: true, min: 0 },
  paymentMode: {
    type: String,
    enum: ["Cash", "Bank Transfer", "Cheque", "UPI", "Credit Card"],
    default: "Bank Transfer"
  },
  transactionRef: { type: String, trim: true, index: true },
  status: {
    type: String,
    enum: ["Pending", "Success", "Failed"],
    default: "Success",
    index: true
  }
}, { timestamps: true });

export default mongoose.model("assets_payments", assets_paymentschema);
