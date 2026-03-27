import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

class AuthViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "AuthViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const validateRegisterPayload = (payload) => {
  const { email, password, displayName } = payload;

  if (!email || !email.includes("@")) {
    throw new AuthViewModelError(400, "INVALID_EMAIL", "Email không hợp lệ");
  }

  if (!password || password.length < 8) {
    throw new AuthViewModelError(
      400,
      "WEAK_PASSWORD",
      "Password tối thiểu 8 ký tự",
    );
  }

  if (!displayName || displayName.length < 2 || displayName.length > 50) {
    throw new AuthViewModelError(
      400,
      "INVALID_DISPLAYNAME",
      "displayName phải từ 2-50 ký tự",
    );
  }
};

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
  return { accessToken, refreshToken };
};

const hashToken = async (token) => {
  return bcrypt.hash(token, 10);
};

const verifyTokenHash = async (token, hash) => {
  return bcrypt.compare(token, hash);
};

const formatUserResponse = (user) => ({
  id: user._id,
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  status: user.status,
  providers: user.providers,
});

const authViewModel = {
  async register(payload) {
    validateRegisterPayload(payload);
    const { email, password, displayName } = payload;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AuthViewModelError(
        409,
        "EMAIL_EXISTS",
        "Email đã được đăng ký",
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
      providers: ["local"],
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id);
    const refreshTokenHash = await hashToken(refreshToken);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    await RefreshSession.create({
      userId: newUser._id,
      tokenHash: refreshTokenHash,
      expiresAt: expiryDate,
    });

    return {
      statusCode: 201,
      success: true,
      data: {
        accessToken,
        user: formatUserResponse(newUser),
      },
      message: "Đăng ký thành công",
    };
  },

  async login(payload) {
    const { email, password } = payload;

    if (!email || !password) {
      throw new AuthViewModelError(
        400,
        "MISSING_CREDENTIALS",
        "Email và password là bắt buộc",
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AuthViewModelError(
        401,
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu không đúng",
      );
    }

    if (user.status === "disabled") {
      throw new AuthViewModelError(
        403,
        "USER_DISABLED",
        "Tài khoản đã bị vô hiệu hóa",
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthViewModelError(
        401,
        "INVALID_CREDENTIALS",
        "Email hoặc mật khẩu không đúng",
      );
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    const refreshTokenHash = await hashToken(refreshToken);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    await RefreshSession.create({
      userId: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: expiryDate,
    });

    return {
      statusCode: 200,
      success: true,
      data: {
        accessToken,
        user: formatUserResponse(user),
      },
      message: "Đăng nhập thành công",
    };
  },

  async refresh(payload) {
    const { refreshToken } = payload;

    if (!refreshToken) {
      throw new AuthViewModelError(
        401,
        "MISSING_REFRESH_TOKEN",
        "Refresh token là bắt buộc",
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      throw new AuthViewModelError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token không hợp lệ hoặc hết hạn",
      );
    }

    const session = await RefreshSession.findOne({ userId: decoded.userId });
    if (!session) {
      throw new AuthViewModelError(
        401,
        "SESSION_NOT_FOUND",
        "Session không tồn tại",
      );
    }

    const isTokenValid = await verifyTokenHash(refreshToken, session.tokenHash);
    if (!isTokenValid) {
      throw new AuthViewModelError(
        401,
        "INVALID_TOKEN_HASH",
        "Token không khớp với session",
      );
    }

    const accessToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    return {
      statusCode: 200,
      success: true,
      data: {
        accessToken,
      },
    };
  },

  async logout(payload) {
    const { userId } = payload;

    if (!userId) {
      throw new AuthViewModelError(
        400,
        "MISSING_USERID",
        "User ID là bắt buộc",
      );
    }

    await RefreshSession.deleteMany({ userId });

    return {
      statusCode: 200,
      success: true,
      message: "Đăng xuất thành công",
    };
  },
};

export { AuthViewModelError };
export default authViewModel;
