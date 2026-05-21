import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new multer.MulterError("LIMIT_UNSUPPORTED_FILE_TYPE", "avatar");
    error.message = "Chỉ chấp nhận các định dạng ảnh JPEG, PNG, GIF, WebP";
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
}).single("avatar");

export const imageUploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: {
              code: "AVATAR_FILE_TOO_LARGE",
              message: "Kích thước tệp vượt quá giới hạn 5MB cho phép",
            },
          });
        }
        if (err.code === "LIMIT_UNSUPPORTED_FILE_TYPE") {
          return res.status(400).json({
            success: false,
            error: {
              code: "AVATAR_INVALID_TYPE",
              message: err.message || "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận tệp JPEG, PNG, GIF hoặc WebP.",
            },
          });
        }
      }
      return res.status(400).json({
        success: false,
        error: {
          code: "AVATAR_UPLOAD_ERROR",
          message: err.message || "Lỗi trong quá trình tải tệp lên",
        },
      });
    }
    next();
  });
};

export const validateImageBuffer = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: "AVATAR_FILE_REQUIRED",
        message: "Không có tệp ảnh nào được gửi lên"
      }
    });
  }

  const buffer = req.file.buffer;
  if (!buffer || buffer.length < 4) {
    return res.status(400).json({
      success: false,
      error: {
        code: "AVATAR_INVALID_TYPE",
        message: "Tệp ảnh không hợp lệ hoặc bị hỏng"
      }
    });
  }

  // Check Magic Bytes
  const hex = buffer.toString("hex", 0, 4).toUpperCase();
  const isJpeg = hex.startsWith("FFD8FF");
  const isPng = hex.startsWith("89504E47");
  const isGif = hex.startsWith("47494638"); // GIF87a or GIF89a
  const isWebp = hex === "52494646" && buffer.toString("hex", 8, 12).toUpperCase() === "57454250"; // RIFF ... WEBP

  if (!isJpeg && !isPng && !isGif && !isWebp) {
    return res.status(400).json({
      success: false,
      error: {
        code: "AVATAR_INVALID_TYPE",
        message: "Định dạng thực tế của tệp không khớp với phần mở rộng tệp hoặc không được hỗ trợ (chỉ chấp nhận JPEG, PNG, GIF, WebP)."
      }
    });
  }

  next();
};
