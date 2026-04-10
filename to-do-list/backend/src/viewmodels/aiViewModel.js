import { GoogleGenerativeAI } from "@google/generative-ai";

const getAIConfig = () => ({
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  refusalMessage:
    process.env.AI_SCOPE_REFUSAL_MESSAGE ||
    "Xin lỗi, tôi chỉ hỗ trợ các câu hỏi liên quan đến hệ thống quản lý công việc này.",
});

const SCOPE_KEYWORDS = [
  "task",
  "todo",
  "to-do",
  "cong viec",
  "công việc",
  "nhiem vu",
  "nhiệm vụ",
  "deadline",
  "lich",
  "lịch",
  "nhac viec",
  "nhắc việc",
  "profile",
  "thong tin",
  "thông tin",
  "tai khoan",
  "tài khoản",
  "status",
  "priority",
  "kanban",
  "danh sach cong viec",
  "danh sách công việc",
  "sua thong tin",
  "sửa thông tin",
  "tao task",
  "tạo task",
  "tao cong viec",
  "tạo công việc",
  "sap xep cong viec",
  "sắp xếp công việc",
  "dang xuat",
  "đăng xuất",
  "logout",
  "log out",
  "dang nhap",
  "đăng nhập",
  "login",
  "account",
  "acc",
  "mat khau",
  "mật khẩu",
  "doi mat khau",
  "đổi mật khẩu",
  "dang ky",
  "đăng ký",
  "register",
  "xoa task",
  "xóa task",
  "delete task",
  "sua task",
  "sửa task",
  "edit task",
  "cap nhat task",
  "cập nhật task",
  "xep lich",
  "xếp lịch",
  "thoi khoa bieu",
  "thời khóa biểu",
  "ke hoach ngay",
  "kế hoạch ngày",
  "lich hoc",
  "lịch học",
  "lich lam",
  "lịch làm",
];

const APP_KNOWLEDGE = [
  "Đăng ký: vào màn hình Register và gửi thông tin để tạo tài khoản.",
  "Đăng nhập: vào Login, nhập email + mật khẩu để nhận access token và refresh token.",
  "Đăng xuất: vào tab Cá nhân rồi chọn Đăng xuất.",
  "Xem/Sửa hồ sơ: vào tab Cá nhân, cập nhật thông tin và bấm lưu.",
  "Tạo task: bấm nút +, nhập title/description/status/priority/dueDate rồi lưu.",
  "Sửa task: mở task chi tiết và chọn chỉnh sửa.",
  "Xóa task: trong task chọn xóa, task sẽ vào thùng rác.",
  "Khôi phục task: vào danh sách thùng rác và chọn restore.",
  "Tìm/lọc task: dùng search và filter theo status/priority/tag.",
];

class AIViewModelError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.name = "AIViewModelError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

const stripDiacritics = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const QUESTION_PARTICLES = [
  "sao",
  "sao vay",
  "sao ma",
  "sao lai",
  "lam sao",
  "lam sao de",
  "lam sao ma",
  "nhu the nao",
  "nhu ntn",
  "chi",
  "duoc khong",
  "duoc ko",
  "khong",
  "yeu cau",
];

const INTENT_KEYWORDS = {
  login: ["dang nhap", "login", "log in", "log in", "dang cap", "vao he thong"],
  logout: ["dang xuat", "logout", "log out", "thoat", "thoat he thong"],
  register: [
    "dang ky",
    "register",
    "tao tai khoan",
    "tao account",
    "dang ky tai khoan",
  ],
  update_profile: [
    "sua thong tin",
    "cap nhat profile",
    "doi mat khau",
    "ho so",
    "thay doi mat khau",
    "chinh profile",
    "avatar",
    "sua avatar",
    "doi avatar",
    "thay avatar",
    "theme",
    "nen"
  ],
  create_task: [
    "tao task",
    "tao cong viec",
    "them task",
    "them cong viec",
    "lap task",
    "tao task moi",
  ],
  update_task: [
    "sua task",
    "edit task",
    "cap nhat task",
    "chinh sua task",
    "sua cong viec",
    "cap nhat cong viec",
  ],
  delete_task: [
    "xoa task",
    "delete task",
    "xoa cong viec",
    "xoa task di",
    "go task",
  ],
  restore_task: [
    "khoi phuc",
    "restore",
    "thung rac",
    "lay lai",
    "khoi phuc task",
  ],
  search_filter: ["tim", "loc", "filter", "search", "tim kiem", "tim task"],
  review: ["hop ly", "danh gia", "review", "nhan xet", "danh gia task"],
  setting: [
    "cai dat",
    "setting",
    "thiet lap",
    "tuy chinh",
    "cai dat ca nhan",
    "profile",
    "theme",
    "nen",
    "background",
  ],
};

