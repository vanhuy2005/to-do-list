import mongoose from "mongoose";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import NotificationLog from "../models/NotificationLog.js";
import AuditLog from "../models/AuditLog.js";
import emailService from "../services/emailService.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

class EmailViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "EmailViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const emailViewModel = {
  /**
   * Scans overdue tasks and queues single email notification logs
   */
  async queueOverdueNotifications() {
    console.log("[Cron] Quét công việc quá hạn để xếp hàng thông báo...");
    const now = new Date();
    
    // Find all tasks that are overdue, not done, and not deleted
    const overdueTasks = await Task.find({
      isOverdue: true,
      status: { $ne: "done" },
      deletedAt: null,
    }).lean();

    if (overdueTasks.length === 0) {
      console.log("[Cron] Không có công việc quá hạn nào cần xử lý.");
      return;
    }

    let queuedCount = 0;

    for (const task of overdueTasks) {
      const recipientIds = new Set();
      if (task.ownerId) {
        recipientIds.add(task.ownerId.toString());
      }
      if (task.shares && task.shares.length > 0) {
        for (const share of task.shares) {
          if (share.userId) {
            recipientIds.add(share.userId.toString());
          }
        }
      }
      if (task.projectId) {
        const project = await Project.findOne({ _id: task.projectId, deletedAt: null }).lean();
        if (project) {
          if (project.ownerId) {
            recipientIds.add(project.ownerId.toString());
          }
          if (project.members && project.members.length > 0) {
            for (const member of project.members) {
              if (member.userId) {
                recipientIds.add(member.userId.toString());
              }
            }
          }
        }
      }

      for (const userIdStr of recipientIds) {
        const userId = new mongoose.Types.ObjectId(userIdStr);
        // Find user and verify notification preferences
        const user = await User.findById(userId);
        if (!user || user.status !== "active") continue;

        const prefs = user.notificationPreferences || {
          emailOverdue: true,
          emailDigest: true,
          digestHour: 8,
          timezone: "Asia/Ho_Chi_Minh",
          unsubscribedAt: null,
        };

        // Skip if user has disabled single overdue email notifications
        if (prefs.emailOverdue === false) continue;

        // Deduplication: Check if an overdue notification was already queued/sent in the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingLog = await NotificationLog.findOne({
          userId,
          taskId: task._id,
          type: "overdue_single",
          createdAt: { $gte: twentyFourHoursAgo }
        });

        if (existingLog) continue;

        // Create pending NotificationLog atomically
        await NotificationLog.create({
          userId,
          taskId: task._id,
          type: "overdue_single",
          status: "pending",
          taskSnapshot: {
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate,
          }
        });

        queuedCount++;
      }
    }

    console.log(`[Cron] Đã xếp hàng ${queuedCount} thông báo quá hạn ở trạng thái pending.`);
  },

  /**
   * Processes all pending email notification logs in the queue
   */
  async processEmailQueue() {
    console.log("[Cron] Xử lý hàng đợi email ở trạng thái pending...");
    
    // Find all pending single overdue notifications
    const pendingLogs = await NotificationLog.find({
      status: "pending",
      type: "overdue_single",
    });

    if (pendingLogs.length === 0) {
      console.log("[Cron] Không có email pending nào cần gửi.");
      return;
    }

    for (const log of pendingLogs) {
      try {
        const user = await User.findById(log.userId);
        const task = await Task.findById(log.taskId);

        // If user or task no longer exists, or if task was completed/deleted, abandon the log
        if (!user || user.status !== "active" || !task || task.status === "done" || task.deletedAt !== null) {
          log.status = "abandoned";
          log.error = "User or Task no longer valid, or task completed/deleted";
          await log.save();
          continue;
        }

        // Send email
        const resendData = await emailService.sendOverdueNotification(user, task);
        
        log.status = "sent";
        log.resendMessageId = resendData.id;
        log.error = null;
        await log.save();
        
      } catch (error) {
        console.error(`[Cron] Lỗi gửi email cho log ${log._id}:`, error.message);
        
        // Mark as failed and schedule first retry in 5 minutes
        log.status = "failed";
        log.error = error.message.substring(0, 500);
        log.retryCount = 0; // Haven't retried yet, 0 retries
        log.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes backoff
        await log.save();
      }
    }
    
    console.log(`[Cron] Đã xử lý hàng đợi gửi email hoàn tất.`);
  },

  /**
   * Evaluates and sends timezone-aware Daily Digests of overdue tasks to users
   */
  async sendDailyDigests() {
    console.log("[Cron] Đang quét và gửi Báo cáo Daily Digest quá hạn...");
    const now = dayjs().utc();
    
    // Fetch all active users who opted into the daily digest
    const activeUsers = await User.find({
      status: "active",
      "notificationPreferences.emailDigest": true,
    });

    let digestSentCount = 0;

    for (const user of activeUsers) {
      const prefs = user.notificationPreferences || {
        emailDigest: true,
        digestHour: 8,
        timezone: "Asia/Ho_Chi_Minh",
        unsubscribedAt: null,
      };

      const userTz = prefs.timezone || "Asia/Ho_Chi_Minh";
      const digestHour = prefs.digestHour !== undefined ? prefs.digestHour : 8;

      // Calculate the user's current local time
      const userLocalTime = dayjs().tz(userTz);
      const currentHour = userLocalTime.hour();

      // Skip if the user's current hour does not match their configured digestHour
      if (currentHour !== digestHour) continue;

      // Deduplication: Verify that no digest was already sent on the same localized calendar day
      const startOfLocalDay = userLocalTime.startOf("day").utc().toDate();
      const endOfLocalDay = userLocalTime.endOf("day").utc().toDate();

      const existingDigest = await NotificationLog.findOne({
        userId: user._id,
        type: "overdue_digest",
        createdAt: { $gte: startOfLocalDay, $lte: endOfLocalDay }
      });

      if (existingDigest) continue; // Already sent today!

      // Query all overdue tasks for this user
      const overdueTasks = await Task.find({
        ownerId: user._id,
        isOverdue: true,
        status: { $ne: "done" },
        deletedAt: null,
      });

      // Skip if the user has no overdue tasks
      if (overdueTasks.length === 0) continue;

      // Create a notification log for the digest
      const log = await NotificationLog.create({
        userId: user._id,
        type: "overdue_digest",
        status: "pending",
      });

      try {
        const resendData = await emailService.sendOverdueDigest(user, overdueTasks);
        
        log.status = "sent";
        log.resendMessageId = resendData.id;
        log.error = null;
        await log.save();

        // Audit Log success
        await AuditLog.create({
          actorId: user._id,
          action: "profile.digest_email_sent",
          entityType: "user",
          entityId: user._id,
          summaryBefore: null,
          summaryAfter: { taskCount: overdueTasks.length, messageId: resendData.id },
        });

        digestSentCount++;
      } catch (error) {
        console.error(`[Cron] Lỗi gửi Daily Digest cho user ${user._id}:`, error.message);
        
        log.status = "failed";
        log.error = error.message.substring(0, 500);
        log.retryCount = 0;
        log.nextRetryAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes backoff
        await log.save();
      }
    }

    console.log(`[Cron] Đã hoàn tất gửi ${digestSentCount} Daily Digest email.`);
  },

  /**
   * Scans failed notification logs and performs retries with exponential backoff
   */
  async processRetryQueue() {
    console.log("[Cron] Quét hàng đợi thử lại email (Exponential Backoff)...");
    const now = new Date();

    const failedLogs = await NotificationLog.find({
      status: "failed",
      retryCount: { $lt: 3 },
      nextRetryAt: { $ne: null, $lte: now }
    });

    if (failedLogs.length === 0) {
      console.log("[Cron] Không có email thất bại nào cần thử lại.");
      return;
    }

    for (const log of failedLogs) {
      try {
        const user = await User.findById(log.userId);
        if (!user || user.status !== "active") {
          log.status = "abandoned";
          log.error = "User no longer valid or active";
          await log.save();
          continue;
        }

        if (log.type === "overdue_single") {
          const task = await Task.findById(log.taskId);
          if (!task || task.status === "done" || task.deletedAt !== null) {
            log.status = "abandoned";
            log.error = "Task no longer valid, done, or deleted";
            await log.save();
            continue;
          }

          const resendData = await emailService.sendOverdueNotification(user, task);
          
          log.status = "sent";
          log.resendMessageId = resendData.id;
          log.error = null;
          await log.save();

        } else if (log.type === "overdue_digest") {
          const overdueTasks = await Task.find({
            ownerId: user._id,
            isOverdue: true,
            status: { $ne: "done" },
            deletedAt: null,
          });

          if (overdueTasks.length === 0) {
            log.status = "abandoned";
            log.error = "No overdue tasks left for digest retry";
            await log.save();
            continue;
          }

          const resendData = await emailService.sendOverdueDigest(user, overdueTasks);
          
          log.status = "sent";
          log.resendMessageId = resendData.id;
          log.error = null;
          await log.save();
        }

        console.log(`[Cron] Thử lại thành công cho log ${log._id}`);
      } catch (error) {
        log.retryCount += 1;
        log.error = error.message.substring(0, 500);

        if (log.retryCount >= 3) {
          log.status = "abandoned";
          log.nextRetryAt = null;
          console.warn(`[Cron] Đã từ bỏ gửi email cho log ${log._id} sau 3 lần thử lại.`);
        } else {
          // Exponential backoff timing configuration:
          // Attempt 1 (retryCount = 1): wait 20 minutes
          // Attempt 2 (retryCount = 2): wait 80 minutes
          const backoffMinutes = log.retryCount === 1 ? 20 : 80;
          log.nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
          console.log(`[Cron] Thử lại lần ${log.retryCount} thất bại cho log ${log._id}. Tiếp tục xếp lịch sau +${backoffMinutes} phút.`);
        }
        await log.save();
      }
    }

    console.log("[Cron] Xử lý hàng đợi thử lại hoàn tất.");
  }
};

export default emailViewModel;
