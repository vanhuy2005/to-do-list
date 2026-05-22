import { jest } from "@jest/globals";

// Mock Concurrency Governor
const mockGovernorRun = jest.fn();
jest.unstable_mockModule("../../to-do-list/backend/src/services/concurrencyGovernor.js", () => ({
  governor: {
    run: mockGovernorRun,
    getStats: () => ({ global_concurrency: 0, global_pending: 0, inflight_cache_size: 0 })
  }
}));

// Imports after mocking
const { extractIntent } = await import("../../to-do-list/backend/src/services/intentService.js");

describe("Intent Extraction Service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should parse successful JSON draft from primary provider", async () => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    
    const mockOutput = JSON.stringify({
      title: "Mua sữa cho con",
      description: "Vì nhà đã hết sạch sữa",
      datePhrase: "sáng mai",
      tags: ["shopping", "personal"],
      priority: "medium",
      confidence: 0.95
    });
    mockGovernorRun.mockResolvedValue(mockOutput);

    const result = await extractIntent({
      transcript: "Nhắc tôi mua sữa vì con hết sữa rồi vào sáng mai",
      requestId: "req-1"
    });

    expect(mockGovernorRun).toHaveBeenCalledWith("openrouter", expect.any(String), expect.any(Function));
    expect(result.title).toBe("Mua sữa cho con");
    expect(result.description).toBe("Vì nhà đã hết sạch sữa");
    expect(result.datePhrase).toBe("sáng mai");
    expect(result.tags).toEqual(["shopping", "personal"]);
    expect(result.priority).toBe("medium");
    expect(result.confidence).toBe(0.95);
  });

  it("should fallback to Gemini if OpenRouter fails", async () => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    process.env.GEMINI_API_KEY = "test-gemini-key";

    // OpenRouter rejects, Gemini succeeds
    mockGovernorRun
      .mockRejectedValueOnce(new Error("OpenRouter error"))
      .mockResolvedValueOnce(JSON.stringify({
        title: "Họp standup",
        description: "Thảo luận tiến độ",
        datePhrase: "9 giờ sáng",
        tags: ["meeting", "work"],
        priority: "high",
        confidence: 0.91
      }));

    const result = await extractIntent({
      transcript: "Họp standup lúc 9 giờ sáng để thảo luận tiến độ",
      requestId: "req-2"
    });

    expect(mockGovernorRun).toHaveBeenCalledTimes(2);
    expect(mockGovernorRun.mock.calls[0][0]).toBe("openrouter");
    expect(mockGovernorRun.mock.calls[1][0]).toBe("gemini");
    expect(result.title).toBe("Họp standup");
    expect(result.priority).toBe("high");
  });

  it("should not call Ollama if OLLAMA_ENABLED is not set", async () => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    delete process.env.OLLAMA_ENABLED;

    mockGovernorRun.mockRejectedValue(new Error("API Error"));

    const result = await extractIntent({
      transcript: "Gọi điện cho mẹ",
      requestId: "req-3"
    });

    // Should only attempt openrouter, then fallback to local hardcoded draft on failure
    expect(mockGovernorRun).toHaveBeenCalledTimes(1);
    expect(mockGovernorRun.mock.calls[0][0]).toBe("openrouter");
    expect(result.confidence).toBe(0.3); // local fallback confidence
  });

  it("should preserve high/medium/low priority and map urgent to high", async () => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";

    mockGovernorRun.mockResolvedValue(JSON.stringify({
      title: "Fix bug đăng nhập khẩn cấp",
      description: null,
      datePhrase: null,
      tags: ["bug"],
      priority: "high",
      confidence: 0.96
    }));

    const result = await extractIntent({
      transcript: "Fix bug đăng nhập khẩn cấp",
      requestId: "req-4"
    });

    expect(result.priority).toBe("urgent");
    expect(result.task.priority).toBe("high");
  });

  // --- Regression Test Cases: 20 Vietnamese recurring sentences ---
  describe("20 Vietnamese recurring task sentences", () => {
    const cases = [
      { transcript: "Nhắc tôi mỗi ngày đi tập gym lúc 6 giờ sáng", title: "Đi tập gym", recurrence: "daily", time: "06:00" },
      { transcript: "Nhắc tôi hàng ngày uống nước lúc 8 giờ sáng", title: "Uống nước", recurrence: "daily", time: "08:00" },
      { transcript: "Nhắc tôi mỗi ngày học bài lúc 9 giờ tối", title: "Học bài", recurrence: "daily", time: "21:00" },
      { transcript: "Nhắc tôi mỗi ngày thiền lúc 5 giờ sáng", title: "Thiền", recurrence: "daily", time: "05:00" },
      { transcript: "Nhắc tôi mỗi tối đi bộ lúc 8 giờ tối", title: "Đi bộ", recurrence: "daily", time: "20:00" },
      { transcript: "Hàng ngày đọc sách lúc 10 giờ đêm", title: "Đọc sách", recurrence: "daily", time: "22:00" },
      { transcript: "Mỗi sáng uống cà phê lúc 7 giờ sáng", title: "Uống cà phê", recurrence: "daily", time: "07:00" },
      { transcript: "Mỗi chiều đi bơi lúc 5 giờ chiều", title: "Đi bơi", recurrence: "daily", time: "17:00" },
      { transcript: "Mỗi trưa ăn cơm lúc 12 giờ trưa", title: "Ăn cơm", recurrence: "daily", time: "12:00" },
      { transcript: "Nhắc tôi mỗi ngày kiểm tra email lúc 9 giờ sáng", title: "Kiểm tra email", recurrence: "daily", time: "09:00" },
      { transcript: "Nhắc tôi mỗi tuần đi họp lúc 9 giờ sáng thứ hai", title: "Đi họp", recurrence: "weekly", time: "09:00" },
      { transcript: "Hàng tuần dọn nhà lúc 8 giờ sáng chủ nhật", title: "Dọn nhà", recurrence: "weekly", time: "08:00" },
      { transcript: "Mỗi tuần đá bóng lúc 6 giờ chiều thứ bảy", title: "Đá bóng", recurrence: "weekly", time: "18:00" },
      { transcript: "Mỗi tuần đi chợ lúc 7 giờ sáng thứ năm", title: "Đi chợ", recurrence: "weekly", time: "07:00" },
      { transcript: "Hàng tuần đi siêu thị lúc 8 giờ tối thứ tư", title: "Đi siêu thị", recurrence: "weekly", time: "20:00" },
      { transcript: "Mỗi tháng nộp tiền nhà lúc 9 giờ sáng ngày 1", title: "Nộp tiền nhà", recurrence: "monthly", time: "09:00" },
      { transcript: "Hàng tháng thanh toán hóa đơn lúc 8 giờ tối ngày 5", title: "Thanh toán hóa đơn", recurrence: "monthly", time: "20:00" },
      { transcript: "Mỗi tháng báo cáo doanh thu lúc 5 giờ chiều ngày cuối tháng", title: "Báo cáo doanh thu", recurrence: "monthly", time: "17:00" },
      { transcript: "Mỗi tháng đi cắt tóc lúc 10 giờ sáng ngày 15", title: "Đi cắt tóc", recurrence: "monthly", time: "10:00" },
      { transcript: "Hàng tháng họp chi bộ lúc 2 giờ chiều ngày mùng 3", title: "Họp chi bộ", recurrence: "monthly", time: "14:00" }
    ];

    cases.forEach(({ transcript, title, recurrence, time }, idx) => {
      it(`should parse recurring case ${idx + 1}: "${transcript}"`, async () => {
        process.env.OPENROUTER_API_KEY = "test-openrouter-key";
        
        const mockOutput = JSON.stringify({
          intent: "create",
          confidence: 0.98,
          isClarificationRequired: false,
          clarificationQuestion: null,
          missingFields: [],
          task: {
            title,
            description: null,
            datePhrase: "mỗi ngày",
            dueDate: null,
            isRecurring: true,
            recurrence,
            time,
            priority: "medium",
            tags: ["recurring"]
          },
          updateData: null,
          completeData: null,
          searchData: null
        });
        mockGovernorRun.mockResolvedValueOnce(mockOutput);

        const result = await extractIntent({ transcript, requestId: `req-recur-${idx}` });
        expect(result.intent).toBe("create");
        expect(result.task.isRecurring).toBe(true);
        expect(result.task.recurrence).toBe(recurrence);
        expect(result.task.time).toBe(time);
        expect(result.task.title).toBe(title);
      });
    });
  });

  // --- Regression Test Cases: 10 clarification sentences ---
  describe("10 clarification sentences", () => {
    const cases = [
      { transcript: "Nhắc tôi mỗi ngày đi tập gym", missing: ["time"], question: "Bạn muốn tôi nhắc đi tập gym vào mấy giờ mỗi ngày?" },
      { transcript: "Hàng ngày phải uống nước", missing: ["time"], question: "Bạn muốn tôi nhắc uống nước lúc mấy giờ?" },
      { transcript: "Tôi muốn tạo một task dọn dẹp mỗi tuần", missing: ["time"], question: "Bạn muốn dọn dẹp vào thứ mấy và mấy giờ hàng tuần?" },
      { transcript: "Hàng tháng nộp báo cáo", missing: ["time"], question: "Bạn muốn nộp báo cáo vào ngày nào và mấy giờ hàng tháng?" },
      { transcript: "Nhắc tôi gọi điện cho mẹ", missing: ["time"], question: "Bạn muốn tôi nhắc gọi điện cho mẹ vào lúc nào?" },
      { transcript: "Họp standup hàng tuần", missing: ["time"], question: "Cuộc họp standup hàng tuần sẽ diễn ra vào thứ mấy và mấy giờ?" },
      { transcript: "Báo cáo doanh số mỗi tháng", missing: ["time"], question: "Bạn muốn báo cáo doanh số vào ngày nào hàng tháng?" },
      { transcript: "Đi bơi mỗi tuần", missing: ["time"], question: "Bạn muốn tôi nhắc đi bơi vào thứ mấy hàng tuần?" },
      { transcript: "Thiền mỗi ngày", missing: ["time"], question: "Bạn muốn thiền vào thời gian nào mỗi ngày?" },
      { transcript: "Mỗi tối đi bộ", missing: ["time"], question: "Bạn muốn tôi nhắc đi bộ lúc mấy giờ mỗi tối?" }
    ];

    cases.forEach(({ transcript, missing, question }, idx) => {
      it(`should identify clarification required for: "${transcript}"`, async () => {
        process.env.OPENROUTER_API_KEY = "test-openrouter-key";
        
        const mockOutput = JSON.stringify({
          intent: "create",
          confidence: 0.85,
          isClarificationRequired: true,
          clarificationQuestion: question,
          missingFields: missing,
          task: null,
          updateData: null,
          completeData: null,
          searchData: null
        });
        mockGovernorRun.mockResolvedValueOnce(mockOutput);

        const result = await extractIntent({ transcript, requestId: `req-clarify-${idx}` });
        expect(result.intent).toBe("create");
        expect(result.isClarificationRequired).toBe(true);
        expect(result.clarificationQuestion).toBe(question);
        expect(result.missingFields).toEqual(missing);
      });
    });
  });

  // --- Regression Test Cases: 10 update/complete/search sentences ---
  describe("10 update/complete/search sentences", () => {
    const cases = [
      { transcript: "Cập nhật task đi chạy bộ thành 7 giờ tối", intent: "update", updateData: { taskQuery: "đi chạy bộ", updates: { dueDate: "7 giờ tối" } } },
      { transcript: "Thay đổi tiêu đề task mua sữa thành mua nước ngọt", intent: "update", updateData: { taskQuery: "mua sữa", updates: { title: "mua nước ngọt" } } },
      { transcript: "Đổi deadline họp standup sang ngày mai", intent: "update", updateData: { taskQuery: "họp standup", updates: { dueDate: "ngày mai" } } },
      { transcript: "Thêm mô tả cho task làm bài tập là nộp trước chủ nhật", intent: "update", updateData: { taskQuery: "làm bài tập", updates: { description: "nộp trước chủ nhật" } } },
      { transcript: "Hoàn thành task mua sữa", intent: "complete", completeData: { taskQuery: "mua sữa" } },
      { transcript: "Xong việc đi chợ rồi nhé", intent: "complete", completeData: { taskQuery: "đi chợ" } },
      { transcript: "Đánh dấu hoàn thành task nộp báo cáo", intent: "complete", completeData: { taskQuery: "nộp báo cáo" } },
      { transcript: "Tìm kiếm các công việc liên quan đến học tập", intent: "search", searchData: { searchQuery: "học tập" } },
      { transcript: "Xem giúp tôi các task của ngày mai", intent: "search", searchData: { searchQuery: "ngày mai" } },
      { transcript: "Liệt kê các việc cần làm gấp", intent: "search", searchData: { searchQuery: "gấp" } }
    ];

    cases.forEach(({ transcript, intent, updateData, completeData, searchData }, idx) => {
      it(`should parse intent "${intent}" for case ${idx + 1}: "${transcript}"`, async () => {
        process.env.OPENROUTER_API_KEY = "test-openrouter-key";
        
        const mockOutput = JSON.stringify({
          intent,
          confidence: 0.95,
          isClarificationRequired: false,
          clarificationQuestion: null,
          missingFields: [],
          task: null,
          updateData: updateData || null,
          completeData: completeData || null,
          searchData: searchData || null
        });
        mockGovernorRun.mockResolvedValueOnce(mockOutput);

        const result = await extractIntent({ transcript, requestId: `req-non-create-${idx}` });
        expect(result.intent).toBe(intent);
        if (updateData) expect(result.updateData).toEqual(updateData);
        if (completeData) expect(result.completeData).toEqual(completeData);
        if (searchData) expect(result.searchData).toEqual(searchData);
      });
    });
  });
});