const stripQuestionParticles = (text) => {
  let result = text;

  // Sort particles by length (longest first) to avoid partial matches
  const sortedParticles = [...QUESTION_PARTICLES].sort(
    (a, b) => b.length - a.length,
  );

  sortedParticles.forEach((particle) => {
    const regex = new RegExp(`\\b${particle}\\b`, "g");
    result = result.replace(regex, " ");
  });

  return result.replace(/\s+/g, " ").trim();
};

const hasScheduleIntent = (message) => {
  const normalized = normalizeText(stripDiacritics(message));
  if (!normalized) {
    return false;
  }

  const hasTimePattern =
    /\b\d{1,2}\s*(h|gio|g)\s*\d{0,2}\b/.test(normalized) ||
    /\b\d{1,2}:\d{2}\b/.test(normalized);
  const hasPlanWords = [
    "xep lich",
    "sap xep",
    "ok ko",
    "on khong",
    "hop ly",
    "lich hoc",
    "lich lam",
    "ke hoach",
  ].some((keyword) => normalized.includes(keyword));

  return hasTimePattern || hasPlanWords;
};

const detectIntent = (message) => {
  const normalized = normalizeText(stripDiacritics(message));

  if (!normalized) {
    return "unknown";
  }

  const stripped = stripQuestionParticles(normalized);

  if (!stripped) {
    return "unknown";
  }

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((keyword) => stripped.includes(keyword))) {
      return intent;
    }
  }

  if (hasScheduleIntent(message)) {
    return "schedule";
  }

  return "unknown";
};

const hasScopeKeyword = (message) => {
  const intent = detectIntent(message);
  if (intent !== "unknown" && intent !== "schedule") {
    return true;
  }

  const normalized = normalizeText(message);
  const normalizedPlain = normalizeText(stripDiacritics(message));

  if (!normalized) {
    return false;
  }

  return SCOPE_KEYWORDS.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    const normalizedKeywordPlain = normalizeText(stripDiacritics(keyword));

    return (
      normalized.includes(normalizedKeyword) ||
      normalizedPlain.includes(normalizedKeywordPlain)
    );
  });
};

const sanitizeTasks = (tasks) => {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks.slice(0, 50).map((task) => ({
    title: String(task?.title || "").slice(0, 120),
    description: String(task?.description || "").slice(0, 300),
    status: String(task?.status || ""),
    priority: String(task?.priority || ""),
    dueDate: task?.dueDate || null,
  }));
};

const buildPrompt = ({ message, tasks }) => {
  return [
    "Bạn là trợ lý AI cho web app quản lý công việc to-do.",
    "Lưu ý: backend chỉ gọi bạn khi câu hỏi đã được xác định là TRONG PHẠM VI.",
    "Yêu cầu bắt buộc:",
    "1) Trả lời bằng tiếng Việt có dấu, ngắn gọn, dễ hiểu, ưu tiên hướng dẫn thao tác trong app.",
    "2) Không bịa tính năng không có trong hệ thống.",
    "3) Nếu người dùng đưa danh sách công việc, hãy đánh giá mức độ hợp lý và đề xuất tối đa 5 cải thiện cụ thể.",
    "4) Nếu câu hỏi mơ hồ, hãy hỏi lại 1-2 câu để làm rõ.",
    "5) Dựa trên kiến thức nghiệp vụ app bên dưới để hướng dẫn thao tác cụ thể.",
    "",
    "Kiến thức nghiệp vụ app:",
    ...APP_KNOWLEDGE.map((item) => `- ${item}`),
    "",
    "Câu hỏi người dùng:",
    message,
    "",
    "Danh sách công việc (nếu có):",
    JSON.stringify(tasks),
  ].join("\n");
};

