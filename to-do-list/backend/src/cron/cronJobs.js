import cron from "node-cron";
import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import taskViewModel from "../viewmodels/taskViewModel.js";
import emailViewModel from "../viewmodels/emailViewModel.js";

/**
 * Cron Job: Overdue Evaluator
 * Chạy mỗi 1 phút — quét task có dueDate đã qua và đánh dấu isOverdue
 */
const startOverdueEvaluator = () => {
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const now = new Date();

      const overdueTasks = await Task.find({
        dueDate: { $ne: null, $lt: now },
        isOverdue: { $ne: true },
        status: { $ne: "done" },
        deletedAt: null,
      }).lean();

      if (overdueTasks.length === 0) {
        return;
      }

      const taskIds = overdueTasks.map((t) => t._id);

      await Task.updateMany(
        { _id: { $in: taskIds } },
        { $set: { isOverdue: true, overdueAt: now } },
      );

      // Batch audit log với insertMany
      const auditDocs = overdueTasks.map((task) => ({
        actorId: task.ownerId,
        targetId: task.ownerId,
        action: "task.overdue",
        entityType: "task",
        entityId: task._id,
        summaryBefore: { isOverdue: false, title: task.title },
        summaryAfter: { isOverdue: true, overdueAt: now, title: task.title },
      }));

      await AuditLog.insertMany(auditDocs).catch((err) => {
        console.warn("Cron: Không thể ghi audit log overdue:", err.message);
      });

      console.log(
        `[Cron] Đánh dấu overdue: ${overdueTasks.length} task(s) lúc ${now.toISOString()}`,
      );
    } catch (error) {
      console.error("[Cron] Overdue evaluator lỗi:", error.message);
    }
  });

  console.log("[Cron] Overdue evaluator đã khởi chạy (mỗi 30 giây)");
};

/**
 * Cron Job: Overdue Email Sender
 * Chạy mỗi 30 giây — Quét các task quá hạn và xử lý gửi email pending
 */
const startOverdueEmailSender = () => {
  cron.schedule("*/30 * * * * *", async () => {
    try {
      await emailViewModel.queueOverdueNotifications();
      await emailViewModel.processEmailQueue();
    } catch (error) {
      console.error("[Cron] Overdue Email Sender lỗi:", error.message);
    }
  });

  console.log("[Cron] Overdue email sender đã khởi chạy (mỗi 30 giây)");
};

/**
 * Cron Job: Daily Overdue Digest
 * Chạy hàng giờ (phút thứ 0) — Gom công việc quá hạn gửi Daily Digest cho người dùng đúng múi giờ
 */
const startDailyDigestCron = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      await emailViewModel.sendDailyDigests();
    } catch (error) {
      console.error("[Cron] Daily Digest Cron lỗi:", error.message);
    }
  });

  console.log("[Cron] Daily Digest scheduler đã khởi chạy (hàng giờ)");
};

/**
 * Cron Job: Email Retry Queue
 * Chạy mỗi 30 phút — Tự động thử lại gửi email bị lỗi với Exponential Backoff
 */
const startEmailRetryCron = () => {
  cron.schedule("*/30 * * * *", async () => {
    try {
      await emailViewModel.processRetryQueue();
    } catch (error) {
      console.error("[Cron] Email Retry Cron lỗi:", error.message);
    }
  });

  console.log("[Cron] Email retry queue scheduler đã khởi chạy (mỗi 30 phút)");
};

/**
 * Cron Job: Purge Expired Deleted Tasks
 * Chạy lúc 3h sáng mỗi ngày — dọn task đã hết hạn khôi phục
 */
const startExpiredTaskPurge = () => {
  cron.schedule("0 3 * * *", async () => {
    try {
      const result = await taskViewModel.purgeExpiredDeletedTasks();
      console.log(`[Cron] ${result.message}`);
    } catch (error) {
      console.error("[Cron] Purge expired tasks lỗi:", error.message);
    }
  });

  console.log("[Cron] Expired task purge đã khởi chạy (3AM hàng ngày)");
};

/**
 * Khởi tạo tất cả cron jobs
 */
const initCronJobs = () => {
  startOverdueEvaluator();
  startOverdueEmailSender();
  startDailyDigestCron();
  startEmailRetryCron();
  startExpiredTaskPurge();
  console.log("[Cron] Tất cả cron jobs đã sẵn sàng ✓");
};

export default initCronJobs;

