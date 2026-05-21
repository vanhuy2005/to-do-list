import mongoose from "mongoose";
import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";
import AuditLog from "../models/AuditLog.js";
import NotificationLog from "../models/NotificationLog.js";
import cloudinaryService from "../services/cloudinaryService.js";
import emailService from "../services/emailService.js";
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
  avatarPublicId: user.avatarPublicId,
  role: user.role,
  status: user.status,
  providers: user.providers,
  permissions: getPermissionsByRole(user.role),
  preferredLanguage: user.preferredLanguage,
  themePreference: user.themePreference,
  customStatuses: user.customStatuses,
  notificationPreferences: user.notificationPreferences || {
    emailOverdue: true,
    emailDigest: true,
    digestHour: 8,
    timezone: "Asia/Ho_Chi_Minh",
    unsubscribedAt: null,
  },
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

  async uploadAvatar(userId, fileBuffer) {
    if (!userId) {
      throw new ProfileViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }
    if (!fileBuffer) {
      throw new ProfileViewModelError(400, "AVATAR_FILE_REQUIRED", "Không có tệp ảnh nào được gửi lên");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ProfileViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    const oldAvatarPublicId = user.avatarPublicId;
    const oldAvatarUrl = user.avatarUrl;

    try {
      const uploadResult = await cloudinaryService.uploadAvatar(fileBuffer, userId);

      user.avatarUrl = uploadResult.secureUrl;
      user.avatarPublicId = uploadResult.publicId;
      await user.save();

      // Clean up old avatar assets on Cloudinary in the background
      if (oldAvatarPublicId) {
        cloudinaryService.deleteAvatar(oldAvatarPublicId).catch((err) => {
          console.error("Failed to delete old avatar on Cloudinary:", err);
        });
      }

      // Log success to AuditLog
      await AuditLog.create({
        actorId: userId,
        action: "profile.avatar_uploaded",
        entityType: "user",
        entityId: userId,
        summaryBefore: { avatarUrl: oldAvatarUrl },
        summaryAfter: { avatarUrl: uploadResult.secureUrl },
      });

      return {
        statusCode: 200,
        success: true,
        data: {
          avatarUrl: uploadResult.secureUrl,
          thumbnails: uploadResult.thumbnails,
        },
        message: "Ảnh đại diện đã được tải lên thành công",
      };
    } catch (error) {
      console.error("Avatar upload VM error:", error);
      throw new ProfileViewModelError(500, "AVATAR_UPLOAD_FAILED", "Tải ảnh đại diện lên thất bại: " + error.message);
    }
  },

  async deleteAvatar(userId) {
    if (!userId) {
      throw new ProfileViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ProfileViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    if (!user.avatarUrl && !user.avatarPublicId) {
      throw new ProfileViewModelError(400, "AVATAR_NOT_FOUND", "Người dùng chưa thiết lập ảnh đại diện nào để xóa");
    }

    const oldAvatarUrl = user.avatarUrl;
    const oldAvatarPublicId = user.avatarPublicId;

    user.avatarUrl = null;
    user.avatarPublicId = null;
    await user.save();

    if (oldAvatarPublicId) {
      await cloudinaryService.deleteAvatar(oldAvatarPublicId);
    }

    // Log deletion to AuditLog
    await AuditLog.create({
      actorId: userId,
      action: "profile.avatar_deleted",
      entityType: "user",
      entityId: userId,
      summaryBefore: { avatarUrl: oldAvatarUrl },
      summaryAfter: { avatarUrl: null },
    });

    return {
      statusCode: 200,
      success: true,
      message: "Đã gỡ bỏ ảnh đại diện thành công",
    };
  },

  async getNotificationPreferences(userId) {
    if (!userId) {
      throw new ProfileViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ProfileViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    const prefs = user.notificationPreferences || {
      emailOverdue: true,
      emailDigest: true,
      digestHour: 8,
      timezone: "Asia/Ho_Chi_Minh",
      unsubscribedAt: null,
    };

    return {
      statusCode: 200,
      success: true,
      data: prefs,
    };
  },

  async updateNotificationPreferences(userId, payload) {
    if (!userId) {
      throw new ProfileViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ProfileViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    const { emailOverdue, emailDigest, digestHour, timezone } = payload;
    const oldPreferences = JSON.parse(JSON.stringify(user.notificationPreferences || {}));

    if (user.notificationPreferences === undefined || user.notificationPreferences === null) {
      user.notificationPreferences = {
        emailOverdue: true,
        emailDigest: true,
        digestHour: 8,
        timezone: "Asia/Ho_Chi_Minh",
        unsubscribedAt: null,
      };
    }

    if (emailOverdue !== undefined) {
      user.notificationPreferences.emailOverdue = !!emailOverdue;
    }
    if (emailDigest !== undefined) {
      user.notificationPreferences.emailDigest = !!emailDigest;
    }

    if (digestHour !== undefined) {
      const parsedHour = Number.parseInt(digestHour, 10);
      if (Number.isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23 || !Number.isInteger(parsedHour)) {
        throw new ProfileViewModelError(400, "INVALID_DIGEST_HOUR", "Giờ gộp thư phải là số nguyên từ 0 đến 23");
      }
      user.notificationPreferences.digestHour = parsedHour;
    }

    if (timezone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        user.notificationPreferences.timezone = timezone;
      } catch (e) {
        throw new ProfileViewModelError(400, "INVALID_TIMEZONE", "Múi giờ IANA gửi lên không hợp lệ");
      }
    }

    // Capture unsubscribe timestamp if either email preference toggles to false
    const wasReceiving = (oldPreferences.emailOverdue !== false || oldPreferences.emailDigest !== false);
    const isReceiving = (user.notificationPreferences.emailOverdue !== false || user.notificationPreferences.emailDigest !== false);
    
    if (wasReceiving && !isReceiving) {
      user.notificationPreferences.unsubscribedAt = new Date();
    } else if (isReceiving) {
      user.notificationPreferences.unsubscribedAt = null;
    }

    await user.save();

    // Log to AuditLog
    await AuditLog.create({
      actorId: userId,
      action: "profile.notification_preferences_updated",
      entityType: "user",
      entityId: userId,
      summaryBefore: oldPreferences,
      summaryAfter: user.notificationPreferences,
    });

    return {
      statusCode: 200,
      success: true,
      data: user.notificationPreferences,
    };
  },

  async unsubscribe(userId, token) {
    if (!userId || !token) {
      throw new ProfileViewModelError(400, "MISSING_DATA", "Thiếu thông tin người dùng hoặc chữ ký bảo mật");
    }

    const verified = emailService.verifyUnsubscribeToken(userId, token);
    if (!verified) {
      throw new ProfileViewModelError(400, "INVALID_UNSUBSCRIBE_TOKEN", "Chữ ký bảo mật không khớp hoặc hết hiệu lực.");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ProfileViewModelError(404, "USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    const oldPreferences = JSON.parse(JSON.stringify(user.notificationPreferences || {}));

    if (user.notificationPreferences === undefined || user.notificationPreferences === null) {
      user.notificationPreferences = {
        emailOverdue: true,
        emailDigest: true,
        digestHour: 8,
        timezone: "Asia/Ho_Chi_Minh",
        unsubscribedAt: null,
      };
    }

    user.notificationPreferences.emailOverdue = false;
    user.notificationPreferences.emailDigest = false;
    user.notificationPreferences.unsubscribedAt = new Date();

    await user.save();

    // Log to AuditLog
    await AuditLog.create({
      actorId: userId,
      action: "profile.unsubscribed_via_email_link",
      entityType: "user",
      entityId: userId,
      summaryBefore: oldPreferences,
      summaryAfter: user.notificationPreferences,
    });

    return {
      statusCode: 200,
      success: true,
      message: "Đã hủy đăng ký nhận thông báo thành công",
    };
  },

  async getNotificationHistory(userId, query = {}) {
    if (!userId) {
      throw new ProfileViewModelError(400, "MISSING_USER_ID", "User ID là bắt buộc");
    }

    const { page = 1, limit = 20 } = query;
    const normalizedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const normalizedLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (normalizedPage - 1) * normalizedLimit;

    const filter = { userId };

    const [logs, total] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit),
      NotificationLog.countDocuments(filter),
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
};

export { ProfileViewModelError };
export default profileViewModel;
