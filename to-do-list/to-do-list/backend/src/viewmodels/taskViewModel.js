import Task from "../models/Task.js";

const REQUIRED_CREATE_FIELDS = ["title", "status"];
const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "dueDate",
  "title",
  "priority",
];
const ALLOWED_PRIORITY = ["low", "medium", "high"];
const ALLOWED_STATUS = ["todo", "doing", "done"];
const RESTORE_WINDOW_DAYS = 7;
const DEV_OWNER_ID = process.env.DEV_OWNER_ID || "000000000000000000000001";

class ViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "ViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const ensureValidObjectId = (taskId) => {
  if (!taskId || !taskId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ViewModelError(400, "INVALID_TASK_ID", "Task ID không hợp lệ");
  }
};

const getPagination = (page, limit, total) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
  };
};

const parseBooleanQuery = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  return null;
};

const validateCreatePayload = (payload) => {
  const missingFields = REQUIRED_CREATE_FIELDS.filter(
    (field) => !payload[field],
  );
  if (missingFields.length > 0) {
    throw new ViewModelError(
      400,
      "MISSING_FIELDS",
      "Title và status là bắt buộc",
    );
  }

  if (payload.priority && !ALLOWED_PRIORITY.includes(payload.priority)) {
    throw new ViewModelError(400, "INVALID_PRIORITY", "Priority không hợp lệ");
  }

  if (payload.status && !ALLOWED_STATUS.includes(payload.status)) {
    throw new ViewModelError(400, "INVALID_STATUS", "Status không hợp lệ");
  }
};

const isTaskAuthBypassed = () => {
  return (
    String(process.env.BYPASS_TASK_AUTH || "")
      .trim()
      .toLowerCase() === "true"
  );
};

const isAuthEnabled = () => {
  return (
    String(process.env.AUTH_ENABLED || "true")
      .trim()
      .toLowerCase() !== "false"
  );
};

const resolveOwnerId = (userId) => {
  if (userId) {
    return userId;
  }

  if (isTaskAuthBypassed() || !isAuthEnabled()) {
    return DEV_OWNER_ID;
  }

  throw new ViewModelError(
    401,
    "MISSING_AUTH",
    "Bạn cần đăng nhập để thao tác task",
  );
};

