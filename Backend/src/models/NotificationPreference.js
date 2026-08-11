import mongoose from "mongoose";

const notification_preferencesSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "employees",
    required: true,
    index: true,
    unique: true // One preference doc per user
  },

  // Opt-out flags (default to false meaning "send it")
  muteTaskStatusChanges: { type: Boolean, default: false },
  muteTaskAssignments: { type: Boolean, default: false },
  muteTaskComments: { type: Boolean, default: false },
  onlyMentions: { type: Boolean, default: false }, // If true, only notify on comments if mentioned

  // Weekly digest instead of real-time (for future use)
  dailyDigestOnly: { type: Boolean, default: false }

}, { timestamps: true });

export default mongoose.model("notification_preferences", notification_preferencesSchema);