const buildTaskListReview = (tasks) => {
  if (!tasks.length) {
    return "Bạn chưa có danh sách công việc để đánh giá. Hãy gửi thêm danh sách task hiện tại để mình review chi tiết.";
  }

  const counters = tasks.reduce(
    (acc, task) => {
      if (task.status === "done") acc.done += 1;
      else if (task.status === "doing") acc.doing += 1;
      else acc.todo += 1;
      return acc;
    },
    { todo: 0, doing: 0, done: 0 },
  );

  const suggestions = [
    "Ưu tiên tối đa 1-3 task quan trọng nhất trong ngày.",
    "Task đang làm (doing) nên giới hạn ít để tránh dàn trải.",
    "Task chưa có deadline nên bổ sung ngày hoàn thành dự kiến.",
    "Task mô tả quá ngắn nên thêm tiêu chí hoàn thành rõ ràng.",
    "Mỗi ngày nên chốt ít nhất 1 task done để giữ tiến độ.",
  ];

  return [
    "Mình đánh giá nhanh danh sách hiện tại:",
    `- Todo: ${counters.todo}, Doing: ${counters.doing}, Done: ${counters.done}`,
    "Gợi ý cải thiện:",
    ...suggestions.map((item) => `- ${item}`),
  ].join("\n");
};

const getFallbackAnswer = ({ message, tasks, refusalMessage }) => {
  const intent = detectIntent(message);

  if (intent === "schedule") {
    return [
      "Có, mình tư vấn xếp lịch được nhé.",
      "Gợi ý cho lịch bạn gửi:",
      "1. Nhóm việc theo mục tiêu: học, ăn, nghỉ, vận động.",
      "2. Mỗi block nên có thời lượng rõ (30-90 phút) và có 5-10 phút nghỉ giữa các block.",
      "3. Ưu tiên việc quan trọng/đòi hỏi tập trung vào buổi sáng.",
      "4. Thêm 1-2 khung giờ dự phòng để tránh vỡ lịch.",
      "5. Chuyển từng block thành task có deadline để theo dõi trong app.",
      "Nếu bạn muốn, gửi mình lịch đầy đủ cả ngày, mình sẽ tối ưu lại thành timeline cụ thể.",
    ].join("\n");
  }

  if (intent === "register") {
    return [
      "Để đăng ký tài khoản:",
      "1. Mở màn hình Đăng ký.",
      "2. Nhập email, mật khẩu và tên hiển thị.",
      "3. Bấm Đăng ký, sau đó đăng nhập để sử dụng app.",
    ].join("\n");
  }

  if (intent === "login") {
    return [
      "Để đăng nhập:",
      "1. Mở màn hình Đăng nhập.",
      "2. Nhập email và mật khẩu đã đăng ký.",
      "3. Bấm Đăng nhập để vào hệ thống.",
    ].join("\n");
  }

  if (intent === "create_task") {
    return [
      "Bạn có thể tạo task như sau:",
      "1. Bấm nút dấu + ở giữa thanh dưới.",
      "2. Nhập tiêu đề, mô tả, trạng thái, ưu tiên, deadline (nếu có).",
      "3. Bấm Lưu/Tạo để hoàn tất.",
    ].join("\n");
  }

  if (intent === "logout") {
    return [
      "Để đăng xuất:",
      "1. Vào tab Cá nhân (Profile) ở thanh điều hướng dưới.",
      "2. Chọn Đăng xuất.",
      "3. Xác nhận nếu ứng dụng hỏi lại.",
    ].join("\n");
  }

  if (intent === "update_profile") {
    return [
      "Bạn sửa thông tin tài khoản như sau:",
      "1. Vào tab Cá nhân.",
      "2. Chọn chỉnh sửa hồ sơ.",
      "3. Cập nhật thông tin và bấm Lưu.",
    ].join("\n");
  }

  if (intent === "update_task") {
    return [
      "Để sửa task:",
      "1. Mở task cần chỉnh sửa.",
      "2. Chọn Chỉnh sửa.",
      "3. Cập nhật nội dung (title, trạng thái, ưu tiên, deadline).",
      "4. Bấm Lưu để hoàn tất.",
    ].join("\n");
  }

  if (intent === "delete_task") {
    return [
      "Để xóa task:",
      "1. Mở task hoặc menu thao tác trên card task.",
      "2. Chọn Xóa task.",
      "3. Xác nhận để chuyển task vào thùng rác.",
    ].join("\n");
  }

  if (intent === "restore_task") {
    return [
      "Để khôi phục task đã xóa:",
      "1. Mở danh sách thùng rác.",
      "2. Chọn task cần khôi phục.",
      "3. Bấm Khôi phục (restore).",
    ].join("\n");
  }

  if (intent === "search_filter") {
    return [
      "Bạn có thể tìm/lọc task như sau:",
      "1. Dùng ô tìm kiếm để search theo tiêu đề hoặc mô tả.",
      "2. Dùng bộ lọc theo trạng thái, mức ưu tiên, tag.",
      "3. Kết hợp sort theo updatedAt hoặc dueDate để xem dễ hơn.",
    ].join("\n");
  }

  if (intent === "review") {
    return buildTaskListReview(tasks);
  }

  if (intent === "setting") {
    return [
      "Bạn có thể cấu hình các cài đặt như sau:",
      "1. Vào tab Cài đặt ở thanh điều hướng dưới.",
      "2. Chỉnh sửa các tùy chọn: chủ đề, hiển thị, thông báo, v.v.",
      "3. Lưu các thay đổi.",
    ].join("\n");
  }

  if (tasks.length > 0) {
    return "Mình có thể hỗ trợ bạn về tạo/sửa task, deadline, ưu tiên, trạng thái hoặc review danh sách công việc. Bạn muốn bắt đầu từ phần nào?";
  }

  return refusalMessage;
};

