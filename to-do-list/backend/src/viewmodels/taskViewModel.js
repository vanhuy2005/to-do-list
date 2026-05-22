import Task from "../models/Task.js";
import Project from "../models/Project.js";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import Comment from "../models/Comment.js";
import TaskInvitation from "../models/TaskInvitation.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { realtimeService } from "../services/realtimeService.js";
import emailService from "../services/emailService.js";

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
const ALLOWED_SHARE_PERMISSIONS = ["view", "comment", "edit"];
const READ_SHARE_PERMISSIONS = ["view", "comment", "edit"];
const EDIT_SHARE_PERMISSIONS = ["edit"];
const RESTORE_WINDOW_DAYS = 7;

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

const escapeRegExp = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

const normalizeDueDate = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ViewModelError(400, "INVALID_DUE_DATE", "Hạn chót không hợp lệ");
  }
  return date;
};

const normalizeCreateTaskPayload = (payload) => {
  const source =
    payload?.data && typeof payload.data === "object" ? payload.data : payload;

  const normalized = {
    title: String(source?.title || "").trim(),
    description:
      typeof source?.description === "string"
        ? source.description.trim()
        : source?.description,
    status: source?.status || "todo",
    priority: source?.priority || "medium",
    tags: Array.isArray(source?.tags)
      ? source.tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
      : source?.tags,
    dueDate:
      source?.dueDate === "" || source?.dueDate === undefined
        ? null
        : source?.dueDate,
    projectId: source?.projectId,
  };

  if (!normalized.description) {
    normalized.description = undefined;
  }

  return normalized;
};

const resolveOwnerId = (userId) => {
  if (!userId) {
    throw new ViewModelError(
      401,
      "MISSING_AUTH",
      "Bạn cần đăng nhập để thao tác task",
    );
  }
  return userId;
};

const asStringId = (value) => String(value);

const buildReadableTaskFilter = (userId, projectIds = []) => ({
  $or: [
    { ownerId: userId },
    { projectId: { $in: projectIds } },
    {
      shares: {
        $elemMatch: {
          userId,
          permission: { $in: READ_SHARE_PERMISSIONS },
        },
      },
    },
  ],
});

const findShareEntry = (task, userId) => {
  if (!task?.shares?.length) {
    return null;
  }

  const normalizedUserId = asStringId(userId);
  return (
    task.shares.find(
      (share) => asStringId(share.userId) === normalizedUserId,
    ) || null
  );
};

const getTaskAccessLevel = async (task, userId) => {
  if (!task || !userId) {
    return null;
  }

  if (asStringId(task.ownerId) === asStringId(userId)) {
    return "owner";
  }

  const shareEntry = findShareEntry(task, userId);
  if (shareEntry) {
    return shareEntry.permission;
  }

  if (task.projectId) {
    const project = await Project.findOne({ _id: task.projectId, deletedAt: null }).lean();
    if (project) {
      if (asStringId(project.ownerId) === asStringId(userId)) {
        return "owner";
      }
      const member = project.members?.find(
        (m) => asStringId(m.userId) === asStringId(userId),
      );
      if (member) {
        if (member.role === "owner") return "owner";
        if (member.role === "editor") return "edit";
        if (member.role === "comment") return "comment";
        if (member.role === "viewer") return "view";
      }
    }
  }

  return null;
};

const ensureReadAccess = async (task, userId) => {
  const accessLevel = await getTaskAccessLevel(task, userId);
  if (!accessLevel) {
    throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
  }
  return accessLevel;
};

const ensureEditAccess = async (task, userId) => {
  const accessLevel = await ensureReadAccess(task, userId);
  if (
    accessLevel !== "owner" &&
    !EDIT_SHARE_PERMISSIONS.includes(accessLevel)
  ) {
    throw new ViewModelError(
      403,
      "FORBIDDEN_TASK_EDIT",
      "Bạn không có quyền chỉnh sửa task này",
    );
  }
  return accessLevel;
};

const ensureOwnerAccess = (task, userId) => {
  if (!task) {
    throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
  }

  if (asStringId(task.ownerId) !== asStringId(userId)) {
    throw new ViewModelError(
      403,
      "FORBIDDEN_TASK_OWNER_ONLY",
      "Chỉ chủ sở hữu mới thực hiện được thao tác này",
    );
  }
};

