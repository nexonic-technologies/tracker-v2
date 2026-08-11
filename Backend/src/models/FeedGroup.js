import { Schema, model } from 'mongoose';

const GroupMemberSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'employees', required: true }
}, { _id: false });

const feed_groupsSchema = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, trim: true },
  members: { type: [GroupMemberSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'employees', required: true }
}, { timestamps: true });

export default model('feed_groups', feed_groupsSchema);
