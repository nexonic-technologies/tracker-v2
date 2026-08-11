// models/UserOverride.js
// User-specific UI capability overrides for frontend visibility
// This does NOT replace access_policies - it only controls UI display

import mongoose from "mongoose";

const UserOverrideSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'employees',
    required: true,
    unique: true
  },
  overrides: [{
    capabilityKey: {
      type: String,
      required: true,
      trim: true
    },
    effect: {
      type: String,
      enum: ['allow', 'deny'],
      required: true
    }
  }]
}, {
  timestamps: true,
  collection: 'useroverrides'
});


export default mongoose.model("UserOverride", UserOverrideSchema);
