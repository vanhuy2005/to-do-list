import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    ipAddress: {
      type: String,
      default: "",
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "refresh_sessions",
  },
);

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshSessionSchema.index({ userId: 1, createdAt: -1 });

const RefreshSession = mongoose.model("RefreshSession", refreshSessionSchema);

export default RefreshSession;
