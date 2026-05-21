export const getFooter = (userId, token, lang = "vi") => {
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const unsubUrl = `${appUrl}/unsubscribe?userId=${userId}&token=${token}`;

  const text = lang === "vi" ? {
    unsub: "Bạn không muốn nhận những email này nữa?",
    clickHere: "Click vào đây để hủy đăng ký một chạm",
    safe: "Email này được gửi tự động bởi hệ thống bảo mật Task.Do.",
    rights: "© 2026 Task.Do. Bảo lưu mọi quyền."
  } : {
    unsub: "Don't want to receive these emails anymore?",
    clickHere: "Click here to unsubscribe in one click",
    safe: "This email was automatically sent by the secure Task.Do system.",
    rights: "© 2026 Task.Do. All rights reserved."
  };

  return `
      <div style="margin-top: 40px; border-top: 3px dashed #000000; padding-top: 30px; text-align: center;">
        <p style="font-size: 13px; font-weight: 700; color: #666666; margin: 0 0 10px 0;">
          ${text.unsub}
        </p>
        <a href="${unsubUrl}" style="display: inline-block; background-color: #FFDE47; border: 2px solid #000000; color: #000000; font-size: 12px; font-weight: 800; text-decoration: none; padding: 8px 16px; box-shadow: 3px 3px 0px #000000; text-transform: uppercase;">
          ⚡ ${text.clickHere} ⚡
        </a>
        <p style="font-size: 11px; color: #888888; font-weight: 500; margin: 25px 0 0 0; line-height: 1.5;">
          ${text.safe}<br>
          ${text.rights}
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};
