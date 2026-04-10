import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
      enum: ["todo", "doing", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
      default: null,
    },
    isOverdue: {
      type: Boolean,
      default: false,
    },
    overdueAt: {
      type: Date,
      default: null,
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    restoreUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

taskSchema.index({ ownerId: 1, status: 1, dueDate: 1, updatedAt: -1 });
taskSchema.index({ title: "text", description: "text" });
taskSchema.index({ isOverdue: 1, dueDate: 1, status: 1, deletedAt: 1 });

taskSchema.pre("save", function () {
  if (this.status === "done" && !this.completedAt) {
    this.completedAt = new Date();
  }

  if (this.status !== "done") {
    this.completedAt = null;
  }
});

const Task = mongoose.model("Task", taskSchema);

export default Task;
