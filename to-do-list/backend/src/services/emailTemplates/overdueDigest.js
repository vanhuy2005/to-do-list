import { getHeader } from "./components/header.js";
import { getFooter } from "./components/footer.js";
import { escapeHtml } from "./components/escapeHtml.js";

/**
 * Renders the HTML template for the daily digest of multiple overdue tasks
 * @param {object} user - User document/object
 * @param {Array<object>} tasksWithFormattedDates - Array of tasks, each enriched with `formattedDueDate` in user's timezone
 * @param {string} unsubscribeToken - HMAC token for email footer unsubscribe
 * @returns {string} Fully compiled HTML email body
 */
export const getOverdueDigestTemplate = (user, tasksWithFormattedDates, unsubscribeToken) => {
  const lang = user.preferredLanguage || "vi";
  const count = tasksWithFormattedDates.length;
  
  const title = lang === "vi" ? "Báo cáo công việc quá hạn hàng ngày" : "Daily Overdue Tasks Digest";
  
  const text = lang === "vi" ? {
    greeting: `Chào ${escapeHtml(user.displayName)},`,
    intro: `Hệ thống ghi nhận bạn đang có <strong>${count}</strong> công việc đã quá hạn chót hoàn thành. Hãy dành ít phút để kiểm tra và cập nhật trạng thái nhé!`,
    thNo: "STT",
    thTitle: "Công việc",
    thPriority: "Ưu tiên",
    thDueDate: "Hạn chót",
    ctaButton: "ĐẾN BẢNG CÔNG VIỆC CỦA TÔI",
    priorityHigh: "CAO",
    priorityMedium: "TRUNG BÌNH",
    priorityLow: "THẤP",
    priorityUnknown: "K.XĐ"
  } : {
    greeting: `Hi ${escapeHtml(user.displayName)},`,
    intro: `You currently have <strong>${count}</strong> overdue tasks waiting for completion. Please take a few minutes to review and update their statuses below!`,
    thNo: "No.",
    thTitle: "Task Title",
    thPriority: "Priority",
    thDueDate: "Due Date",
    ctaButton: "GO TO MY WORKBOARD",
    priorityHigh: "HIGH",
    priorityMedium: "MEDIUM",
    priorityLow: "LOW",
    priorityUnknown: "N/A"
  };

  const appUrl = process.env.APP_URL || "http://localhost:5173";

  // Build task rows
  let rowsHtml = "";
  tasksWithFormattedDates.forEach((task, index) => {
    let priorityLabel = text.priorityUnknown;
    let badgeColor = "#E2E8F0";
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

    rowsHtml += `
      <tr style="border-bottom: 2px solid #000000; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <td style="padding: 12px 8px; font-weight: 800; font-size: 13px; text-align: center; border-right: 2px solid #000000; border-bottom: 2px solid #000000; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          ${index + 1}
        </td>
        <td style="padding: 12px 10px; font-weight: 700; font-size: 14px; border-right: 2px solid #000000; border-bottom: 2px solid #000000; color: #000000; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          ${escapeHtml(task.title)}
          ${task.description ? `<br><span style="font-size: 11px; font-weight: 500; color: #555555; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${escapeHtml(task.description)}</span>` : ""}
        </td>
        <td style="padding: 12px 8px; text-align: center; border-right: 2px solid #000000; border-bottom: 2px solid #000000; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <span style="display: inline-block; background-color: ${badgeColor}; border: 1.5px solid #000000; color: ${textColor}; font-size: 11px; font-weight: 800; padding: 2px 6px; box-shadow: 1.5px 1.5px 0px #000000; text-transform: uppercase; white-space: nowrap; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            ${priorityLabel}
          </span>
        </td>
        <td style="padding: 12px 10px; font-weight: 700; font-size: 12px; border-bottom: 2px solid #000000; color: #FF5A5F; white-space: nowrap; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          ${escapeHtml(task.formattedDueDate)}
        </td>
      </tr>
    `;
  });

  const contentHtml = `
    <h2 style="font-size: 22px; font-weight: 800; text-align: center; color: #000000; margin: 10px 0 20px 0; text-transform: uppercase; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      ${title}
    </h2>

    <p style="font-size: 15px; line-height: 1.6; font-weight: 500; color: #333333; margin-bottom: 25px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      ${text.greeting}<br><br>
      ${text.intro}
    </p>

    <!-- Table of Tasks in Pop Art style -->
    <div style="border: 3px solid #000000; box-shadow: 4px 4px 0px #000000; background-color: #FFFFFF; overflow-x: auto; margin-bottom: 30px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table style="width: 100%; border-collapse: collapse; border-spacing: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <thead>
          <tr style="background-color: #FFDE47; border-bottom: 3px solid #000000; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <th style="padding: 10px 8px; font-size: 12px; font-weight: 800; border-right: 2px solid #000000; text-transform: uppercase; text-align: center; width: 8%; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              ${text.thNo}
            </th>
            <th style="padding: 10px 10px; font-size: 12px; font-weight: 800; border-right: 2px solid #000000; text-transform: uppercase; text-align: left; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              ${text.thTitle}
            </th>
            <th style="padding: 10px 8px; font-size: 12px; font-weight: 800; border-right: 2px solid #000000; text-transform: uppercase; text-align: center; width: 22%; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              ${text.thPriority}
            </th>
            <th style="padding: 10px 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; text-align: left; width: 25%; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              ${text.thDueDate}
            </th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <a href="${appUrl}/" style="display: inline-block; background-color: #FF5A5F; border: 3px solid #000000; color: #FFFFFF; font-size: 16px; font-weight: 900; text-decoration: none; padding: 14px 28px; box-shadow: 4px 4px 0px #000000; text-transform: uppercase; letter-spacing: 1px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        🚀 ${text.ctaButton} 🚀
      </a>
    </div>
  `;

  return getHeader(title, lang) + contentHtml + getFooter(user._id || user.id, unsubscribeToken, lang);
};
