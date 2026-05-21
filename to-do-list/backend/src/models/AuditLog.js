import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: ["user", "task", "session", "project"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    summaryBefore: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    summaryAfter: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    collection: "audit_logs",
    timestamps: false,
  },
);

auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
