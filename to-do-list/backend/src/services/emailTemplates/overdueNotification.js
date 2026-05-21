import { getHeader } from "./components/header.js";
import { getFooter } from "./components/footer.js";
import { escapeHtml } from "./components/escapeHtml.js";

/**
 * Renders the HTML template for a single overdue task notification
 * @param {object} user - User document/object
 * @param {object} task - Task snapshot or task document
 * @param {string} formattedDueDate - Already formatted due date string in user's local timezone
 * @param {string} unsubscribeToken - HMAC token for email footer unsubscribe
 * @returns {string} Fully compiled HTML email body
 */
export const getOverdueNotificationTemplate = (user, task, formattedDueDate, unsubscribeToken) => {
  const lang = user.preferredLanguage || "vi";
  
  const title = lang === "vi" ? "Công việc của bạn đã quá hạn!" : "Your task is overdue!";
  
  const text = lang === "vi" ? {
    greeting: `Chào ${escapeHtml(user.displayName)},`,
    intro: "Một trong các công việc quan trọng của bạn đã quá hạn chót hoàn thành. Vui lòng cập nhật trạng thái công việc ngay để giữ vững tiến độ dự án!",
    taskTitle: "Tên công việc",
    taskDesc: "Mô tả",
    taskPriority: "Độ ưu tiên",
    taskDueDate: "Hạn chót (Múi giờ của bạn)",
    ctaButton: "ĐI ĐẾN DANH SÁCH CÔNG VIỆC",
    priorityHigh: "CAO",
    priorityMedium: "TRUNG BÌNH",
    priorityLow: "THẤP",
    priorityUnknown: "KHÔNG XÁC ĐỊNH"
  } : {
    greeting: `Hi ${escapeHtml(user.displayName)},`,
    intro: "One of your critical tasks has passed its due date. Please update the status of this task immediately to keep the project on track!",
    taskTitle: "Task Title",
    taskDesc: "Description",
    taskPriority: "Priority",
    taskDueDate: "Due Date (Your Timezone)",
    ctaButton: "GO TO MY TASK LIST",
    priorityHigh: "HIGH",
    priorityMedium: "MEDIUM",
    priorityLow: "LOW",
    priorityUnknown: "UNKNOWN"
  };

  // Build priority badge styling
  let priorityLabel = text.priorityUnknown;
  let badgeColor = "#E2E8F0"; // Slate default
  let textColor = "#4A5568";
  
  const rawPriority = String(task.priority).toLowerCase();
  if (rawPriority === "high") {
    priorityLabel = `🔴 ${text.priorityHigh}`;
    badgeColor = "#FFECEC";
    textColor = "#E53E3E";
  } else if (rawPriority === "medium") {
    priorityLabel = `🟡 ${text.priorityMedium}`;
    badgeColor = "#FFFDF0";
    textColor = "#D69E2E";
  } else if (rawPriority === "low") {
    priorityLabel = `🟢 ${text.priorityLow}`;
    badgeColor = "#E6FFFA";
    textColor = "#319795";
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";

  const contentHtml = `
    <h2 style="font-size: 22px; font-weight: 800; text-align: center; color: #000000; margin: 10px 0 20px 0; text-transform: uppercase;">
      ${title}
    </h2>

    <p style="font-size: 15px; line-height: 1.6; font-weight: 500; color: #333333; margin-bottom: 25px;">
      ${text.greeting}<br><br>
      ${text.intro}
    </p>

    <!-- Task details box in Pop Art style -->
    <div style="border: 3px solid #000000; box-shadow: 4px 4px 0px #000000; background-color: #FFFFFF; padding: 25px; margin-bottom: 30px;">
      <h3 style="font-size: 18px; font-weight: 800; color: #000000; margin: 0 0 15px 0; border-bottom: 2px solid #000000; padding-bottom: 8px; text-transform: uppercase;">
        📌 ${escapeHtml(task.title)}
      </h3>
      
      ${task.description ? `
        <div style="margin-bottom: 15px;">
          <strong style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #666666; display: block; margin-bottom: 3px;">
            ${text.taskDesc}
          </strong>
          <p style="font-size: 14px; color: #333333; margin: 0; line-height: 1.5; font-weight: 500;">
            ${escapeHtml(task.description)}
          </p>
        </div>
      ` : ""}

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; vertical-align: middle; width: 45%;">
            <strong style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #666666; display: block;">
              ${text.taskPriority}
            </strong>
          </td>
          <td style="padding: 6px 0; vertical-align: middle;">
            <span style="display: inline-block; background-color: ${badgeColor}; border: 1.5px solid #000000; color: ${textColor}; font-size: 12px; font-weight: 800; padding: 3px 8px; box-shadow: 2px 2px 0px #000000; text-transform: uppercase;">
              ${priorityLabel}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; vertical-align: middle;">
            <strong style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #666666; display: block;">
              ${text.taskDueDate}
            </strong>
          </td>
          <td style="padding: 6px 0; vertical-align: middle; font-size: 14px; font-weight: 700; color: #000000;">
            📅 ${escapeHtml(formattedDueDate)}
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/" style="display: inline-block; background-color: #FF5A5F; border: 3px solid #000000; color: #FFFFFF; font-size: 16px; font-weight: 900; text-decoration: none; padding: 14px 28px; box-shadow: 4px 4px 0px #000000; text-transform: uppercase; letter-spacing: 1px;">
        🚀 ${text.ctaButton} 🚀
      </a>
    </div>
  `;

  return getHeader(title, lang) + contentHtml + getFooter(user._id || user.id, unsubscribeToken, lang);
};
