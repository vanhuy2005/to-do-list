import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import RefreshSession from "../models/RefreshSession.js";
import { getPermissionsByRole } from "../config/permissions.js";
import {
  applyBetterAuthHeaders,
  fetchBetterAuthSession,
  getBetterAuth,
  getOAuthErrorURL,
  getOAuthSuccessURL,
  getOAuthLinkSuccessURL,
  getOAuthLinkErrorURL,
  syncLegacyCredentialAccount,
} from "../services/betterAuthService.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

class AuthViewModelError extends Error {
  constructor(statusCode, errorCode, message, meta = {}) {
    super(message);
    this.name = "AuthViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.meta = meta;
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
  permissions: getPermissionsByRole(user.role),
});

const mapBetterAuthError = (error, fallbackMessage = "Auth flow failed") => {
  const statusCode = error?.statusCode || error?.status || 500;
  const errorCode =
    error?.body?.code || error?.code || error?.errorCode || "BETTER_AUTH_ERROR";
  const message = error?.body?.message || error?.message || fallbackMessage;

  return new AuthViewModelError(statusCode, errorCode, message, {
    headers: error?.headers,
  });
};

const getActiveUserOrThrow = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AuthViewModelError(401, "USER_NOT_FOUND", "User không tồn tại");
  }

  if (user.status === "disabled") {
    throw new AuthViewModelError(
      403,
      "USER_DISABLED",
      "Tài khoản đã bị vô hiệu hóa",
    );
  }

  return user;
};

const tryBetterAuthSession = async (headers) => {
  try {
    return await fetchBetterAuthSession(headers);
  } catch {
    return null;
  }
};

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
};

const buildCompatibilitySession = async (userId) => {
  const user = await getActiveUserOrThrow(userId);

  return {
    accessToken: generateAccessToken(user._id),
    user: formatUserResponse(user),
  };
};

const createBetterAuthSessionHeaders = async (email, password, headers) => {
  try {
    const result = await getBetterAuth().api.signInEmail({
      headers,
      body: {
        email,
        password,
      },
      returnHeaders: true,
      returnStatus: true,
    });

    return {
      headers: result?.headers || null,
      statusCode: result?.status || 200,
    };
  } catch (error) {
    console.warn(
      "[betterAuth] Failed to create session cookie:",
      error?.message || error,
    );
    return {
      headers: null,
      statusCode: 200,
    };
  }
};

