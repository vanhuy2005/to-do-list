import cron from "node-cron";
import Task from "../models/Task.js";
import AuditLog from "../models/AuditLog.js";
import taskViewModel from "../viewmodels/taskViewModel.js";

/**
 * Cron Job: Overdue Evaluator
 * Chạy mỗi 1 phút — quét task có dueDate đã qua và đánh dấu isOverdue
 */
const startOverdueEvaluator = () => {
  cron.schedule("* * * * *", async () => {
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

  console.log("[Cron] Overdue evaluator đã khởi chạy (mỗi 1 phút)");
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
  startExpiredTaskPurge();
  console.log("[Cron] Tất cả cron jobs đã sẵn sàng ✓");
};

export default initCronJobs;
