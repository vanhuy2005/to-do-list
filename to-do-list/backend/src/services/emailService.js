import { Resend } from "resend";
import crypto from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { getOverdueNotificationTemplate } from "./emailTemplates/overdueNotification.js";
import { getOverdueDigestTemplate } from "./emailTemplates/overdueDigest.js";

dayjs.extend(utc);
dayjs.extend(timezone);

class EmailService {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY || "re_dummy_key_for_testing";
    if (!process.env.RESEND_API_KEY) {
      console.warn("WARNING: RESEND_API_KEY environment variable is not defined.");
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
  }

  /**
   * Generates a secure, state-free HMAC token for timing-safe unsubscribe URLs
   * @param {string} userId - User ID to sign
   * @returns {string} HMAC signature hex
   */
  generateUnsubscribeToken(userId) {
    if (!userId) return "";
    const secret = process.env.JWT_SECRET || "fallback_task_do_secret";
    return crypto.createHmac("sha256", secret).update(userId.toString()).digest("hex");
  }

  /**
   * Verifies an unsubscribe token in a timing-safe manner
   * @param {string} userId - User ID
   * @param {string} token - HMAC signature to verify
   * @returns {boolean} True if the signature matches, false otherwise
   */
  verifyUnsubscribeToken(userId, token) {
    if (!userId || !token) return false;
    const calculated = this.generateUnsubscribeToken(userId);
    try {
      const tokenBuffer = Buffer.from(token, "hex");
      const calculatedBuffer = Buffer.from(calculated, "hex");
      if (tokenBuffer.length !== calculatedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(tokenBuffer, calculatedBuffer);
    } catch (e) {
      return false;
    }
  }

  /**
   * Formats a date string in the user's preferred language and timezone
   * @param {Date|string} date - The date to format
   * @param {string} tz - IANA timezone (e.g. 'Asia/Ho_Chi_Minh')
   * @param {string} lang - Preferred language ('vi' or 'en')
   * @returns {string} Formatted local date string
   */
  formatLocalDate(date, tz, lang) {
    if (!date) return "";
    const zone = tz || "Asia/Ho_Chi_Minh";
    const formatStr = lang === "vi" ? "DD/MM/YYYY HH:mm" : "YYYY-MM-DD hh:mm A";
    try {
      return dayjs(date).tz(zone).format(formatStr);
    } catch (e) {
      // Fallback in case of incorrect timezone strings
      return dayjs(date).tz("Asia/Ho_Chi_Minh").format(formatStr);
    }
  }

  /**
   * Helper to resolve target recipient based on DEV redirect configuration.
   */
  getTargetRecipient(email) {
    const isDevRedirect = process.env.EMAIL_DEV_REDIRECT_TO_ADMIN === "true" || process.env.EMAIL_DEV_REDIRECT_TO_ADMIN === true;
    if (isDevRedirect && process.env.NODE_ENV !== "production") {
      const adminEmail = process.env.ADMIN_EMAIL || "nguyen.van.quang.huy.2105@gmail.com";
      console.log(`[email] DEV redirect enabled, original recipient = ${email}, actual recipient = ${adminEmail}`);
      return adminEmail;
    }
    return email;
  }

  /**
   * Send single task overdue alert
   * @param {object} user - User document
   * @param {object} task - Task document
   * @returns {Promise<object>} Resend response
   */
  async sendOverdueNotification(user, task) {
    const lang = user.preferredLanguage || "vi";
    const tz = user.notificationPreferences?.timezone || "Asia/Ho_Chi_Minh";
    
    const formattedDueDate = this.formatLocalDate(task.dueDate, tz, lang);
    const token = this.generateUnsubscribeToken(user._id || user.id);
    
    const htmlContent = getOverdueNotificationTemplate(user, task, formattedDueDate, token);
    const subject = lang === "vi" 
      ? `[Task.Do] ⚠️ Công việc quá hạn: ${task.title}` 
      : `[Task.Do] ⚠️ Overdue task: ${task.title}`;

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const unsubUrl = `${appUrl}/unsubscribe?userId=${user._id || user.id}&token=${token}`;

    const originalRecipient = user.email;
    const actualRecipient = this.getTargetRecipient(originalRecipient);
    const fromEmail = process.env.EMAIL_FROM || this.fromEmail || "onboarding@resend.dev";

    const mailOptions = {
      from: fromEmail.includes("<") ? fromEmail : `TaskDo <${fromEmail}>`,
      to: actualRecipient,
      subject,
      html: htmlContent,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      }
    };

    try {
      const result = await this.resend.emails.send(mailOptions);
      if (result.error) {
        const errMsg = result.error.message || "";
        if (
          result.error.name === "validation_error" || 
          errMsg.includes("testing emails") || 
          errMsg.includes("own email address")
        ) {
          console.error(`
[Resend Error] Không thể gửi email tới ${actualRecipient} do tài khoản ở chế độ thử nghiệm (Sandbox/Unverified Domain).
👉 Hướng dẫn khắc phục:
1. Truy cập Resend Dashboard và verify domain gửi thư tasket.io.vn của bạn.
2. Cấu hình biến môi trường EMAIL_FROM bằng domain đã được verify (ví dụ: Tasket <notifications@tasket.io.vn>).
3. Không sử dụng email mặc định 'onboarding@resend.dev' cho môi trường production.
          `);
        }
        console.error("[email] resend error details", {
          originalRecipient,
          actualRecipient,
          from: mailOptions.from,
          providerMessageId: null,
          error: result.error,
        });
        throw new Error(`Resend Error: ${result.error.message} (${result.error.name})`);
      }
      console.log("[email] resend success log", {
        originalRecipient,
        actualRecipient,
        from: mailOptions.from,
        providerMessageId: result.data?.id,
        error: null,
      });
      return result.data;
    } catch (err) {
      console.error("[email] resend error details", {
        originalRecipient,
        actualRecipient,
        from: mailOptions.from,
        providerMessageId: null,
        error: { message: err.message, name: err.name, stack: err.stack },
      });
      throw err;
    }
  }

