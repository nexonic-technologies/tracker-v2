import mongoose from "mongoose";

const ReplySchema = new mongoose.Schema(
  {
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    message: { type: String, required: true },
    attachments: [{ type: String }],
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

const CommentSchema = new mongoose.Schema(
  {
    commentedBy: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    message: { type: String, required: true },
    attachments: [{ type: String }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "employees" }],
    replies: [ReplySchema], // array of reply objects
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

const comments_threadsSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "tasks", required: true },
    comments: [CommentSchema], // array of comment objects
  },
  { timestamps: true }
);

// Indexes for optimal filtering
comments_threadsSchema.index({ taskId: 1 }, { unique: true });
comments_threadsSchema.index({ "comments.commentedBy": 1 });
comments_threadsSchema.index({ "comments.mentions": 1 });
comments_threadsSchema.index({ createdAt: -1 });

const CommentsThread =
  mongoose.models.CommentsThread ||
  mongoose.model("comments_threads", comments_threadsSchema);

export default CommentsThread;
