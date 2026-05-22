import mongoose from "mongoose";

const taskInvitationSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    permission: {
      type: String,
      enum: ["view", "comment", "edit"],
      required: true,
      default: "view",
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
    },
  },
  { timestamps: true }
);

taskInvitationSchema.index({ email: 1 });
taskInvitationSchema.index({ tokenHash: 1 });

const TaskInvitation = mongoose.model("TaskInvitation", taskInvitationSchema);

export default TaskInvitation;
