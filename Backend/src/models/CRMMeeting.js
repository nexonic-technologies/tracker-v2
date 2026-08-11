import mongoose from "mongoose";

const crm_meetingsSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "clients", required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  scheduledTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true }, // For calendar blocking
  actualStartTime: { type: Date },
  actualEndTime: { type: Date },
  status: {
    type: String,
    enum: ["Scheduled", "Started", "Completed", "Cancelled"],
    default: "Scheduled",
    index: true
  },
  outcome: { type: String, trim: true }, // Captured in Meeting End Note popup
  notes: { type: String, trim: true }, // Captured in Meeting End Note popup
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "employees" }],
  location: { type: String }, // Online link or physical location
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees" }
}, { timestamps: true });

// Index for calendar queries
crm_meetingsSchema.index({ scheduledTime: 1, status: 1 });

export default mongoose.model("crm_meetings", crm_meetingsSchema);
