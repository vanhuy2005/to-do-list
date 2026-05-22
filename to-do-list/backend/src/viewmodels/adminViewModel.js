import User from "../models/User.js";
import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import NotificationLog from "../models/NotificationLog.js";
import cloudinaryService from "../services/cloudinaryService.js";

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

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
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
          assigneeId: user._id,
          status: "completed",
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

  async getAnalytics() {
    const totalUsers = await User.countDocuments();
    const totalTasks = await Task.countDocuments();

    // User growth trend - last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Create 7-day trend array
    const trendMap = {};
    const days = ["TH2", "TH3", "TH4", "TH5", "TH6", "TH7", "CN"];
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      trendMap[dateStr] = 0;
    }

    userGrowthData.forEach((item) => {
      trendMap[item._id] = item.count;
    });

    const userGrowthTrend = Object.values(trendMap);

    // Task status distribution
    const taskStatusDistribution = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const taskDistribution = {};
    taskStatusDistribution.forEach((item) => {
      if (item._id === "todo") taskDistribution.todo = item.count;
      if (item._id === "doing") taskDistribution.doing = item.count;
      if (item._id === "done") taskDistribution.done = item.count;
    });

    // Top users by task count
    const topUsersData = await Task.aggregate([
      {
        $group: {
          _id: "$ownerId",
          taskCount: { $sum: 1 },
        },
      },
      { $sort: { taskCount: -1 } },
      { $limit: 3 },
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
      taskCount: item.taskCount,
    }));

    return {
      statusCode: 200,
      success: true,
      data: {
        userGrowthTrend,
        taskDistribution,
        topUsers,
        totalUsers,
        totalTasks,
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

  async getAuditLogs(query = {}) {
    const { page = 1, limit = 20 } = query;

    const skip = (page - 1) * limit;
    const logs = await AuditLog.find()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await AuditLog.countDocuments();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      success: true,
      data: {
        logs,
        pagination: { page, limit, total, totalPages },
      },
    };
  },
};

export { AdminViewModelError };
export default adminViewModel;
