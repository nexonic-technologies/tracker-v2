import mongoose from "mongoose";

const PurchaseItemSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "assets_categories", required: true },
  name: { type: String, required: true, trim: true },
  model: { type: String, trim: true },
  serialNumberPrefix: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxRate: { type: Number, default: 0 } // Percentage
}, { _id: false });

const assets_purchaseschema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "assets_vendors", required: true, index: true },
  poNumber: { type: String, required: true, unique: true, trim: true, index: true },
  purchaseDate: { type: Date, default: Date.now, index: true },
  status: {
    type: String,
    enum: ["Draft", "Pending Approval", "Approved", "Received", "Cancelled"],
    default: "Draft",
    index: true
  },
  items: [PurchaseItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 }, // Tracks total paid amount for balance reports
  paymentStatus: {
    type: String,
    enum: ["Unpaid", "Partially Paid", "Paid"],
    default: "Unpaid",
    index: true
  },
  remarks: { type: String }
}, { timestamps: true });

assets_purchaseschema.index({ purchaseDate: -1 });

export default mongoose.model("assets_purchases", assets_purchaseschema);