  /**
   * Send daily digest summarizing multiple overdue tasks
   * @param {object} user - User document
   * @param {Array<object>} tasks - Array of task documents
   * @returns {Promise<object>} Resend response
   */
  async sendOverdueDigest(user, tasks) {
    const lang = user.preferredLanguage || "vi";
    const tz = user.notificationPreferences?.timezone || "Asia/Ho_Chi_Minh";
    
    // Enrich tasks with pre-formatted localized due dates
    const tasksWithFormattedDates = tasks.map(task => ({
      ...task.toObject?.() || task,
      formattedDueDate: this.formatLocalDate(task.dueDate, tz, lang)
    }));

    const token = this.generateUnsubscribeToken(user._id || user.id);
    const htmlContent = getOverdueDigestTemplate(user, tasksWithFormattedDates, token);
    const subject = lang === "vi"
      ? `[Task.Do] 🗓️ Báo cáo công việc quá hạn hàng ngày`
      : `[Task.Do] 🗓️ Daily Overdue Tasks Digest`;

    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const unsubUrl = `${appUrl}/unsubscribe?userId=${user._id || user.id}&token=${token}`;

    const originalRecipient = user.email;
    const actualRecipient = this.getTargetRecipient(originalRecipient);
    const fromEmail = process.env.EMAIL_FROM || this.fromEmail || "onboarding@resend.dev";

    const mailOptions = {
      from: fromEmail.includes("<") ? fromEmail : `TaskDo <${fromEmail}>`,
      to: actualRecipient,
      subject,
      html: htmlContent,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      }
    };

    try {
      const result = await this.resend.emails.send(mailOptions);
      if (result.error) {
        const errMsg = result.error.message || "";
        if (
          result.error.name === "validation_error" || 
          errMsg.includes("testing emails") || 
          errMsg.includes("own email address")
        ) {
          console.error(`
[Resend Error] Không thể gửi email tới ${actualRecipient} do tài khoản ở chế độ thử nghiệm (Sandbox/Unverified Domain).
👉 Hướng dẫn khắc phục:
1. Truy cập Resend Dashboard và verify domain gửi thư tasket.io.vn của bạn.
2. Cấu hình biến môi trường EMAIL_FROM bằng domain đã được verify (ví dụ: Tasket <notifications@tasket.io.vn>).
3. Không sử dụng email mặc định 'onboarding@resend.dev' cho môi trường production.
          `);
        }
        console.error("[email] resend error details", {
          originalRecipient,
          actualRecipient,
          from: mailOptions.from,
          providerMessageId: null,
          error: result.error,
        });
        throw new Error(`Resend Error: ${result.error.message} (${result.error.name})`);
      }
      console.log("[email] resend success log", {
        originalRecipient,
        actualRecipient,
        from: mailOptions.from,
        providerMessageId: result.data?.id,
        error: null,
      });
      return result.data;
    } catch (err) {
      console.error("[email] resend error details", {
        originalRecipient,
        actualRecipient,
        from: mailOptions.from,
        providerMessageId: null,
        error: { message: err.message, name: err.name, stack: err.stack },
      });
      throw err;
    }
  }
}

export default new EmailService();
