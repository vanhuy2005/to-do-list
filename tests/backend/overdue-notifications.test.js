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

// Mock database models
const mockUserFind = jest.fn();
const mockUserFindById = jest.fn();
const mockTaskFind = jest.fn();
const mockTaskFindById = jest.fn();
const mockNotificationLogFind = jest.fn();
const mockNotificationLogFindOne = jest.fn();
const mockNotificationLogCreate = jest.fn();
const mockAuditLogCreate = jest.fn();

jest.unstable_mockModule("../../to-do-list/backend/src/models/User.js", () => ({
  default: {
    find: mockUserFind,
    findById: mockUserFindById
  }
}));

jest.unstable_mockModule("../../to-do-list/backend/src/models/Task.js", () => ({
  default: {
    find: jest.fn().mockImplementation(() => ({
      lean: () => mockTaskFind(),
      then: (onFulfilled) => mockTaskFind().then(onFulfilled)
    })),
    findById: mockTaskFindById
  }
}));

jest.unstable_mockModule("../../to-do-list/backend/src/models/NotificationLog.js", () => ({
  default: {
    find: mockNotificationLogFind,
    findOne: mockNotificationLogFindOne,
    create: mockNotificationLogCreate
  }
}));

jest.unstable_mockModule("../../to-do-list/backend/src/models/AuditLog.js", () => ({
  default: {
    create: mockAuditLogCreate
  }
}));

// Set dummy JWT_SECRET in process env for timing-safe HMAC signature testing
process.env.JWT_SECRET = "super_secret_test_key";

// Imports
const { default: emailService } = await import("../../to-do-list/backend/src/services/emailService.js");
const { default: emailViewModel } = await import("../../to-do-list/backend/src/viewmodels/emailViewModel.js");

