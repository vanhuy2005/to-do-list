import mongoose from "mongoose";

const visitLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  path: {
    type: String,
    required: true,
  },
  ipHash: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

// Index to optimize date range aggregations
visitLogSchema.index({ createdAt: 1 });

const VisitLog = mongoose.model("VisitLog", visitLogSchema);

export default VisitLog;
