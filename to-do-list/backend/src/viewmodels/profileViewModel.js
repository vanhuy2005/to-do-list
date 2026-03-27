import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";

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

    const { displayName, preferredLanguage, themePreference } = payload;

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
};

export { ProfileViewModelError };
export default profileViewModel;
