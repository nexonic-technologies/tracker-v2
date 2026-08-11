import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  date:             { type: Date, required: true },
  name:             { type: String, required: true },
  type:             { type: String, enum: ['national', 'regional', 'optional', 'company'], required: true },
  applicableStates: { type: [String], default: [] },
  year:             { type: Number, required: true, index: true }
}, { timestamps: true });

holidaySchema.index({ date: 1 }, { unique: true });
holidaySchema.index({ year: 1, type: 1 });

export default mongoose.model('holidays', holidaySchema);
