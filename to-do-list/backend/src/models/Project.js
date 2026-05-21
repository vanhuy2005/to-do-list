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
          token: { type: String, required: true },
          role: {
            type: String,
            enum: ["viewer", "comment", "editor"],
            required: true,
            default: "viewer",
          },
          expiresAt: { type: Date, default: null },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
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

const Project = mongoose.model("Project", projectSchema);

export default Project;