const toTaskResponse = async (task, userId) => {
  const plainTask = task?.toObject ? task.toObject() : task;
  const accessLevel = await getTaskAccessLevel(task, userId);
  return {
    ...plainTask,
    accessLevel,
  };
};

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const resolveCollaborator = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new ViewModelError(
      400,
      "MISSING_SHARE_EMAIL",
      "Email người được chia sẻ là bắt buộc",
    );
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    "_id email displayName status",
  );

  if (!user) {
    throw new ViewModelError(
      404,
      "SHARE_USER_NOT_FOUND",
      "Không tìm thấy người dùng để chia sẻ",
    );
  }

  if (user.status !== "active") {
    throw new ViewModelError(
      403,
      "SHARE_USER_DISABLED",
      "Không thể chia sẻ cho tài khoản đã bị vô hiệu hóa",
    );
  }

  return user;
};

const normalizeSharePermission = (permission) => {
  const normalized = String(permission || "")
    .trim()
    .toLowerCase();
  if (!ALLOWED_SHARE_PERMISSIONS.includes(normalized)) {
    throw new ViewModelError(
      400,
      "INVALID_SHARE_PERMISSION",
      "Quyền chia sẻ phải là view, comment hoặc edit",
    );
  }
  return normalized;
};

const formatShareMembers = async (task) => {
  const taskWithUsers = await Task.findById(task._id)
    .populate("shares.userId", "email displayName")
    .populate("shares.sharedBy", "email displayName");

  if (!taskWithUsers) {
    return [];
  }

  return taskWithUsers.shares.map((share) => ({
    userId: share.userId?._id || share.userId,
    email: share.userId?.email || null,
    displayName: share.userId?.displayName || null,
    permission: share.permission,
    sharedAt: share.sharedAt,
    sharedBy: {
      userId: share.sharedBy?._id || share.sharedBy,
      email: share.sharedBy?.email || null,
      displayName: share.sharedBy?.displayName || null,
    },
  }));
};

const buildTaskSummary = (task) => {
  if (!task) {
    return {};
  }

  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || null,
    isOverdue: task.isOverdue || false,
    overdueAt: task.overdueAt || null,
    deletedAt: task.deletedAt || null,
    updatedAt: task.updatedAt || null,
  };
};

