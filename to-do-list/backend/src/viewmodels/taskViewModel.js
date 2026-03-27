import Task from "../models/Task.js";

const REQUIRED_CREATE_FIELDS = ["title", "status", "dueDate"];

class ViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "ViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const validateCreatePayload = (payload) => {
  const missingFields = REQUIRED_CREATE_FIELDS.filter(
    (field) => !payload[field],
  );
  if (missingFields.length > 0) {
    throw new ViewModelError(
      400,
      "MISSING_FIELDS",
      "Title, status và due date là bắt buộc"
    );
  }
};

const taskViewModel = {
  async getAllTasks() {
    const tasks = await Task.find().sort({ createdAt: -1 });
    return {
      statusCode: 200,
      success: true,
      data: {
        tasks,
        pagination: {
          page: 1,
          limit: tasks.length,
          total: tasks.length,
          totalPages: 1,
        },
      },
    };
  },

  async createTask(payload) {
    validateCreatePayload(payload);

    const task = await Task.create(payload);
    return {
      statusCode: 201,
      success: true,
      data: task,
      message: "Tạo task thành công",
    };
  },

  async updateTask(taskId, payload) {
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      throw new ViewModelError(404, "Task không tồn tại");
    }

    const updatedTask = await Task.findByIdAndUpdate(taskId, payload, {
      new: true,
    });
    return {
      statusCode: 200,
      success: true,
      data: updatedTask,
    };
  },

  async deleteTask(taskId) {
    const deletedTask = await Task.findByIdAndDelete(taskId);
    if (!deletedTask) {
      throw new ViewModelError(404, "Task không tồn tại");
    }

    return {
      statusCode: 200,
      success: true,
      message: "Task đã được xóa thành công",
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
    console.error("Unexpected error:", error.message);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error.message,
      },
    });
  }
};

export { ViewModelError, errorHandler };
export default taskViewModel;