const taskViewModel = {
  async getAllTasks({ query, userId }) {
    const {
      status,
      priority,
      search,
      tag,
      dueDate,
      dueDateFrom,
      dueDateTo,
      completed,
      includeDeleted,
      page = 1,
      limit = 20,
      sort = "updatedAt",
      order = "desc",
    } = query || {};

    const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const normalizedLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 20),
    );
    const normalizedSort = ALLOWED_SORT_FIELDS.includes(sort)
      ? sort
      : "updatedAt";
    const normalizedOrder = String(order).toLowerCase() === "asc" ? 1 : -1;

    const ownerId = resolveOwnerId(userId);
    const filter = {
      ownerId,
    };

    const includeDeletedValue = parseBooleanQuery(includeDeleted);
    if (!includeDeletedValue) {
      filter.deletedAt = null;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (tag) {
      const tags = String(tag)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        filter.tags = { $in: tags };
      }
    }

    const dueDateFilter = {};
    if (dueDateFrom) {
      const from = new Date(dueDateFrom);
      if (!Number.isNaN(from.getTime())) {
        dueDateFilter.$gte = from;
      }
    }

    if (dueDateTo) {
      const to = new Date(dueDateTo);
      if (!Number.isNaN(to.getTime())) {
        dueDateFilter.$lte = to;
      }
    }

    if (dueDate) {
      const exactDate = new Date(dueDate);
      if (!Number.isNaN(exactDate.getTime())) {
        const startOfDay = new Date(exactDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(exactDate);
        endOfDay.setHours(23, 59, 59, 999);

        dueDateFilter.$gte = startOfDay;
        dueDateFilter.$lte = endOfDay;
      }
    }

    if (Object.keys(dueDateFilter).length > 0) {
      filter.dueDate = dueDateFilter;
    }

    const completedValue = parseBooleanQuery(completed);
    if (completedValue === true) {
      filter.completedAt = { $ne: null };
    }

    if (completedValue === false) {
      filter.completedAt = null;
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ [normalizedSort]: normalizedOrder })
        .skip((normalizedPage - 1) * normalizedLimit)
        .limit(normalizedLimit),
      Task.countDocuments(filter),
    ]);

    return {
      statusCode: 200,
      success: true,
      data: {
        tasks,
        pagination: getPagination(normalizedPage, normalizedLimit, total),
      },
    };
  },

  async getTaskById(taskId, userId) {
    ensureValidObjectId(taskId);

    const ownerId = resolveOwnerId(userId);

    const filter = {
      _id: taskId,
      ownerId,
      deletedAt: null,
    };

    const task = await Task.findOne(filter);
    if (!task) {
      throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
    }

    return {
      statusCode: 200,
      success: true,
      data: task,
    };
  },

  async createTask(payload, userId) {
    validateCreatePayload(payload);

    const ownerId = resolveOwnerId(userId);

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "tags",
      "dueDate",
    ];
    const taskData = {};
    for (const field of allowedFields) {
      if (payload[field] !== undefined) taskData[field] = payload[field];
    }

    const task = await Task.create({
      ...taskData,
      ownerId,
    });
    return {
      statusCode: 201,
      success: true,
      data: task,
      message: "Tạo task thành công",
    };
  },

  async updateTask(taskId, payload, userId) {
    ensureValidObjectId(taskId);

    const ownerId = resolveOwnerId(userId);

    if (payload.priority && !ALLOWED_PRIORITY.includes(payload.priority)) {
      throw new ViewModelError(
        400,
        "INVALID_PRIORITY",
        "Priority không hợp lệ",
      );
    }

    if (payload.status && !ALLOWED_STATUS.includes(payload.status)) {
      throw new ViewModelError(400, "INVALID_STATUS", "Status không hợp lệ");
    }

    const existingTask = await Task.findOne({
      _id: taskId,
      ownerId,
      deletedAt: null,
    });
    if (!existingTask) {
      throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
    }

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "tags",
      "dueDate",
      "orderIndex",
      "explicitOverdue",
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (payload[field] !== undefined) updateData[field] = payload[field];
    }

    if (updateData.status === "done") {
      updateData.completedAt = new Date();
    } else if (updateData.status && updateData.status !== "done") {
      updateData.completedAt = null;
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, ownerId, deletedAt: null },
      updateData,
      { new: true },
    );
    return {
      statusCode: 200,
      success: true,
      data: updatedTask,
    };
  },

  async deleteTask(taskId, userId) {
    ensureValidObjectId(taskId);

    const ownerId = resolveOwnerId(userId);

    const deletedAt = new Date();
    const restoreUntil = new Date(deletedAt);
    restoreUntil.setDate(restoreUntil.getDate() + RESTORE_WINDOW_DAYS);

    const deletedTask = await Task.findOneAndUpdate(
      { _id: taskId, ownerId, deletedAt: null },
      { deletedAt, restoreUntil },
      { new: true },
    );
    if (!deletedTask) {
      throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
    }

    return {
      statusCode: 200,
      success: true,
      message: "Task đã được đưa vào thùng rác",
    };
  },

  async restoreTask(taskId, userId) {
    ensureValidObjectId(taskId);

    const ownerId = resolveOwnerId(userId);

    const existingTask = await Task.findOne({
      _id: taskId,
      ownerId,
      deletedAt: { $ne: null },
    });

    if (!existingTask) {
      throw new ViewModelError(
        404,
        "TASK_NOT_FOUND",
        "Task không tồn tại trong thùng rác",
      );
    }

    if (
      existingTask.restoreUntil &&
      new Date(existingTask.restoreUntil) < new Date()
    ) {
      throw new ViewModelError(
        410,
        "RESTORE_EXPIRED",
        "Đã hết thời gian khôi phục task",
      );
    }

    const restoredTask = await Task.findOneAndUpdate(
      { _id: taskId, ownerId },
      { deletedAt: null, restoreUntil: null },
      { new: true },
    );

    return {
      statusCode: 200,
      success: true,
      data: restoredTask,
      message: "Khôi phục task thành công",
    };
  },

  async getDeletedTasks({ query, userId }) {
    const { page = 1, limit = 20 } = query || {};
    const ownerId = resolveOwnerId(userId);
    const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const normalizedLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 20),
    );

    const filter = {
      ownerId,
      deletedAt: { $ne: null },
    };

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ deletedAt: -1 })
        .skip((normalizedPage - 1) * normalizedLimit)
        .limit(normalizedLimit),
      Task.countDocuments(filter),
    ]);

    return {
      statusCode: 200,
      success: true,
      data: {
        tasks,
        pagination: getPagination(normalizedPage, normalizedLimit, total),
      },
    };
  },

  async purgeExpiredDeletedTasks() {
    const now = new Date();
    await Task.deleteMany({
      deletedAt: { $ne: null },
      restoreUntil: { $lt: now },
    });

    return {
      statusCode: 200,
      success: true,
      message: "Đã dọn task quá hạn khôi phục",
    };
  },

  async hardDeleteTask(taskId, userId) {
    ensureValidObjectId(taskId);

    const ownerId = resolveOwnerId(userId);

    const deletedTask = await Task.findOneAndDelete({
      _id: taskId,
      ownerId,
      deletedAt: { $ne: null },
    });

    if (!deletedTask) {
      throw new ViewModelError(
        404,
        "TASK_NOT_FOUND",
        "Task không tồn tại trong thùng rác",
      );
    }

    return {
      statusCode: 200,
      success: true,
      message: "Task đã được xóa vĩnh viễn",
    };
  },
};

// Middleware xử lý lỗi ViewModel
const errorHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res, next);
    return result;
  } catch (error) {
    if (error instanceof ViewModelError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      });
    }

    if (error?.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PAYLOAD",
          message: error.message,
        },
      });
    }

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PAYLOAD",
          message: "Dữ liệu gửi lên không hợp lệ",
        },
      });
    }

    console.error("Unexpected error:", error.message);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
};

export { ViewModelError, errorHandler };
export default taskViewModel;
