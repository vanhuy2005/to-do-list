import User from "../models/User.js";
import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";

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

    const formattedUsers = users.map((user) => ({
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      providers: user.providers,
      lastOnlineAt: user.lastOnlineAt,
      createdAt: user.createdAt,
    }));

    return {
      statusCode: 200,
      success: true,
      data: {
        users: formattedUsers,
        pagination: { page, limit, total, totalPages },
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
    });

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
      { status: "disabled" },
      { new: true },
    );

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
      $or: [{ status: "disabled" }, { deletedAt: { $ne: null } }],
    };

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ deletedAt: -1 });

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

    const taskDistribution = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const providerUsage = await User.aggregate([
      { $unwind: "$providers" },
      { $group: { _id: "$providers", count: { $sum: 1 } } },
    ]);

    const distribution = {};
    taskDistribution.forEach((item) => {
      distribution[item._id] = item.count;
    });

    const providers = {};
    providerUsage.forEach((item) => {
      providers[item._id] = item.count;
    });

    return {
      statusCode: 200,
      success: true,
      data: {
        userGrowthTrend: [],
        taskDistribution: distribution,
        providerUsage: providers,
        totalUsers,
        totalTasks,
      },
    };
  },

  async deleteUserOffline(userId) {
    if (!userId) {
      throw new AdminViewModelError(
        404,
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
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      throw new AdminViewModelError(
        404,
        "USER_NOT_FOUND",
        "Không tìm thấy người dùng",
      );
    }

    return {
      statusCode: 200,
      success: true,
      data: deletedUser,
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
