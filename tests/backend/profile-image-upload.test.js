import { jest } from "@jest/globals";

// Mock Cloudinary Service
const mockUploadAvatar = jest.fn();
const mockDeleteAvatar = jest.fn();

jest.unstable_mockModule("../../to-do-list/backend/src/services/cloudinaryService.js", () => ({
  default: {
    uploadAvatar: mockUploadAvatar,
    deleteAvatar: mockDeleteAvatar,
    extractPublicId: (url) => {
      if (!url) return null;
      return "todoapp/avatars/test-user-id/avatar";
    },
    generateThumbnails: (url) => ({
      small: `${url}_small`,
      medium: `${url}_medium`
    })
  }
}));

// Mock Database Models
const mockUserFindById = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn();
const mockUserSave = jest.fn();

jest.unstable_mockModule("../../to-do-list/backend/src/models/User.js", () => ({
  default: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate
  }
}));

const mockAuditLogCreate = jest.fn();
jest.unstable_mockModule("../../to-do-list/backend/src/models/AuditLog.js", () => ({
  default: {
    create: mockAuditLogCreate
  }
}));

// Imports
const express = (await import("express")).default;
const request = (await import("supertest")).default;
const { default: profileRouter } = await import("../../to-do-list/backend/src/routes/profileRouters.js");
const { validateImageBuffer } = await import("../../to-do-list/backend/src/middleware/imageUpload.js");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = "test-user-id";
    req.user = { id: "test-user-id" };
    next();
  });
  app.use("/api/v1/profile", profileRouter);
  return app;
};

describe("Profile Image Upload & Magic Bytes Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Magic Bytes Validation Tests ──────────────────────────────────────────
  describe("validateImageBuffer Middleware", () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        file: null
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it("should return 400 when no file is present", () => {
      validateImageBuffer(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "AVATAR_FILE_REQUIRED" })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 when buffer is too short", () => {
      mockReq.file = { buffer: Buffer.from([0xFF, 0xD8]) };
      validateImageBuffer(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "AVATAR_INVALID_TYPE" })
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should pass JPEG magic bytes", () => {
      mockReq.file = { buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]) };
      validateImageBuffer(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should pass PNG magic bytes", () => {
      mockReq.file = { buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47]) };
      validateImageBuffer(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should pass GIF magic bytes", () => {
      mockReq.file = { buffer: Buffer.from([0x47, 0x49, 0x46, 0x38]) };
      validateImageBuffer(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should pass WebP magic bytes", () => {
      const buffer = Buffer.alloc(12);
      buffer.write("RIFF", 0);
      buffer.write("WEBP", 8);
      mockReq.file = { buffer };
      validateImageBuffer(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should reject malicious files posing as images", () => {
      mockReq.file = { buffer: Buffer.from("MZ\x90\x00\x03\x00\x00\x00") }; // EXE header
      validateImageBuffer(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "AVATAR_INVALID_TYPE" })
        })
      );
    });
  });

  // ── 2. Profile View Model Upload/Delete Tests ──────────────────────────────
  describe("profileViewModel.uploadAvatar & deleteAvatar via endpoints", () => {
    it("should upload image successfully, delete old avatar if exists, and save to DB", async () => {
      // Mock user with an existing old avatar
      const mockUserObj = {
        _id: "test-user-id",
        displayName: "Văn Huy",
        avatarUrl: "https://res.cloudinary.com/.../old.jpg",
        avatarPublicId: "todoapp/avatars/test-user-id/avatar_old",
        save: mockUserSave
      };
      
      mockUserFindById.mockResolvedValue(mockUserObj);
      mockUserSave.mockResolvedValue(mockUserObj);
      mockUploadAvatar.mockResolvedValue({
        publicId: "todoapp/avatars/test-user-id/avatar",
        secureUrl: "https://res.cloudinary.com/.../avatar.jpg",
        thumbnails: {
          small: "https://res.cloudinary.com/.../avatar.jpg_small",
          medium: "https://res.cloudinary.com/.../avatar.jpg_medium"
        }
      });
      mockDeleteAvatar.mockResolvedValue({ result: "ok" });

      const app = buildApp();
      // To bypass the file filter in multer during tests, we can mock or construct multipart file.
      // Or we can invoke profileViewModel method directly. Let's do that for direct logic testing!
      const { default: profileViewModel } = await import("../../to-do-list/backend/src/viewmodels/profileViewModel.js");
      
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const result = await profileViewModel.uploadAvatar("test-user-id", jpegBuffer);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.avatarUrl).toBe("https://res.cloudinary.com/.../avatar.jpg");
      
      // Ensure Cloudinary upload was called
      expect(mockUploadAvatar).toHaveBeenCalledWith(jpegBuffer, "test-user-id");
      
      // Ensure DB save was called
      expect(mockUserSave).toHaveBeenCalled();
      expect(mockUserObj.avatarUrl).toBe("https://res.cloudinary.com/.../avatar.jpg");
      expect(mockUserObj.avatarPublicId).toBe("todoapp/avatars/test-user-id/avatar");

      // Ensure audit log was created
      expect(mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "profile.avatar_uploaded",
          actorId: "test-user-id"
        })
      );
    });

    it("should successfully delete avatar when exists", async () => {
      const mockUserObj = {
        _id: "test-user-id",
        displayName: "Văn Huy",
        avatarUrl: "https://res.cloudinary.com/.../avatar.jpg",
        avatarPublicId: "todoapp/avatars/test-user-id/avatar",
        save: mockUserSave
      };
      
      mockUserFindById.mockResolvedValue(mockUserObj);
      mockUserSave.mockResolvedValue(mockUserObj);
      mockDeleteAvatar.mockResolvedValue({ result: "ok" });

      const { default: profileViewModel } = await import("../../to-do-list/backend/src/viewmodels/profileViewModel.js");
      const result = await profileViewModel.deleteAvatar("test-user-id");

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      
      // Ensure Cloudinary destroy was called
      expect(mockDeleteAvatar).toHaveBeenCalledWith("todoapp/avatars/test-user-id/avatar");
      
      // Ensure user document reset fields
      expect(mockUserObj.avatarUrl).toBeNull();
      expect(mockUserObj.avatarPublicId).toBeNull();
      expect(mockUserSave).toHaveBeenCalled();

      // Ensure audit log was created
      expect(mockAuditLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "profile.avatar_deleted",
          actorId: "test-user-id"
        })
      );
    });

    it("should throw error if attempting to delete non-existent avatar", async () => {
      const mockUserObj = {
        _id: "test-user-id",
        displayName: "Văn Huy",
        avatarUrl: null,
        avatarPublicId: null,
        save: mockUserSave
      };
      
      mockUserFindById.mockResolvedValue(mockUserObj);

      const { default: profileViewModel } = await import("../../to-do-list/backend/src/viewmodels/profileViewModel.js");
      
      await expect(profileViewModel.deleteAvatar("test-user-id")).rejects.toThrow(
        expect.objectContaining({ errorCode: "AVATAR_NOT_FOUND" })
      );
    });
  });
});
