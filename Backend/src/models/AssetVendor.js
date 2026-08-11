import mongoose from "mongoose";

const assets_vendorsSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  gstIN: { type: String, trim: true, uppercase: true },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active", index: true }
}, { timestamps: true });



export default mongoose.model("assets_vendors", assets_vendorsSchema);
