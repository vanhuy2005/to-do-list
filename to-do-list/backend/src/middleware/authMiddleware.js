import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getPermissionsByRole } from "../config/permissions.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: "MISSING_TOKEN",
        message: "Token là bắt buộc",
      },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user từ database để lấy role + status
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User không tồn tại",
        },
      });
    }

    if (user.status === "disabled") {
      return res.status(403).json({
        success: false,
        error: {
          code: "USER_DISABLED",
          message: "Tài khoản đã bị vô hiệu hóa",
        },
      });
    }

    // Attach user info vào request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
      permissions: getPermissionsByRole(user.role),
    };
    req.userId = user._id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Token không hợp lệ hoặc hết hạn",
      },
    });
  }
};

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Bạn cần đăng nhập để tiếp tục",
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Bạn không có quyền truy cập tài nguyên này",
        },
      });
    }

    next();
  };

export const requirePermission =
  (...permissions) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Bạn cần đăng nhập để tiếp tục",
        },
      });
    }

    const userPermissions =
      req.user.permissions || getPermissionsByRole(req.user.role);
    const hasAccess = permissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSUFFICIENT_PERMISSION",
          message: "Bạn không có đủ quyền để thực hiện thao tác này",
        },
      });
    }

    next();
  };

export default authMiddleware;
