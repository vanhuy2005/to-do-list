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

  /**
   * Send pending Task invitation email
   */
  async sendTaskInvitation(inviteeEmail, inviterUser, task, plainToken) {
    const inviterName = inviterUser.displayName || inviterUser.email;
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const acceptUrl = `${appUrl}/tasks/invitations/${plainToken}`;

    const subject = `[TaskDo] 📬 Lời mời cộng tác nhiệm vụ: "${task.title}"`;
    const htmlContent = `
      <div style="font-family: sans-serif; border: 3px solid #000000; box-shadow: 6px 6px 0px #000000; background-color: #FFFFFF; padding: 25px; max-width: 600px; margin: 20px auto;">
        <h2 style="font-size: 20px; font-weight: 900; text-transform: uppercase; color: #00c2ff; margin-bottom: 20px; border-bottom: 3px solid #000000; padding-bottom: 10px;">
          📬 LỜI MỜI CỘNG TÁC NHIỆM VỤ
        </h2>
        <p style="font-size: 15px; font-weight: 700; color: #333333; line-height: 1.6;">
          Chào bạn,<br/><br/>
          <strong>${inviterName}</strong> đã gửi cho bạn lời mời cùng thực hiện nhiệm vụ:
        </p>
        <div style="border: 2px solid #000000; padding: 15px; margin: 20px 0; background-color: #FFFDF0; box-shadow: 3px 3px 0px #000000;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800; color: #000000;">
            📌 ${task.title}
          </h3>
          ${task.description ? `<p style="margin: 0 0 10px 0; font-size: 14px; color: #555555;">${task.description}</p>` : ""}
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #777777;">
            Độ ưu tiên: <span style="text-transform: uppercase; color: #FF5A5F;">${task.priority}</span>
          </p>
        </div>
        <p style="font-size: 14px; font-weight: bold; color: #333333; margin-bottom: 20px;">
          Để xem chi tiết và tham gia cùng thực hiện nhiệm vụ này, vui lòng click nút bên dưới:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" style="display: inline-block; background-color: #FF5A5F; border: 3px solid #000000; color: #FFFFFF; font-size: 15px; font-weight: 900; text-decoration: none; padding: 12px 24px; box-shadow: 4px 4px 0px #000000; text-transform: uppercase; letter-spacing: 0.5px;">
            👉 CHẤP NHẬN LỜI MỜI 👈
          </a>
        </div>
        <p style="font-size: 11px; color: #777777; line-height: 1.5; border-top: 2px dashed #EEEEEE; pt: 15px; margin-top: 20px;">
          Nếu nút trên không hoạt động, copy link sau dán vào trình duyệt:<br/>
          <a href="${acceptUrl}" style="color: #00c2ff;">${acceptUrl}</a>
        </p>
      </div>
    `;

    const originalRecipient = inviteeEmail;
    const actualRecipient = this.getTargetRecipient(originalRecipient);
    const fromEmail = process.env.NODE_ENV === "production"
      ? (process.env.EMAIL_FROM || "Tasket <notifications@tasket.io.vn>")
      : (process.env.EMAIL_FROM || this.fromEmail || "onboarding@resend.dev");

    const mailOptions = {
      from: fromEmail.includes("<") ? fromEmail : `TaskDo <${fromEmail}>`,
      to: actualRecipient,
      subject,
      html: htmlContent
    };

    if (!process.env.RESEND_API_KEY) {
      console.log("[email] SKIP sending email invitation (RESEND_API_KEY missing):", {
        to: actualRecipient,
        from: mailOptions.from,
        templateType: "task_invitation",
        providerMessageId: null,
        status: "skipped",
      });
      return { skipped: true, emailSkippedReason: "MISSING_RESEND_API_KEY" };
    }

    try {
      const result = await this.resend.emails.send(mailOptions);
      if (result.error) {
        console.error("[email] Safe invitation log error:", {
          to: actualRecipient,
          from: mailOptions.from,
          templateType: "task_invitation",
          providerMessageId: null,
          status: "failed",
        });
        throw new Error(`Resend Error: ${result.error.message}`);
      }
      console.log("[email] Safe invitation log:", {
        to: actualRecipient,
        from: mailOptions.from,
        templateType: "task_invitation",
        providerMessageId: result.data?.id || null,
        status: "sent",
      });
      return result.data;
    } catch (err) {
      console.error("[email] Safe invitation log error:", {
        to: actualRecipient,
        from: mailOptions.from,
        templateType: "task_invitation",
        providerMessageId: null,
        status: "failed",
      });
      throw err;
    }
  }

  /**
   * Send pending Project invitation email
   */
  async sendProjectInvitation(inviteeEmail, inviterUser, project, plainToken) {
    const inviterName = inviterUser.displayName || inviterUser.email;
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const acceptUrl = `${appUrl}/projects/invitations/${plainToken}`;

    const subject = `[TaskDo] 🚀 Lời mời tham gia dự án: "${project.name}"`;
    const htmlContent = `
      <div style="font-family: sans-serif; border: 3px solid #000000; box-shadow: 6px 6px 0px #000000; background-color: #FFFFFF; padding: 25px; max-width: 600px; margin: 20px auto;">
        <h2 style="font-size: 20px; font-weight: 900; text-transform: uppercase; color: #34A853; margin-bottom: 20px; border-bottom: 3px solid #000000; padding-bottom: 10px;">
          🚀 LỜI MỜI THAM GIA DỰ ÁN
        </h2>
        <p style="font-size: 15px; font-weight: 700; color: #333333; line-height: 1.6;">
          Chào bạn,<br/><br/>
          <strong>${inviterName}</strong> đã gửi cho bạn lời mời tham gia dự án:
        </p>
        <div style="border: 2px solid #000000; padding: 15px; margin: 20px 0; background-color: #F0FFF4; box-shadow: 3px 3px 0px #000000;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 800; color: #000000;">
            📁 ${project.emoji || "📝"} ${project.name}
          </h3>
          ${project.description ? `<p style="margin: 0; font-size: 14px; color: #555555;">${project.description}</p>` : ""}
        </div>
        <p style="font-size: 14px; font-weight: bold; color: #333333; margin-bottom: 20px;">
          Để xem chi tiết và đồng ý tham gia dự án, vui lòng click nút bên dưới:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" style="display: inline-block; background-color: #34A853; border: 3px solid #000000; color: #FFFFFF; font-size: 15px; font-weight: 900; text-decoration: none; padding: 12px 24px; box-shadow: 4px 4px 0px #000000; text-transform: uppercase; letter-spacing: 0.5px;">
            👉 CHẤP NHẬN LỜI MỜI 👈
          </a>
        </div>
        <p style="font-size: 11px; color: #777777; line-height: 1.5; border-top: 2px dashed #EEEEEE; pt: 15px; margin-top: 20px;">
          Nếu nút trên không hoạt động, copy link sau dán vào trình duyệt:<br/>
          <a href="${acceptUrl}" style="color: #34A853;">${acceptUrl}</a>
        </p>
      </div>
    `;

    const originalRecipient = inviteeEmail;
    const actualRecipient = this.getTargetRecipient(originalRecipient);
    const fromEmail = process.env.NODE_ENV === "production"
      ? (process.env.EMAIL_FROM || "Tasket <notifications@tasket.io.vn>")
      : (process.env.EMAIL_FROM || this.fromEmail || "onboarding@resend.dev");

    const mailOptions = {
      from: fromEmail.includes("<") ? fromEmail : `TaskDo <${fromEmail}>`,
      to: actualRecipient,
      subject,
      html: htmlContent
    };

    if (!process.env.RESEND_API_KEY) {
      console.log("[email] SKIP sending email invitation (RESEND_API_KEY missing):", {
        to: actualRecipient,
        from: mailOptions.from,
        templateType: "project_invitation",
        providerMessageId: null,
        status: "skipped",
      });
      return { skipped: true, emailSkippedReason: "MISSING_RESEND_API_KEY" };
    }

    try {
      const result = await this.resend.emails.send(mailOptions);
      if (result.error) {
        console.error("[email] Safe invitation log error:", {
          to: actualRecipient,
          from: mailOptions.from,
          templateType: "project_invitation",
          providerMessageId: null,
          status: "failed",
        });
        throw new Error(`Resend Error: ${result.error.message}`);
      }
      console.log("[email] Safe invitation log:", {
        to: actualRecipient,
        from: mailOptions.from,
        templateType: "project_invitation",
        providerMessageId: result.data?.id || null,
        status: "sent",
      });
      return result.data;
    } catch (err) {
      console.error("[email] Safe invitation log error:", {
        to: actualRecipient,
        from: mailOptions.from,
        templateType: "project_invitation",
        providerMessageId: null,
        status: "failed",
      });
      throw err;
    }
  }
}

export default new EmailService();
