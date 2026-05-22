import User from "../models/User.js";
import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import NotificationLog from "../models/NotificationLog.js";
import cloudinaryService from "../services/cloudinaryService.js";
import VisitLog from "../models/VisitLog.js";

class AdminViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "AdminViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const adminViewModel = {
  async getUsers(query = {}) {
    const { search, role, status, page = 1, limit = 20 } = query;

    const filter = {
      status: status || "active",
    };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Get completed tasks count for each user
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        const completedCount = await Task.countDocuments({
          ownerId: user._id,
          status: "done",
        });

        return {
          id: user._id,
          name: user.displayName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role === "admin" ? "ADMIN" : "USER",
          completedTasks: completedCount,
          isOnline:
            user.lastOnlineAt && new Date() - user.lastOnlineAt < 5 * 60 * 1000,
          lastOnlineAt: user.lastOnlineAt,
          createdAt: user.createdAt,
        };
      }),
    );

    return {
      statusCode: 200,
      success: true,
      data: formattedUsers,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
      },
    };
  },

  async updateUser(userId, payload) {
    if (!userId) {
      throw new AdminViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    const { role, status } = payload;

    if (role && !["user", "admin"].includes(role)) {
      throw new AdminViewModelError(400, "INVALID_ROLE", "Role không hợp lệ");
    }

    if (status && !["active", "disabled"].includes(status)) {
      throw new AdminViewModelError(
        400,
        "INVALID_STATUS",
        "Status không hợp lệ",
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AdminViewModelError(
        404,
        "USER_NOT_FOUND",
        "User không tồn tại",
      );
    }

    const updateData = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-passwordHash");

    return {
      statusCode: 200,
      success: true,
      data: updatedUser,
    };
  },

  async getModeration(query = {}) {
    const { page = 1, limit = 20 } = query;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filter = {
      lastOnlineAt: { $lt: thirtyDaysAgo },
      status: "active",
    };

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ lastOnlineAt: 1 });

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const formattedUsers = users.map((user) => {
      const daysSince = Math.floor(
        (new Date() - user.lastOnlineAt) / (1000 * 60 * 60 * 24),
      );
      return {
        id: user._id,
        displayName: user.displayName,
        email: user.email,
        lastOnlineAt: user.lastOnlineAt,
        daysSinceLastOnline: daysSince,
      };
    });

    return {
      statusCode: 200,
      success: true,
      data: {
        users: formattedUsers,
        pagination: { page, limit, total, totalPages },
      },
    };
  },

  async disableInactiveUser(userId) {
    if (!userId) {
      throw new AdminViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AdminViewModelError(
        404,
        "USER_NOT_FOUND",
        "User không tồn tại",
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { status: "disabled", disabledAt: new Date() },
      { new: true },
    ).select("-passwordHash");

    return {
      statusCode: 200,
      success: true,
      data: updatedUser,
      message: "Tài khoản đã được vô hiệu hóa",
    };
  },

  async getTrash(query = {}) {
    const { page = 1, limit = 20 } = query;

    const filter = {
      status: "disabled",
    };

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ disabledAt: -1, updatedAt: -1 })
      .select("-passwordHash");

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      success: true,
      data: {
        users,
        pagination: { page, limit, total, totalPages },
      },
    };
  },

  async getTasksForModeration(query = {}) {
    const { page = 1, limit = 20 } = query;

    const skip = (page - 1) * limit;
    const tasks = await Task.find()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Task.countDocuments();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      success: true,
      data: {
        tasks,
        pagination: { page, limit, total, totalPages },
      },
    };
  },

  async getAnalytics(query = {}) {
    const { range = "7days" } = query;

    let daysCount = 7;
    if (range === "30days") daysCount = 30;
    if (range === "90days") daysCount = 90;

    const now = new Date();
    const start = new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    // Helpers to generate sequential daily trend arrays filled with 0s
    const getDayLabel = (date, days) => {
      if (days <= 7) {
        const dayOfWeek = date.getDay();
        const labels = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
        return labels[dayOfWeek];
      } else {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${d}/${m}`;
      }
    };

    const buildTrend = async (model, dateField, filter = {}) => {
      const data = await model.aggregate([
        {
          $match: {
            ...filter,
            [dateField]: { $gte: start, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const map = {};
      for (let i = 0; i < daysCount; i++) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().split("T")[0];
        map[dateStr] = {
          date: dateStr,
          label: getDayLabel(d, daysCount),
          value: 0,
        };
      }

      data.forEach((item) => {
        if (map[item._id]) {
          map[item._id].value = item.count;
        }
      });

      return Object.values(map);
    };

    const userGrowthTrend = await buildTrend(User, "createdAt");
    const visitTrend = await buildTrend(VisitLog, "createdAt");

    // Task status distribution (excluding soft deleted tasks)
    const taskStatusDistribution = await Task.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const taskDistribution = { todo: 0, doing: 0, done: 0 };
    taskStatusDistribution.forEach((item) => {
      if (item._id === "todo") taskDistribution.todo = item.count;
      if (item._id === "doing") taskDistribution.doing = item.count;
      if (item._id === "done") taskDistribution.done = item.count;
    });

    // Top users by task count owned (from Task.ownerId), lookup email and avatarUrl too
    const topUsersData = await Task.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$ownerId",
          taskCount: { $sum: 1 },
        },
      },
      { $sort: { taskCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
    ]);

    const topUsers = topUsersData.map((item) => ({
      userId: item._id,
      displayName: item.user.displayName,
      email: item.user.email,
      avatarUrl: item.user.avatarUrl,
      taskCount: item.taskCount,
    }));

    // Totals
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const disabledUsers = await User.countDocuments({ status: "disabled" });
    const totalTasks = await Task.countDocuments({ deletedAt: null });
    const totalVisits = await VisitLog.countDocuments();

    return {
      success: true,
      statusCode: 200,
      data: {
        range,
        userGrowthTrend,
        visitTrend,
        taskDistribution,
        topUsers,
        totals: {
          totalUsers,
          activeUsers,
          disabledUsers,
          totalTasks,
          totalVisits,
        },
      },
    };
  },

  async deleteUserOffline(userId) {
    if (!userId) {
      throw new AdminViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new AdminViewModelError(
        404,
        "USER_NOT_FOUND",
        "Không tìm thấy người dùng",
      );
    }
    if (Date.now() - new Date(user.lastOnlineAt) < 7 * 24 * 60 * 60 * 1000) {
      throw new AdminViewModelError(
        403,
        "USER_ACTIVE",
        "Người dùng vẫn còn hoạt động",
      );
    }
    const deletedUser =
      await User.findByIdAndDelete(userId).select("-passwordHash");
    if (!deletedUser) {
      throw new AdminViewModelError(
        404,
        "USER_NOT_FOUND",
        "Không tìm thấy người dùng",
      );
    }

    // Cascade delete user avatar assets on Cloudinary
    if (deletedUser.avatarPublicId) {
      cloudinaryService
        .deleteAvatar(deletedUser.avatarPublicId)
        .catch((err) => {
          console.error(
            `Cascade delete avatar failed for user ${userId}:`,
            err,
          );
        });
    }

    // Cascade delete database notification logs
    try {
      await NotificationLog.deleteMany({ userId });
    } catch (err) {
      console.error(
        `Cascade delete notification logs failed for user ${userId}:`,
        err,
      );
    }

    return {
      statusCode: 200,
      success: true,
      data: deletedUser,
      message: "Người dùng đã được xóa",
    };
  },

  async getDashboard(query = {}) {
    const { range = "7days" } = query;

    let days = 7;
    if (range === "30days") days = 30;
    if (range === "90days") days = 90;

    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    const calculateChangePercent = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      const percent = ((current - previous) / previous) * 100;
      return Math.round(percent * 10) / 10;
    };

    // Calculate User metrics
    const newUsers = await User.countDocuments({
      createdAt: { $gte: currentStart, $lte: now },
    });
    const newUsersPrevious = await User.countDocuments({
      createdAt: { $gte: previousStart, $lt: currentStart },
    });
    const newUsersChange = calculateChangePercent(newUsers, newUsersPrevious);

    // Calculate Visit metrics
    const visits = await VisitLog.countDocuments({
      createdAt: { $gte: currentStart, $lte: now },
    });
    const visitsPrevious = await VisitLog.countDocuments({
      createdAt: { $gte: previousStart, $lt: currentStart },
    });
    const visitsChange = calculateChangePercent(visits, visitsPrevious);

    // Totals
    const activeUsers = await User.countDocuments({ status: "active" });
    const disabledUsers = await User.countDocuments({ status: "disabled" });
    const totalUsers = activeUsers + disabledUsers;

    return {
      statusCode: 200,
      success: true,
      data: {
        range,
        metrics: {
          newUsers: {
            value: newUsers,
            previousValue: newUsersPrevious,
            changePercent: newUsersChange,
          },
          visits: {
            value: visits,
            previousValue: visitsPrevious,
            changePercent: visitsChange,
          },
          activeUsers,
          disabledUsers,
          totalUsers,
        },
      },
    };
  },

  async softDeleteUser(targetId, adminId) {
    if (!targetId) {
      throw new AdminViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }
    if (targetId.toString() === adminId.toString()) {
      throw new AdminViewModelError(400, "SELF_ACTION_NOT_ALLOWED", "Bạn không thể tự xóa chính mình");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw new AdminViewModelError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
    }

    if (user.role === "admin") {
      throw new AdminViewModelError(403, "ADMIN_ACTION_FORBIDDEN", "Không thể xóa hoặc vô hiệu hóa tài khoản quản trị viên khác");
    }

    const oldStatus = user.status;
    const updatedUser = await User.findByIdAndUpdate(
      targetId,
      { status: "disabled", disabledAt: new Date() },
      { new: true }
    ).select("-passwordHash");

    // Write Audit Log
    await AuditLog.create({
      actorId: adminId,
      targetId: targetId,
      action: "user.soft_deleted",
      entityType: "user",
      entityId: targetId,
      summaryBefore: { status: oldStatus },
      summaryAfter: { status: "disabled" },
    });

    return {
      statusCode: 200,
      success: true,
      data: updatedUser,
      message: "Người dùng đã được xóa tạm thời (đưa vào thùng rác)",
    };
  },

  async restoreUser(targetId, adminId) {
    if (!targetId) {
      throw new AdminViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw new AdminViewModelError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
    }

    const oldStatus = user.status;
    const updatedUser = await User.findByIdAndUpdate(
      targetId,
      { status: "active", disabledAt: null },
      { new: true }
    ).select("-passwordHash");

    // Write Audit Log
    await AuditLog.create({
      actorId: adminId,
      targetId: targetId,
      action: "user.restored",
      entityType: "user",
      entityId: targetId,
      summaryBefore: { status: oldStatus },
      summaryAfter: { status: "active" },
    });

    return {
      statusCode: 200,
      success: true,
      data: updatedUser,
      message: "Người dùng đã được phục hồi thành công",
    };
  },

  async disableUser(targetId, adminId) {
    if (!targetId) {
      throw new AdminViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }
    if (targetId.toString() === adminId.toString()) {
      throw new AdminViewModelError(400, "SELF_ACTION_NOT_ALLOWED", "Bạn không thể tự vô hiệu hóa chính mình");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw new AdminViewModelError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
    }

    if (user.role === "admin") {
      throw new AdminViewModelError(403, "ADMIN_ACTION_FORBIDDEN", "Không thể xóa hoặc vô hiệu hóa tài khoản quản trị viên khác");
    }

    const oldStatus = user.status;
    const updatedUser = await User.findByIdAndUpdate(
      targetId,
      { status: "disabled", disabledAt: new Date() },
      { new: true }
    ).select("-passwordHash");

    // Write Audit Log
    await AuditLog.create({
      actorId: adminId,
      targetId: targetId,
      action: "user.disabled",
      entityType: "user",
      entityId: targetId,
      summaryBefore: { status: oldStatus },
      summaryAfter: { status: "disabled" },
    });

    return {
      statusCode: 200,
      success: true,
      data: updatedUser,
      message: "Tài khoản đã được vô hiệu hóa",
    };
  },

  async enableUser(targetId, adminId) {
    if (!targetId) {
      throw new AdminViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }

    const user = await User.findById(targetId);
    if (!user) {
      throw new AdminViewModelError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
    }

    const oldStatus = user.status;
    const updatedUser = await User.findByIdAndUpdate(
      targetId,
      { status: "active", disabledAt: null },
      { new: true }
    ).select("-passwordHash");

    // Write Audit Log
    await AuditLog.create({
      actorId: adminId,
      targetId: targetId,
      action: "user.enabled",
      entityType: "user",
      entityId: targetId,
      summaryBefore: { status: oldStatus },
      summaryAfter: { status: "active" },
    });

    return {
      statusCode: 200,
      success: true,
      data: updatedUser,
      message: "Tài khoản đã được kích hoạt hoạt động",
    };
  },

  async getAuditLogs(query = {}) {
    const { page = 1, limit = 20, action, entityType, userId, from, to, search } = query;

    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    if (userId) {
      filter.actorId = userId;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = new Date(from);
      }
      if (to) {
        filter.createdAt.$lte = new Date(to);
      }
    }

    if (search) {
      // Find users whose name or email matches search
      const userMatches = await User.find({
        $or: [
          { displayName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      const matchedUserIds = userMatches.map((u) => u._id);

      filter.$or = [
        { actorId: { $in: matchedUserIds } },
        { action: { $regex: search, $options: "i" } },
        { entityType: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const logs = await AuditLog.find(filter)
      .populate("actorId", "displayName email avatarUrl")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await AuditLog.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const formattedLogs = logs.map((log) => {
      const actor = log.actorId && typeof log.actorId === "object"
        ? {
            id: log.actorId._id,
            displayName: log.actorId.displayName,
            email: log.actorId.email,
            avatarUrl: log.actorId.avatarUrl,
          }
        : null;

      return {
        id: log._id,
        actorId: log.actorId ? (log.actorId._id || log.actorId) : null,
        actor,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        targetId: log.targetId,
        summaryBefore: log.summaryBefore,
        summaryAfter: log.summaryAfter,
        createdAt: log.createdAt,
      };
    });

    return {
      statusCode: 200,
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      },
    };
  },
};

export { AdminViewModelError };
export default adminViewModel;