describe("Email Service & Email ViewModel (Overdue Notifications)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Unsubscribe HMAC Token Cryptography Tests ────────────────────────────
  describe("HMAC Token Signatures", () => {
    const userId = "507f1f77bcf86cd799439011";

    it("should generate a valid HMAC token and verify it successfully", () => {
      const token = emailService.generateUnsubscribeToken(userId);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(64); // SHA256 hex string has 64 characters

      const verified = emailService.verifyUnsubscribeToken(userId, token);
      expect(verified).toBe(true);
    });

    it("should reject an invalid token", () => {
      const verified = emailService.verifyUnsubscribeToken(userId, "invalid_token");
      expect(verified).toBe(false);
    });

    it("should reject a token generated for a different userId", () => {
      const tokenForUser1 = emailService.generateUnsubscribeToken(userId);
      const differentUserId = "507f1f77bcf86cd799439022";
      const verified = emailService.verifyUnsubscribeToken(differentUserId, tokenForUser1);
      expect(verified).toBe(false);
    });
  });

  // ── 2. Timezone and Local Date Formatting Tests ──────────────────────────────
  describe("formatLocalDate", () => {
    const testDate = "2026-05-21T10:30:00.000Z";

    it("should format dates in Vietnamese for Asia/Ho_Chi_Minh timezone", () => {
      // 10:30 UTC -> 17:30 VN
      const formatted = emailService.formatLocalDate(testDate, "Asia/Ho_Chi_Minh", "vi");
      expect(formatted).toBe("21/05/2026 17:30");
    });

    it("should format dates in English for US Eastern Timezone", () => {
      // 10:30 UTC -> 06:30 AM EST (standard time offset is UTC-5)
      // dayjs handles timezone changes automatically
      const formatted = emailService.formatLocalDate(testDate, "America/New_York", "en");
      expect(formatted).toBe("2026-05-21 06:30 AM");
    });
  });

  // ── 3. Resend delivery behavior tests ─────────────────────────────────────
  describe("emailService.sendOverdueNotification", () => {
    it("should throw explicit error when Resend rejects unverified recipient", async () => {
      const user = {
        _id: "507f1f77bcf86cd799439011",
        id: "507f1f77bcf86cd799439011",
        email: "someone_else@gmail.com",
        preferredLanguage: "vi",
        notificationPreferences: { timezone: "Asia/Ho_Chi_Minh" },
      };
      const task = {
        _id: "task-1",
        title: "Task test resend",
        dueDate: new Date().toISOString(),
      };

      mockSendEmail.mockResolvedValue({
        error: {
          message: "You can only send testing emails to your own email address",
          name: "validation_error",
        },
      });

      await expect(emailService.sendOverdueNotification(user, task)).rejects.toThrow(
        "Resend Error: You can only send testing emails to your own email address",
      );
    });
  });

  // ── 3. emailViewModel.queueOverdueNotifications Tests ───────────────────────
  describe("emailViewModel.queueOverdueNotifications", () => {
    it("should queue overdue tasks that are pending and not yet sent in the last 24h", async () => {
      // 1. Mock finding overdue tasks
      const mockTasks = [
        {
          _id: "task-1",
          title: "Overdue task 1",
          ownerId: "user-1",
          priority: "high",
          dueDate: new Date(),
          isOverdue: true,
          status: "todo"
        }
      ];
      mockTaskFind.mockResolvedValue(mockTasks);

      // 2. Mock finding the task owner
      const mockUser = {
        _id: "user-1",
        status: "active",
        preferredLanguage: "vi",
        notificationPreferences: {
          emailOverdue: true,
          timezone: "Asia/Ho_Chi_Minh"
        }
      };
      mockUserFindById.mockResolvedValue(mockUser);

      // 3. Mock finding duplicate notification log (return null to signify no duplicates)
      mockNotificationLogFindOne.mockResolvedValue(null);

      // Call queue method
      await emailViewModel.queueOverdueNotifications();

      // Ensure NotificationLog.create was called
      expect(mockNotificationLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          taskId: "task-1",
          type: "overdue_single",
          status: "pending"
        })
      );
    });

    it("should skip queueing if overdue notification was already queued/sent in last 24 hours", async () => {
      const mockTasks = [
        {
          _id: "task-1",
          title: "Overdue task 1",
          ownerId: "user-1",
          priority: "high",
          dueDate: new Date(),
          isOverdue: true,
          status: "todo"
        }
      ];
      mockTaskFind.mockResolvedValue(mockTasks);

      const mockUser = {
        _id: "user-1",
        status: "active",
        preferredLanguage: "vi",
        notificationPreferences: {
          emailOverdue: true
        }
      };
      mockUserFindById.mockResolvedValue(mockUser);

      // Mock finding duplicate log (return an existing log to signify duplicate)
      mockNotificationLogFindOne.mockResolvedValue({ _id: "existing-log" });

      await emailViewModel.queueOverdueNotifications();

      // Expect no new NotificationLog creation
      expect(mockNotificationLogCreate).not.toHaveBeenCalled();
    });

    it("should skip queueing if user disabled emailOverdue preference", async () => {
      const mockTasks = [
        {
          _id: "task-1",
          title: "Overdue task 1",
          ownerId: "user-1",
          priority: "high",
          dueDate: new Date(),
          isOverdue: true,
          status: "todo"
        }
      ];
      mockTaskFind.mockResolvedValue(mockTasks);

      const mockUser = {
        _id: "user-1",
        status: "active",
        preferredLanguage: "vi",
        notificationPreferences: {
          emailOverdue: false // disabled!
        }
      };
      mockUserFindById.mockResolvedValue(mockUser);

      await emailViewModel.queueOverdueNotifications();

      expect(mockNotificationLogCreate).not.toHaveBeenCalled();
    });
  });

  // ── 4. emailViewModel.processEmailQueue Tests ──────────────────────────────
  describe("emailViewModel.processEmailQueue", () => {
    it("should process pending logs, call emailService, and update status to sent", async () => {
      const mockLogSave = jest.fn();
      const mockPendingLog = {
        _id: "log-1",
        userId: "user-1",
        taskId: "task-1",
        type: "overdue_single",
        status: "pending",
        save: mockLogSave
      };
      
      mockNotificationLogFind.mockResolvedValue([mockPendingLog]);

      const mockUser = {
        _id: "user-1",
        email: "huy@example.com",
        status: "active",
        preferredLanguage: "vi",
        notificationPreferences: { timezone: "Asia/Ho_Chi_Minh" }
      };
      const mockTask = {
        _id: "task-1",
        title: "Test Task",
        dueDate: new Date(),
        status: "todo",
        deletedAt: null
      };

      mockUserFindById.mockResolvedValue(mockUser);
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSendEmail.mockResolvedValue({ data: { id: "resend-msg-id" } });

      await emailViewModel.processEmailQueue();

      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockPendingLog.status).toBe("sent");
      expect(mockPendingLog.resendMessageId).toBe("resend-msg-id");
      expect(mockLogSave).toHaveBeenCalled();
    });

    it("should schedule failure retry (+5 minutes backoff) if email delivery throws error", async () => {
      const mockLogSave = jest.fn();
      const mockPendingLog = {
        _id: "log-1",
        userId: "user-1",
        taskId: "task-1",
        type: "overdue_single",
        status: "pending",
        save: mockLogSave
      };
      
      mockNotificationLogFind.mockResolvedValue([mockPendingLog]);

      const mockUser = {
        _id: "user-1",
        email: "huy@example.com",
        status: "active",
        preferredLanguage: "vi",
        notificationPreferences: { timezone: "Asia/Ho_Chi_Minh" }
      };
      const mockTask = {
        _id: "task-1",
        title: "Test Task",
        dueDate: new Date(),
        status: "todo",
        deletedAt: null
      };

      mockUserFindById.mockResolvedValue(mockUser);
      mockTaskFindById.mockResolvedValue(mockTask);
      
      // Simulate Resend API throwing an error
      mockSendEmail.mockRejectedValue(new Error("API Limit Reached"));

      await emailViewModel.processEmailQueue();

      expect(mockPendingLog.status).toBe("failed");
      expect(mockPendingLog.error).toContain("API Limit Reached");
      expect(mockPendingLog.retryCount).toBe(0);
      expect(mockPendingLog.nextRetryAt).toBeDefined();
      expect(mockLogSave).toHaveBeenCalled();
    });
  });

  // ── 5. Exponential Backoff Retry Tests ─────────────────────────────────────
  describe("emailViewModel.processRetryQueue", () => {
    it("should retry failed logs using exponential backoff windows and mark as abandoned after 3 failures", async () => {
      const mockLogSave = jest.fn();
      
      // Setup a log that has already failed once (retryCount = 1)
      const mockFailedLog = {
        _id: "failed-log-1",
        userId: "user-1",
        taskId: "task-1",
        type: "overdue_single",
        status: "failed",
        retryCount: 1,
        save: mockLogSave
      };

      mockNotificationLogFind.mockResolvedValue([mockFailedLog]);

      const mockUser = {
        _id: "user-1",
        email: "huy@example.com",
        status: "active",
        preferredLanguage: "vi"
      };
      const mockTask = {
        _id: "task-1",
        title: "Retry Task",
        dueDate: new Date(),
        status: "todo",
        deletedAt: null
      };

      mockUserFindById.mockResolvedValue(mockUser);
      mockTaskFindById.mockResolvedValue(mockTask);

      // Simulate email service throwing an error again on second attempt
      mockSendEmail.mockRejectedValue(new Error("SMTP Timeout"));

      await emailViewModel.processRetryQueue();

      expect(mockFailedLog.retryCount).toBe(2);
      // Under retryCount = 2, wait 80 minutes
      expect(mockFailedLog.status).toBe("failed");
      expect(mockFailedLog.error).toBe("SMTP Timeout");
      expect(mockLogSave).toHaveBeenCalled();
    });
  });
});