const authViewModel = {
  async register(payload, headers) {
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
    const days = parseInt(REFRESH_TOKEN_EXPIRY) || 7;
    expiryDate.setDate(expiryDate.getDate() + days);

    await RefreshSession.create({
      userId: newUser._id,
      tokenHash: refreshTokenHash,
      expiresAt: expiryDate,
    });

    await syncLegacyCredentialAccount(newUser);
    const betterAuthSession = await createBetterAuthSessionHeaders(
      email,
      password,
      headers,
    );

    return {
      statusCode: 201,
      success: true,
      headers: betterAuthSession.headers,
      refreshToken,
      data: {
        accessToken,
        user: formatUserResponse(newUser),
      },
      message: "Đăng ký thành công",
    };
  },

  async login(payload, headers) {
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
    const days = parseInt(REFRESH_TOKEN_EXPIRY) || 7;
    expiryDate.setDate(expiryDate.getDate() + days);

    await RefreshSession.create({
      userId: user._id,
      tokenHash: refreshTokenHash,
      expiresAt: expiryDate,
    });

    await syncLegacyCredentialAccount(user);
    const betterAuthSession = await createBetterAuthSessionHeaders(
      email,
      password,
      headers,
    );

    return {
      statusCode: betterAuthSession.statusCode || 200,
      success: true,
      headers: betterAuthSession.headers,
      refreshToken,
      data: {
        accessToken,
        user: formatUserResponse(user),
      },
      message: "Đăng nhập thành công",
    };
  },

  async refresh(payload) {
    const betterAuthSession = await tryBetterAuthSession(payload.headers);
    if (betterAuthSession?.user?.id) {
      const user = await getActiveUserOrThrow(betterAuthSession.user.id);

      return {
        statusCode: 200,
        success: true,
        data: {
          accessToken: generateAccessToken(user._id),
        },
      };
    }

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

    const sessions = await RefreshSession.find({ userId: decoded.userId });
    if (!sessions || sessions.length === 0) {
      throw new AuthViewModelError(
        401,
        "SESSION_NOT_FOUND",
        "Session không tồn tại",
      );
    }

    let validSession = null;
    for (const session of sessions) {
      const isTokenValid = await verifyTokenHash(refreshToken, session.tokenHash);
      if (isTokenValid) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
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

  async getSession(payload) {
    const betterAuthSession = await fetchBetterAuthSession(payload.headers);
    if (!betterAuthSession?.user?.id) {
      throw new AuthViewModelError(
        401,
        "SESSION_NOT_FOUND",
        "Không tìm thấy Better Auth session hợp lệ",
      );
    }

    const data = await buildCompatibilitySession(betterAuthSession.user.id);

    return {
      statusCode: 200,
      success: true,
      data,
    };
  },

  async logout(payload) {
    const { userId, headers } = payload;

    if (!userId) {
      throw new AuthViewModelError(
        400,
        "MISSING_USERID",
        "User ID là bắt buộc",
      );
    }

    let betterAuthHeaders = null;
    let betterAuthStatus = 200;

    try {
      const auth = getBetterAuth();
      const result = await auth.api.signOut({
        headers,
        returnHeaders: true,
        returnStatus: true,
      });

      betterAuthHeaders = result.headers;
      betterAuthStatus = result.status || 200;
    } catch (error) {
      // Ignore if not a Better Auth session
    }

    await RefreshSession.deleteMany({ userId });

    return {
      statusCode: betterAuthStatus,
      success: true,
      headers: betterAuthHeaders,
      message: "Đăng xuất thành công",
    };
  },

  async startGoogleOAuth(headers, token) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new AuthViewModelError(
        500,
        "GOOGLE_OAUTH_NOT_CONFIGURED",
        "Google OAuth chưa được cấu hình trong môi trường",
      );
    }

    try {
      let activeHeaders = headers;
      let isAlreadyLoggedIn = false;

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded?.userId) {
            const sessionResult = await getBetterAuth().api.createSession({
              userId: String(decoded.userId),
              headers,
              returnHeaders: true,
            });

            if (sessionResult?.headers) {
              const mergedHeaders = new Headers(headers);
              sessionResult.headers.forEach((value, key) => {
                if (key.toLowerCase() === "set-cookie") {
                  mergedHeaders.append(key, value);
                } else {
                  mergedHeaders.set(key, value);
                }
              });
              activeHeaders = mergedHeaders;
            }
            isAlreadyLoggedIn = true;
          }
        } catch (jwtError) {
          console.error("JWT verification failed during OAuth start:", jwtError);
        }
      }

      if (!isAlreadyLoggedIn) {
        const session = await tryBetterAuthSession(headers);
        isAlreadyLoggedIn = !!session?.user?.id;
      }

      const successURL = isAlreadyLoggedIn ? getOAuthLinkSuccessURL() : getOAuthSuccessURL();
      const errorURL = isAlreadyLoggedIn ? getOAuthLinkErrorURL() : getOAuthErrorURL();

      const result = await getBetterAuth().api.signInSocial({
        body: {
          provider: "google",
          callbackURL: successURL,
          newUserCallbackURL: successURL,
          errorCallbackURL: errorURL,
        },
        headers: activeHeaders,
        returnHeaders: true,
        returnStatus: true,
      });

      const finalHeaders = new Headers(result.headers);
      if (activeHeaders !== headers) {
        activeHeaders.forEach((value, key) => {
          if (key.toLowerCase() === "set-cookie") {
            finalHeaders.append(key, value);
          }
        });
      }

      return {
        statusCode: result.status || 302,
        headers: finalHeaders,
        data: result.response,
      };
    } catch (error) {
      throw mapBetterAuthError(error, "Khởi tạo Google OAuth thất bại");
    }
  },
};

export { AuthViewModelError, applyBetterAuthHeaders };
export default authViewModel;