const writeTaskAuditLog = async ({
  actorId,
  action,
  entityId,
  summaryBefore = {},
  summaryAfter = {},
}) => {
  try {
    await AuditLog.create({
      actorId,
      targetId: actorId,
      action,
      entityType: "task",
      entityId,
      summaryBefore,
      summaryAfter,
    });
  } catch (error) {
    console.warn("Không thể ghi audit log task:", error.message);
  }
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
      isOverdue,
      projectId,
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
    const userProjects = await Project.find({
      $or: [
        { ownerId },
        { "members.userId": ownerId },
      ],
      deletedAt: null,
    }).select("_id").lean();
    const userProjectIds = userProjects.map((p) => p._id);

    const readableFilter = buildReadableTaskFilter(ownerId, userProjectIds);
    const filter = {
      ...readableFilter,
    };

    const includeDeletedValue = parseBooleanQuery(includeDeleted);
    if (!includeDeletedValue) {
      filter.deletedAt = null;
    } else {
      filter.$and = [
        readableFilter,
        { $or: [{ ownerId }, { deletedAt: null }] },
      ];
      delete filter.$or;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      const normalizedSearch = String(search).trim();
      if (normalizedSearch) {
        const searchRegex = new RegExp(escapeRegExp(normalizedSearch), "i");
        filter.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ];
      }
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

    // Filter theo isOverdue
    const overdueValue = parseBooleanQuery(isOverdue);
    if (overdueValue === true) {
      filter.isOverdue = true;
    }
    if (overdueValue === false) {
      filter.isOverdue = { $ne: true };
    }

    // Filter theo projectId
    if (projectId !== undefined && projectId !== null) {
      if (String(projectId).toLowerCase() === "null") {
        // Show only tasks without a project
        filter.projectId = null;
      } else {
        // Verify user has access to this project
        const proj = await Project.findById(projectId).select(
          "_id ownerId members",
        );
        if (!proj) {
          // Project not found - return empty results
          return {
            statusCode: 200,
            success: true,
            data: {
              tasks: [],
              pagination: getPagination(normalizedPage, normalizedLimit, 0),
            },
          };
        }

        const isProjectOwner = String(proj.ownerId) === String(ownerId);
        const isProjectMember =
          proj.members &&
          proj.members.some((m) => String(m.userId) === String(ownerId));

        if (!isProjectOwner && !isProjectMember) {
          // User doesn't have access to this project
          return {
            statusCode: 200,
            success: true,
            data: {
              tasks: [],
              pagination: getPagination(normalizedPage, normalizedLimit, 0),
            },
          };
        }

        // User has access to project - show all tasks in this project
        filter.projectId = projectId;
        // Override readableFilter to allow all tasks in project for authorized members
        delete filter.$or;
        filter.$and = [
          {
            $or: [
              { projectId }, // Tasks in this project (any owner)
              { ownerId }, // Or tasks owned by this user outside the project
            ],
          },
        ];
      }
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ [normalizedSort]: normalizedOrder })
        .skip((normalizedPage - 1) * normalizedLimit)
        .limit(normalizedLimit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    // Gather all unique projectIds from tasks
    const projectIds = [...new Set(tasks.map((t) => t.projectId).filter(Boolean))];
    const projects = projectIds.length > 0
      ? await Project.find({ _id: { $in: projectIds }, deletedAt: null }).lean()
      : [];
    const projectMap = new Map(projects.map((p) => [String(p._id), p]));

    const enrichedTasks = tasks.map((task) => {
      let accessLevel = null;
      if (asStringId(task.ownerId) === asStringId(ownerId)) {
        accessLevel = "owner";
      } else {
        const shareEntry = findShareEntry(task, ownerId);
        if (shareEntry) {
          accessLevel = shareEntry.permission;
        } else if (task.projectId) {
          const project = projectMap.get(String(task.projectId));
          if (project) {
            if (asStringId(project.ownerId) === asStringId(ownerId)) {
              accessLevel = "owner";
            } else {
              const member = project.members?.find(
                (m) => asStringId(m.userId) === asStringId(ownerId),
              );
              if (member) {
                if (member.role === "owner") accessLevel = "owner";
                else if (member.role === "editor") accessLevel = "edit";
                else if (member.role === "comment") accessLevel = "comment";
                else if (member.role === "viewer") accessLevel = "view";
              }
            }
          }
        }
      }
      return {
        ...task,
        accessLevel,
      };
    });

    return {
      statusCode: 200,
      success: true,
      data: {
        tasks: enrichedTasks,
        pagination: getPagination(normalizedPage, normalizedLimit, total),
      },
    };
  },

  async getTaskById(taskId, userId) {
    ensureValidObjectId(taskId);

    const ownerId = resolveOwnerId(userId);

    const task = await Task.findOne({ _id: taskId, deletedAt: null });
    await ensureReadAccess(task, ownerId);

    return {
      statusCode: 200,
      success: true,
      data: await toTaskResponse(task, ownerId),
    };
  },

  async createTask(payload, userId) {
    const normalizedPayload = normalizeCreateTaskPayload(payload);
    validateCreatePayload(normalizedPayload);

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
      if (normalizedPayload[field] !== undefined) {
        taskData[field] = normalizedPayload[field];
      }
    }

    if (taskData.dueDate !== undefined) {
      taskData.dueDate = normalizeDueDate(taskData.dueDate);
      if (taskData.dueDate && taskData.dueDate > new Date()) {
        taskData.isOverdue = false;
        taskData.overdueAt = null;
      }
    }

    // Support optional projectId: ensure project exists and user is member/owner
    if (normalizedPayload.projectId) {
      const proj = await Project.findById(normalizedPayload.projectId);
      if (!proj) {
        throw new ViewModelError(
          400,
          "INVALID_PROJECT",
          "Project không tồn tại",
        );
      }

      const isMember =
        String(proj.ownerId) === String(ownerId) ||
        (proj.members || []).some((m) => String(m.userId) === String(ownerId));
      if (!isMember) {
        throw new ViewModelError(
          403,
          "FORBIDDEN_PROJECT",
          "Bạn không có quyền tạo task trong project này",
        );
      }

      taskData.projectId = normalizedPayload.projectId;
    }

    const task = await Task.create({
      ...taskData,
      ownerId,
    });

    await writeTaskAuditLog({
      actorId: ownerId,
      action: "task.created",
      entityId: task._id,
      summaryBefore: {},
      summaryAfter: buildTaskSummary(task),
    });

    if (task.projectId) {
      realtimeService.publishProjectEvent(task.projectId, "task_created", {
        task,
        actorId: ownerId,
      });
    }

    return {
      statusCode: 201,
      success: true,
      data: task,
      message: "Tạo task thành công",
    };
  },

  async updateTask(taskId, payload, userId) {
    ensureValidObjectId(taskId);

    const actorId = resolveOwnerId(userId);

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
      deletedAt: null,
    });
    await ensureEditAccess(existingTask, actorId);

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "tags",
      "dueDate",
      "orderIndex",
    ];
    const updateData = {};
    for (const field of allowedFields) {
      if (payload[field] !== undefined) updateData[field] = payload[field];
    }

    if (updateData.status === "done") {
      updateData.completedAt = new Date();
      updateData.isOverdue = false;
      updateData.overdueAt = null;
    } else if (updateData.status && updateData.status !== "done") {
      updateData.completedAt = null;
    }

    if (updateData.dueDate !== undefined) {
      updateData.dueDate = normalizeDueDate(updateData.dueDate);
      if (!updateData.dueDate || updateData.dueDate > new Date()) {
        updateData.isOverdue = false;
        updateData.overdueAt = null;
      }
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId, deletedAt: null },
      updateData,
      { new: true },
    );

    await writeTaskAuditLog({
      actorId,
      action: "task.updated",
      entityId: updatedTask._id,
      summaryBefore: buildTaskSummary(existingTask),
      summaryAfter: buildTaskSummary(updatedTask),
    });

    if (updatedTask.projectId) {
      realtimeService.publishProjectEvent(updatedTask.projectId, "task_updated", {
        task: updatedTask,
        actorId,
      });
    }

    return {
      statusCode: 200,
      success: true,
      data: await toTaskResponse(updatedTask, actorId),
    };
  },

  async deleteTask(taskId, userId) {
    ensureValidObjectId(taskId);

    const actorId = resolveOwnerId(userId);

    const existingTask = await Task.findOne({ _id: taskId, deletedAt: null });
    // allow owner or users with `edit` permission to soft-delete
    await ensureEditAccess(existingTask, actorId);

    const deletedAt = new Date();
    const restoreUntil = new Date(deletedAt);
    restoreUntil.setDate(restoreUntil.getDate() + RESTORE_WINDOW_DAYS);

    const deletedTask = await Task.findOneAndUpdate(
      { _id: taskId, deletedAt: null },
      { deletedAt, restoreUntil },
      { new: true },
    );
    if (!deletedTask) {
      throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
    }

    await writeTaskAuditLog({
      actorId,
      action: "task.deleted",
      entityId: deletedTask._id,
      summaryBefore: {
        title: deletedTask.title,
        status: deletedTask.status,
        priority: deletedTask.priority,
      },
      summaryAfter: buildTaskSummary(deletedTask),
    });

    if (deletedTask.projectId) {
      realtimeService.publishProjectEvent(deletedTask.projectId, "task_deleted", {
        taskId: deletedTask._id,
        actorId,
      });
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

    await writeTaskAuditLog({
      actorId: ownerId,
      action: "task.restored",
      entityId: restoredTask._id,
      summaryBefore: {
        title: existingTask.title,
        deletedAt: existingTask.deletedAt,
        restoreUntil: existingTask.restoreUntil,
      },
      summaryAfter: buildTaskSummary(restoredTask),
    });

    if (restoredTask.projectId) {
      realtimeService.publishProjectEvent(restoredTask.projectId, "task_created", {
        task: restoredTask,
        actorId: ownerId,
      });
    }

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

    const existingTask = await Task.findOne({
      _id: taskId,
      deletedAt: { $ne: null },
    });
    ensureOwnerAccess(existingTask, ownerId);

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

  async getTaskShares(taskId, userId) {
    ensureValidObjectId(taskId);
    const ownerId = resolveOwnerId(userId);

    const task = await Task.findById(taskId);
    ensureOwnerAccess(task, ownerId);

    const shares = await formatShareMembers(task);
    return {
      statusCode: 200,
      success: true,
      data: {
        taskId,
        shares,
      },
    };
  },

  async shareTask(taskId, payload, userId) {
    ensureValidObjectId(taskId);
    const ownerId = resolveOwnerId(userId);
    const permission = normalizeSharePermission(payload?.permission);

    const task = await Task.findOne({ _id: taskId, deletedAt: null });
    ensureOwnerAccess(task, ownerId);

    const collaborator = await resolveCollaborator(payload?.email);
    if (asStringId(collaborator._id) === asStringId(ownerId)) {
      throw new ViewModelError(
        400,
        "CANNOT_SHARE_TO_OWNER",
        "Không thể chia sẻ task cho chính chủ sở hữu",
      );
    }

    // Clean up any existing pending invitations for this collaborator and task
    await TaskInvitation.deleteMany({
      taskId: task._id,
      email: collaborator.email,
      status: "pending"
    });

    // Create secure token and hash
    const plainToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(plainToken).digest("hex");

    await TaskInvitation.create({
      taskId: task._id,
      email: collaborator.email,
      permission,
      tokenHash,
      invitedBy: ownerId,
    });

    const inviterUser = await User.findById(ownerId);
    try {
      await emailService.sendTaskInvitation(collaborator.email, inviterUser, task, plainToken);
    } catch (err) {
      console.error("Lỗi gửi email lời mời task:", err.message);
    }

    await writeTaskAuditLog({
      actorId: ownerId,
      action: "task.invited",
      entityId: task._id,
      summaryBefore: {},
      summaryAfter: {
        title: task.title,
        permission,
        invitedEmail: collaborator.email,
      },
    });

    const shares = await formatShareMembers(task);

    return {
      statusCode: 200,
      success: true,
      data: {
        taskId,
        shares,
      },
      message: "Đã gửi lời mời cộng tác nhiệm vụ qua email thành công",
    };
  },

  async updateTaskShare(taskId, collaboratorId, payload, userId) {
    ensureValidObjectId(taskId);
    ensureValidObjectId(collaboratorId);

    const ownerId = resolveOwnerId(userId);
    const permission = normalizeSharePermission(payload?.permission);

    const task = await Task.findOne({ _id: taskId, deletedAt: null });
    ensureOwnerAccess(task, ownerId);

    const targetShare = findShareEntry(task, collaboratorId);
    if (!targetShare) {
      throw new ViewModelError(
        404,
        "TASK_SHARE_NOT_FOUND",
        "Không tìm thấy quyền chia sẻ cho người dùng này",
      );
    }

    targetShare.permission = permission;
    targetShare.sharedBy = ownerId;
    targetShare.sharedAt = new Date();
    await task.save();

    const shares = await formatShareMembers(task);
    return {
      statusCode: 200,
      success: true,
      data: {
        taskId,
        shares,
      },
      message: "Cập nhật quyền chia sẻ thành công",
    };
  },

  async removeTaskShare(taskId, collaboratorId, userId) {
    ensureValidObjectId(taskId);
    ensureValidObjectId(collaboratorId);

    const ownerId = resolveOwnerId(userId);
    const task = await Task.findOne({ _id: taskId, deletedAt: null });
    ensureOwnerAccess(task, ownerId);

    const beforeCount = task.shares.length;
    task.shares = task.shares.filter(
      (share) => asStringId(share.userId) !== asStringId(collaboratorId),
    );

    if (task.shares.length === beforeCount) {
      throw new ViewModelError(
        404,
        "TASK_SHARE_NOT_FOUND",
        "Không tìm thấy người dùng trong danh sách chia sẻ",
      );
    }

    await task.save();

    const shares = await formatShareMembers(task);
    return {
      statusCode: 200,
      success: true,
      data: {
        taskId,
        shares,
      },
      message: "Đã thu hồi quyền truy cập task",
    };
  },

  async getTaskComments(taskId, userId) {
    ensureValidObjectId(taskId);
    const task = await Task.findOne({ _id: taskId, deletedAt: null });
    if (!task) {
      throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
    }

    await ensureReadAccess(task, userId);

    const comments = await Comment.find({ taskId })
      .populate("userId", "email displayName avatarUrl")
      .sort({ createdAt: 1 });

    return {
      statusCode: 200,
      success: true,
      data: comments,
    };
  },

  async createTaskComment(taskId, payload, userId) {
    ensureValidObjectId(taskId);
    const { content } = payload;
    if (!content || !content.trim()) {
      throw new ViewModelError(400, "MISSING_CONTENT", "Nội dung nhận xét không được để trống");
    }

    const task = await Task.findOne({ _id: taskId, deletedAt: null });
    if (!task) {
      throw new ViewModelError(404, "TASK_NOT_FOUND", "Task không tồn tại");
    }

    const accessLevel = await getTaskAccessLevel(task, userId);
    if (!accessLevel || accessLevel === "view") {
      throw new ViewModelError(403, "FORBIDDEN", "Bạn không có quyền nhận xét nhiệm vụ này");
    }

    const comment = await Comment.create({
      taskId,
      userId,
      content: content.trim(),
    });

    // Increment commentCount in Task schema
    await Task.updateOne({ _id: taskId }, { $inc: { commentCount: 1 } });
    task.commentCount = (task.commentCount || 0) + 1;

    const populated = await Comment.findById(comment._id).populate("userId", "email displayName avatarUrl");

    if (task.projectId) {
      try {
        realtimeService.publishProjectEvent(task.projectId, "task_updated", {
          taskId: task._id,
          task,
        });
      } catch (e) {
        console.error("Realtime emit failed:", e.message);
      }
    }

    return {
      statusCode: 201,
      success: true,
      data: populated,
      message: "Đã thêm nhận xét thành công",
    };
  },

  async getMyTaskInvitations(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }
    const invitations = await TaskInvitation.find({
      email: user.email.toLowerCase(),
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
    .populate("taskId", "title priority dueDate description")
    .populate("invitedBy", "email displayName avatarUrl");

    return {
      statusCode: 200,
      success: true,
      data: invitations,
    };
  },

  async previewTaskInvitation(token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await TaskInvitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
    .populate("taskId", "title priority dueDate description")
    .populate("invitedBy", "email displayName avatarUrl");

    if (!invitation || !invitation.taskId) {
      throw new ViewModelError(404, "INVITATION_NOT_FOUND", "Lời mời không tồn tại hoặc đã hết hạn");
    }

    return {
      statusCode: 200,
      success: true,
      data: {
        title: invitation.taskId.title,
        priority: invitation.taskId.priority,
        dueDate: invitation.taskId.dueDate,
        description: invitation.taskId.description,
        invitedBy: {
          email: invitation.invitedBy?.email,
          displayName: invitation.invitedBy?.displayName,
          avatarUrl: invitation.invitedBy?.avatarUrl,
        },
        permission: invitation.permission,
      }
    };
  },

  async acceptTaskInvitation(token, userId) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await TaskInvitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      throw new ViewModelError(404, "INVITATION_NOT_FOUND", "Lời mời không tồn tại hoặc đã hết hạn");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ViewModelError(403, "FORBIDDEN", "Email của bạn không khớp với email được mời");
    }

    const task = await Task.findOne({ _id: invitation.taskId, deletedAt: null });
    if (!task) {
      throw new ViewModelError(404, "TASK_NOT_FOUND", "Nhiệm vụ không còn tồn tại");
    }

    // Check if already shared
    const alreadyShared = task.shares.some(s => s.userId.toString() === userId.toString());
    if (!alreadyShared) {
      task.shares.push({
        userId: user._id,
        permission: invitation.permission,
        sharedBy: invitation.invitedBy,
        sharedAt: new Date(),
      });
      await task.save();
    }

    invitation.status = "accepted";
    await invitation.save();

    return {
      statusCode: 200,
      success: true,
      message: "Chấp nhận lời mời chia sẻ nhiệm vụ thành công",
      data: task,
    };
  },

  async declineTaskInvitation(token, userId) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await TaskInvitation.findOne({
      tokenHash,
      status: "pending",
      expiresAt: { $gt: new Date() }
    });

    if (!invitation) {
      throw new ViewModelError(404, "INVITATION_NOT_FOUND", "Lời mời không tồn tại hoặc đã hết hạn");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ViewModelError(403, "FORBIDDEN", "Email của bạn không khớp với email được mời");
    }

    invitation.status = "declined";
    await invitation.save();

    return {
      statusCode: 200,
      success: true,
      message: "Từ chối lời mời thành công",
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
