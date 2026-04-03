import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

export default authMiddleware;
