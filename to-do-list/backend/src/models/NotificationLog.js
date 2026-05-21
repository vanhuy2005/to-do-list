import mongoose from "mongoose";

const notificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null, // null if it's a consolidated daily digest
    },
    type: {
      type: String,
      enum: ["overdue_single", "overdue_digest"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "bounced", "abandoned"],
      default: "pending",
    },
    resendMessageId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
      maxlength: 500,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    taskSnapshot: {
      title: { type: String },
      priority: { type: String },
      dueDate: { type: Date },
    },
  },
  {
    timestamps: true,
    collection: "notification_logs",
  }
);

// Optimize database queries with indexes
// 1. Auto-expire logs after 90 days (TTL Index)
notificationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// 2. Prevent duplicate single overdue emails within a 24-hour cycle
notificationLogSchema.index({ userId: 1, taskId: 1, type: 1, createdAt: -1 });

// 3. High performance querying for the background email scheduler queue and retry mechanism
notificationLogSchema.index({ status: 1, retryCount: 1, nextRetryAt: 1 });

// 4. Retrieve user notification logs feed (paginated)
notificationLogSchema.index({ userId: 1, createdAt: -1 });

const NotificationLog = mongoose.model("NotificationLog", notificationLogSchema);
export default NotificationLog;
