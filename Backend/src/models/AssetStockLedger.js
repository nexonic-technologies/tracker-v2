import mongoose from "mongoose";

const assets_stock_ledgersSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: "assets", required: true, index: true },
  transactionType: { type: String, enum: ["IN", "OUT"], required: true, index: true },
  triggerType: {
    type: String,
    enum: [
      "Purchase_Receipt",
      "Employee_Return",
      "Repair_Return",
      "Employee_Allocation",
      "Send_To_Repair",
      "Write_Off_Disposal"
    ],
    required: true,
    index: true
  },
  previousState: { type: String, enum: ["Ordered", "Available", "Allocated", "Under Repair", "Disposed"] },
  newState: { type: String, enum: ["Available", "Allocated", "Under Repair", "Disposed"] },
  quantity: { type: Number, default: 1 },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" },
  referenceModel: { type: String, enum: ["assets_purchases", "assets_allocations", "assets_repairs"] },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  transactionDate: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

assets_stock_ledgersSchema.index({ transactionDate: -1 });

export default mongoose.model("assets_stock_ledgers", assets_stock_ledgersSchema);