const aiViewModel = {
  async askAssistant({ userId, message, tasks }) {
    const { geminiApiKey, geminiModel, refusalMessage } = getAIConfig();

    if (!userId) {
      throw new AIViewModelError(401, "MISSING_AUTH", "Bạn cần đăng nhập");
    }

    if (!message || String(message).trim().length < 3) {
      throw new AIViewModelError(
        400,
        "INVALID_MESSAGE",
        "Nội dung câu hỏi cần tối thiểu 3 ký tự",
      );
    }

    const safeTasks = sanitizeTasks(tasks);
    const inScope =
      hasScopeKeyword(message) ||
      hasScheduleIntent(message) ||
      safeTasks.length > 0;

    if (!inScope) {
      return {
        statusCode: 200,
        success: true,
        data: {
          inScope: false,
          answer: refusalMessage,
        },
      };
    }

    if (!geminiApiKey) {
      return {
        statusCode: 200,
        success: true,
        data: {
          inScope: true,
          answer: getFallbackAnswer({
            message: String(message),
            tasks: safeTasks,
            refusalMessage,
          }),
        },
      };
    }

    let answer = "";
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: geminiModel });

      const result = await model.generateContent(
        buildPrompt({ message: String(message), tasks: safeTasks }),
      );

      answer = result.response?.text?.()?.trim() || "";
    } catch (error) {
      console.warn("Gemini lỗi, chuyển sang fallback:", error.message);
    }

    if (!answer) {
      answer = getFallbackAnswer({
        message: String(message),
        tasks: safeTasks,
        refusalMessage,
      });
    }

    return {
      statusCode: 200,
      success: true,
      data: {
        inScope: true,
        answer,
      },
    };
  },
};

export { AIViewModelError };
export default aiViewModel;
