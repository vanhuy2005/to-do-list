import { jest } from "@jest/globals";

// Mock Resend SDK
const mockSendEmail = jest.fn();
jest.unstable_mockModule("resend", () => ({
  Resend: class {
    constructor() {
      this.emails = {
        send: mockSendEmail
      };
    }
  }
}));

// Mock DB connection & cron jobs for server import testing
jest.unstable_mockModule("../../to-do-list/backend/src/config/db.js", () => ({
  default: jest.fn().mockResolvedValue(true)
}));
jest.unstable_mockModule("../../to-do-list/backend/src/cron/cronJobs.js", () => ({
  default: jest.fn()
}));
jest.unstable_mockModule("../../to-do-list/backend/src/services/betterAuthService.js", () => ({
  getBetterAuth: jest.fn(() => ({
    api: {}
  })),
  toBetterAuthHeaders: jest.fn(),
  applyBetterAuthHeaders: jest.fn()
}));

const { validateProductionEnv } = await import("../../to-do-list/backend/src/config/env.js");
const { default: emailService } = await import("../../to-do-list/backend/src/services/emailService.js");

describe("Production Config & Email Delivery Validations", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ── 1. Production Startup Config Checks ──────────────────────────────────
  describe("Production Startup Strict Validation Checks", () => {
    it("should throw error if EMAIL_FROM is missing in production", () => {
      const mockEnv = {
        NODE_ENV: "production",
        MONGODB_CONNECTIONSTRING: "mongodb://localhost:27017/db",
        JWT_SECRET: "prod_access_secret",
        JWT_REFRESH_SECRET: "prod_refresh_secret",
        BETTER_AUTH_SECRET: "prod_better_auth_secret",
        RESEND_API_KEY: "re_test_key",
        EMAIL_DEV_REDIRECT_TO_ADMIN: "false"
      };

      expect(() => validateProductionEnv(mockEnv)).toThrow(
        "CRITICAL: RESEND_API_KEY or EMAIL_FROM is missing."
      );
    });

    it("should throw error if EMAIL_FROM contains onboarding@resend.dev in production", () => {
      const mockEnv = {
        NODE_ENV: "production",
        MONGODB_CONNECTIONSTRING: "mongodb://localhost:27017/db",
        JWT_SECRET: "prod_access_secret",
        JWT_REFRESH_SECRET: "prod_refresh_secret",
        BETTER_AUTH_SECRET: "prod_better_auth_secret",
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "onboarding@resend.dev",
        EMAIL_DEV_REDIRECT_TO_ADMIN: "false"
      };

      expect(() => validateProductionEnv(mockEnv)).toThrow(
        "CRITICAL: EMAIL_FROM contains 'onboarding@resend.dev' in production environment."
      );
    });

    it("should throw error if EMAIL_DEV_REDIRECT_TO_ADMIN is true in production", () => {
      const mockEnv = {
        NODE_ENV: "production",
        MONGODB_CONNECTIONSTRING: "mongodb://localhost:27017/db",
        JWT_SECRET: "prod_access_secret",
        JWT_REFRESH_SECRET: "prod_refresh_secret",
        BETTER_AUTH_SECRET: "prod_better_auth_secret",
        RESEND_API_KEY: "re_test_key",
        EMAIL_FROM: "Tasket <notifications@tasket.io.vn>",
        EMAIL_DEV_REDIRECT_TO_ADMIN: "true"
      };

      expect(() => validateProductionEnv(mockEnv)).toThrow(
        "CRITICAL: EMAIL_DEV_REDIRECT_TO_ADMIN cannot be enabled in production environment."
      );
    });
  });

  // ── 2. Production Recipient Routing Checks ────────────────────────────────
  describe("Email Recipient Routing Rules", () => {
    it("should route overdue email to user.email and use custom EMAIL_FROM", async () => {
      process.env.NODE_ENV = "production";
      process.env.EMAIL_FROM = "Tasket <notifications@tasket.io.vn>";
      process.env.EMAIL_DEV_REDIRECT_TO_ADMIN = "false";

      const user = {
        _id: "user-123",
        email: "user_test_recipient@gmail.com",
        preferredLanguage: "vi",
        notificationPreferences: { timezone: "Asia/Ho_Chi_Minh" }
      };

      const task = {
        _id: "task-456",
        title: "Submit web report",
        dueDate: new Date().toISOString()
      };

      mockSendEmail.mockResolvedValue({ data: { id: "resend-msg-123" } });

      const result = await emailService.sendOverdueNotification(user, task);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Tasket <notifications@tasket.io.vn>",
          to: "user_test_recipient@gmail.com",
          subject: expect.stringContaining("Submit web report")
        })
      );
      expect(result.id).toBe("resend-msg-123");
    });
  });

  // ── 3. Google OAuth User Email Delivery Checks ──────────────────────────
  describe("Google OAuth User Validation & Email Delivery", () => {
    it("should send overdue email to Google OAuth user without passwordHash if notification enabled", async () => {
      process.env.NODE_ENV = "production";
      process.env.EMAIL_FROM = "Tasket <notifications@tasket.io.vn>";
      process.env.EMAIL_DEV_REDIRECT_TO_ADMIN = "false";

      // Google OAuth User (no passwordHash, providers includes "google")
      const user = {
        _id: "google-user-789",
        email: "google_user@gmail.com",
        displayName: "Google User",
        providers: ["google"],
        preferredLanguage: "en",
        notificationPreferences: {
          emailOverdue: true,
          timezone: "Asia/Ho_Chi_Minh"
        }
      };

      const task = {
        _id: "task-789",
        title: "OAuth testing task",
        dueDate: new Date().toISOString()
      };

      mockSendEmail.mockResolvedValue({ data: { id: "oauth-email-msg-999" } });

      const result = await emailService.sendOverdueNotification(user, task);

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Tasket <notifications@tasket.io.vn>",
          to: "google_user@gmail.com",
          subject: expect.stringContaining("OAuth testing task")
        })
      );
      expect(result.id).toBe("oauth-email-msg-999");
    });
  });
});
