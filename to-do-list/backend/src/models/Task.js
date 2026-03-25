import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
    },
    status: {
        type: String,
        required: true,
        enum: ["todo", "doing", "done"],
        default: "todo",
    },
    dueDate: {
        type: Date,
        required: true,
    },
    priority: {
        type: String,
    },
    tags: {
        type: [String],
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    completedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

const Task = mongoose.model("Task", taskSchema);

export default Task;