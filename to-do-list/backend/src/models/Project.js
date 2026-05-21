import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    emoji: {
      type: String,
      default: "📝",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    restoreUntil: {
      type: Date,
      default: null,
    },
    visibility: {
      type: String,
      enum: ["private", "link"],
      default: "private",
    },
    members: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          role: {
            type: String,
            enum: ["viewer", "comment", "editor", "owner"],
            required: true,
            default: "viewer",
          },
          addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    shareLinks: {
      type: [
        {
          token: { type: String }, // Legacy plain token support
          tokenHash: { type: String, required: true }, // Secure SHA-256 hashed token
          role: {
            type: String,
            enum: ["viewer", "comment", "editor"],
            required: true,
            default: "viewer",
          },
          label: { type: String, default: "" },
          maxUses: { type: Number, default: null },
          usedCount: { type: Number, default: 0 },
          isRevoked: { type: Boolean, default: false },
          expiresAt: { type: Date, default: null },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    inviteCode: {
      code: { type: String, default: null },
      role: {
        type: String,
        enum: ["viewer", "comment", "editor"],
        default: "viewer",
      },
      expiresAt: { type: Date, default: null },
      maxUses: { type: Number, default: null },
      usedCount: { type: Number, default: 0 },
      isRevoked: { type: Boolean, default: false },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      createdAt: { type: Date, default: null },
    },
    settings: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
);

projectSchema.index({ ownerId: 1 });
projectSchema.index({ "members.userId": 1 });
projectSchema.index({ "shareLinks.tokenHash": 1 }, { sparse: true });
projectSchema.index({ "inviteCode.code": 1 }, { sparse: true });

const Project = mongoose.model("Project", projectSchema);

export default Project;
