import mongoose from "mongoose";
import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";
import AuditLog from "../models/AuditLog.js";
import { getPermissionsByRole } from "../config/permissions.js";

class ProfileViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "ProfileViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const formatUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  role: user.role,
  status: user.status,
  providers: user.providers,
  permissions: getPermissionsByRole(user.role),
  preferredLanguage: user.preferredLanguage,
  themePreference: user.themePreference,
  customStatuses: user.customStatuses,
  createdAt: user.createdAt,
});

const profileViewModel = {
  async getProfile(userId) {
    if (!userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ProfileViewModelError(
        404,
        "USER_NOT_FOUND",
        "User không tồn tại",
      );
    }

    return {
      statusCode: 200,
      success: true,
      data: formatUserResponse(user),
    };
  },

  async updateProfile(userId, payload) {
    if (!userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    const { displayName, preferredLanguage, themePreference, avatarUrl } =
      payload;

    const updateData = {};
    if (displayName) {
      if (displayName.length < 2 || displayName.length > 50) {
        throw new ProfileViewModelError(
          400,
          "INVALID_DISPLAYNAME",
          "displayName phải từ 2-50 ký tự",
        );
      }
      updateData.displayName = displayName;
    }

    if (preferredLanguage) {
      if (!["vi", "en"].includes(preferredLanguage)) {
        throw new ProfileViewModelError(
          400,
          "INVALID_LANGUAGE",
          "Ngôn ngữ không hợp lệ",
        );
      }
      updateData.preferredLanguage = preferredLanguage;
    }

    if (themePreference) {
      if (!["light", "dark"].includes(themePreference)) {
        throw new ProfileViewModelError(
          400,
          "INVALID_THEME",
          "Theme không hợp lệ",
        );
      }
      updateData.themePreference = themePreference;
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === "") {
        updateData.avatarUrl = null;
      } else if (typeof avatarUrl === "string") {
        const normalizedAvatarUrl = avatarUrl.trim();
        if (
          !/^https?:\/\//i.test(normalizedAvatarUrl) &&
          !/^data:image\/[a-zA-Z]+;base64,/i.test(normalizedAvatarUrl)
        ) {
          throw new ProfileViewModelError(
            400,
            "INVALID_AVATAR_URL",
            "avatarUrl phải là URL hoặc ảnh base64 hợp lệ",
          );
        }
        updateData.avatarUrl = normalizedAvatarUrl;
      } else {
        throw new ProfileViewModelError(
          400,
          "INVALID_AVATAR_URL",
          "avatarUrl phải là URL hoặc ảnh base64 hợp lệ",
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser) {
      throw new ProfileViewModelError(
        404,
        "USER_NOT_FOUND",
        "User không tồn tại",
      );
    }

    return {
      statusCode: 200,
      success: true,
      data: formatUserResponse(updatedUser),
    };
  },

  async getSessions(userId) {
    if (!userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    const sessions = await RefreshSession.find({ userId }).sort({
      createdAt: -1,
    });

    const formattedSessions = sessions.map((session) => ({
      id: session._id,
      userAgent: session.userAgent || "Unknown",
      ipAddress: session.ipAddress || "Unknown",
      createdAt: session.createdAt,
      isCurrent: false,
    }));

    return {
      statusCode: 200,
      success: true,
      data: formattedSessions,
    };
  },

  async deleteSession(sessionId, userId) {
    if (!sessionId || !userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_DATA",
        "Session ID và User ID là bắt buộc",
      );
    }

    const session = await RefreshSession.findById(sessionId);
    if (!session) {
      throw new ProfileViewModelError(
        404,
        "SESSION_NOT_FOUND",
        "Session không tồn tại",
      );
    }

    if (session.userId.toString() !== userId) {
      throw new ProfileViewModelError(
        403,
        "FORBIDDEN",
        "Không có quyền xóa session này",
      );
    }

    await RefreshSession.findByIdAndDelete(sessionId);

    return {
      statusCode: 200,
      success: true,
      message: "Đã đăng xuất thiết bị",
    };
  },

  async getAuditLogs(userId, query = {}) {
    if (!userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    const { page = 1, limit = 20, search } = query;
    const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const normalizedLimit = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 20),
    );
    const skip = (normalizedPage - 1) * normalizedLimit;

    const filter = {
      actorId: userId,
      entityType: "task",
    };

    if (search && typeof search === "string") {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { "summaryAfter.title": searchRegex },
        { "summaryBefore.title": searchRegex }
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit),
      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / normalizedLimit));

    return {
      statusCode: 200,
      success: true,
      data: {
        logs,
        pagination: {
          page: normalizedPage,
          limit: normalizedLimit,
          total,
          totalPages,
        },
      },
    };
  },

  async getAuditLogById(userId, logId) {
    if (!userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    if (!logId || !mongoose.Types.ObjectId.isValid(logId)) {
      throw new ProfileViewModelError(
        400,
        "INVALID_AUDIT_LOG_ID",
        "Audit log ID không hợp lệ",
      );
    }

    const log = await AuditLog.findOne({
      _id: logId,
      actorId: userId,
      entityType: "task",
    });

    if (!log) {
      throw new ProfileViewModelError(
        404,
        "AUDIT_LOG_NOT_FOUND",
        "Không tìm thấy audit log",
      );
    }

    return {
      statusCode: 200,
      success: true,
      data: log,
    };
  },

  async deleteAuditLogById(userId, logId) {
    if (!userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    if (!logId || !mongoose.Types.ObjectId.isValid(logId)) {
      throw new ProfileViewModelError(
        400,
        "INVALID_AUDIT_LOG_ID",
        "Audit log ID không hợp lệ",
      );
    }

    const deletedLog = await AuditLog.findOneAndDelete({
      _id: logId,
      actorId: userId,
      entityType: "task",
    });

    if (!deletedLog) {
      throw new ProfileViewModelError(
        404,
        "AUDIT_LOG_NOT_FOUND",
        "Không tìm thấy audit log để xóa",
      );
    }

    return {
      statusCode: 200,
      success: true,
      data: {
        id: deletedLog._id,
      },
      message: "Đã xóa audit log",
    };
  },

  async deleteAuditLogsByUserWithFilters(requester, targetUserId, query = {}) {
    const requesterId = requester?.id?.toString?.() || "";
    const requesterRole = requester?.role || "user";

    if (!requesterId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new ProfileViewModelError(
        400,
        "INVALID_TARGET_USER_ID",
        "target user ID không hợp lệ",
      );
    }

    const normalizedTargetUserId = targetUserId.toString();

    if (requesterRole !== "admin" && requesterId !== normalizedTargetUserId) {
      throw new ProfileViewModelError(
        403,
        "FORBIDDEN",
        "Không có quyền xóa audit log của user khác",
      );
    }

    const { day, month, type } = query;

    if (day && month) {
      throw new ProfileViewModelError(
        400,
        "INVALID_FILTERS",
        "Chỉ được truyền day hoặc month, không truyền cả hai",
      );
    }

    const filter = {
      actorId: normalizedTargetUserId,
      entityType: "task",
    };

    if (type) {
      const allowedActions = ["task.created", "task.updated", "task.deleted"];
      if (!allowedActions.includes(type)) {
        throw new ProfileViewModelError(
          400,
          "INVALID_TYPE_FILTER",
          "type không hợp lệ. Chỉ hỗ trợ: task.created, task.updated, task.deleted",
        );
      }

      filter.action = type;
    }

    if (day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        throw new ProfileViewModelError(
          400,
          "INVALID_DAY_FILTER",
          "day phải có định dạng YYYY-MM-DD",
        );
      }

      const start = new Date(`${day}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        throw new ProfileViewModelError(
          400,
          "INVALID_DAY_FILTER",
          "day không hợp lệ",
        );
      }

      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new ProfileViewModelError(
          400,
          "INVALID_MONTH_FILTER",
          "month phải có định dạng YYYY-MM",
        );
      }

      const start = new Date(`${month}-01T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        throw new ProfileViewModelError(
          400,
          "INVALID_MONTH_FILTER",
          "month không hợp lệ",
        );
      }

      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    const deleteResult = await AuditLog.deleteMany(filter);

    return {
      statusCode: 200,
      success: true,
      data: {
        deletedCount: deleteResult.deletedCount || 0,
      },
      message: `Đã xóa ${(deleteResult.deletedCount || 0).toLocaleString("vi-VN")} audit log theo bộ lọc`,
    };
  },

  async deleteAuditLogs(userId, query = {}) {
    if (!userId) {
      throw new ProfileViewModelError(
        400,
        "MISSING_USER_ID",
        "User ID là bắt buộc",
      );
    }

    const { keep = 0 } = query;
    const normalizedKeep = Math.max(0, Number.parseInt(keep, 10) || 0);

    const baseFilter = {
      actorId: userId,
      entityType: "task",
    };

    // keep > 0: giữ lại N log mới nhất, xóa phần còn lại.
    if (normalizedKeep > 0) {
      const keepLogs = await AuditLog.find(baseFilter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(normalizedKeep)
        .select("_id");

      const keepIds = keepLogs.map((log) => log._id);
      const deleteFilter = {
        ...baseFilter,
        _id: { $nin: keepIds },
      };

      const deleteResult = await AuditLog.deleteMany(deleteFilter);

      return {
        statusCode: 200,
        success: true,
        data: {
          deletedCount: deleteResult.deletedCount || 0,
          keptCount: keepIds.length,
        },
        message: `Đã xóa ${(deleteResult.deletedCount || 0).toLocaleString("vi-VN")} audit log, giữ lại ${keepIds.length.toLocaleString("vi-VN")}`,
      };
    }

    const deleteResult = await AuditLog.deleteMany(baseFilter);

    return {
      statusCode: 200,
      success: true,
      data: {
        deletedCount: deleteResult.deletedCount || 0,
        keptCount: 0,
      },
      message: `Đã xóa toàn bộ ${(deleteResult.deletedCount || 0).toLocaleString("vi-VN")} audit log của user`,
    };
  },
};

export { ProfileViewModelError };
export default profileViewModel;
