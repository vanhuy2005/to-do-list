import mongoose from "mongoose";

const projectInvitationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ["viewer", "comment", "editor", "owner"],
      required: true,
      default: "viewer",
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

projectInvitationSchema.index({ email: 1 });
projectInvitationSchema.index({ tokenHash: 1 });

const ProjectInvitation = mongoose.model("ProjectInvitation", projectInvitationSchema);

export default ProjectInvitation;
