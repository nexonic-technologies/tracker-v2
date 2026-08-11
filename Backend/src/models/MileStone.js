import mongoose from 'mongoose';

const MileStoneSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    Status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

MileStoneSchema.index({ name: 1 });
MileStoneSchema.index({ Status: 1 });

const milestones = mongoose.models.milestones || mongoose.model('milestones', MileStoneSchema); 

export default milestones;