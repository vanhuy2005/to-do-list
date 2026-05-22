import { jest } from "@jest/globals";
import { parseDateFromText, extractPriority } from "../../to-do-list/backend/src/services/nlpService.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Ho_Chi_Minh";

describe("Vietnamese NLP Date & Priority Parsing", () => {
  beforeAll(() => {
    // Freeze time at Friday, May 22, 2026, 10:00 AM VN Time (which is 03:00 AM UTC)
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-22T10:00:00+07:00"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("parseDateFromText", () => {
    it("should parse specific compound 'sáng mai'", () => {
      const parsed = parseDateFromText("đi chạy bộ sáng mai");
      expect(parsed).toBe(dayjs("2026-05-23T08:00:00+07:00").toISOString());
    });

    it("should parse specific compound 'chiều mai'", () => {
      const parsed = parseDateFromText("meeting chiều mai");
      expect(parsed).toBe(dayjs("2026-05-23T14:00:00+07:00").toISOString());
    });

    it("should parse specific compound 'tối nay' to 20:00", () => {
      const parsed = parseDateFromText("học bài tối nay");
      expect(parsed).toBe(dayjs("2026-05-22T20:00:00+07:00").toISOString());
    });

    it("should parse specific compound 'trưa mai'", () => {
      const parsed = parseDateFromText("đi ăn trưa mai");
      expect(parsed).toBe(dayjs("2026-05-23T12:00:00+07:00").toISOString());
    });

    it("should parse specific compound 'trưa nay'", () => {
      const parsed = parseDateFromText("ăn trưa nay");
      expect(parsed).toBe(dayjs("2026-05-22T12:00:00+07:00").toISOString());
    });

    it("should parse specific compound 'sáng nay'", () => {
      const parsed = parseDateFromText("uống cafe sáng nay");
      expect(parsed).toBe(dayjs("2026-05-22T08:00:00+07:00").toISOString());
    });

    it("should parse 'ngày kia'", () => {
      const parsed = parseDateFromText("nộp báo cáo ngày kia");
      expect(parsed).toBe(dayjs("2026-05-24T10:00:00+07:00").toISOString());
    });

    it("should parse 'thứ 6 tuần sau'", () => {
      const parsed = parseDateFromText("thứ 6 tuần sau đi bơi");
      expect(parsed).toBe(dayjs("2026-05-29T12:00:00+07:00").toISOString());
    });

    it("should parse 'cuối tuần này' to Sunday", () => {
      const parsed = parseDateFromText("dọn dẹp nhà cửa cuối tuần này");
      expect(parsed).toBe(dayjs("2026-05-24T12:00:00+07:00").toISOString());
    });

    it("should parse 'cuối tháng' to the last day of month at 17:00", () => {
      const parsed = parseDateFromText("hoàn thành chỉ tiêu cuối tháng");
      expect(parsed).toBe(dayjs("2026-05-31T17:00:00+07:00").toISOString());
    });

    it("should parse '1 giờ đêm' to 01:00 AM VN time, not 13:00 PM", () => {
      const parsed = parseDateFromText("xem bóng đá lúc 1 giờ đêm");
      // Since it is 10:00 AM on May 22, "1 giờ đêm" forwardDate will resolve to May 23 at 01:00 AM
      expect(parsed).toBe(dayjs("2026-05-23T01:00:00+07:00").toISOString());
    });

    it("should parse '11 giờ đêm' to 23:00 PM VN time", () => {
      const parsed = parseDateFromText("đi ngủ lúc 11 giờ đêm");
      expect(parsed).toBe(dayjs("2026-05-22T23:00:00+07:00").toISOString());
    });

    it("should parse '12 giờ đêm' to 00:00 VN time (start of next day)", () => {
      const parsed = parseDateFromText("lúc 12 giờ đêm");
      expect(parsed).toBe(dayjs("2026-05-23T00:00:00+07:00").toISOString());
    });

    it("should parse direct numeric date '9 giờ sáng ngày 25 tháng 5'", () => {
      const parsed = parseDateFromText("họp lúc 9 giờ sáng ngày 25 tháng 5");
      expect(parsed).toBe(dayjs("2026-05-25T09:00:00+07:00").toISOString());
    });

    it("should return null for invalid text or empty input", () => {
      expect(parseDateFromText(null)).toBeNull();
      expect(parseDateFromText("")).toBeNull();
      expect(parseDateFromText("không có ngày tháng")).toBeNull();
    });

    // --- Regression Test Cases: 20 Vietnamese sentences with standard/relative deadlines ---
    it("should parse 'ngày mai lúc 5h chiều'", () => {
      expect(parseDateFromText("ngày mai lúc 5h chiều")).toBe(dayjs("2026-05-23T17:00:00+07:00").toISOString());
    });

    it("should parse '8 giờ tối mai'", () => {
      expect(parseDateFromText("8 giờ tối mai")).toBe(dayjs("2026-05-23T20:00:00+07:00").toISOString());
    });

    it("should parse 'ngày kia lúc 2 giờ chiều'", () => {
      expect(parseDateFromText("ngày kia lúc 2 giờ chiều")).toBe(dayjs("2026-05-24T14:00:00+07:00").toISOString());
    });

    it("should parse 'ngày mốt lúc 9 giờ tối'", () => {
      expect(parseDateFromText("ngày mốt lúc 9 giờ tối")).toBe(dayjs("2026-05-24T21:00:00+07:00").toISOString());
    });

    it("should parse 'sáng thứ hai tuần sau'", () => {
      expect(parseDateFromText("sáng thứ hai tuần sau")).toBe(dayjs("2026-05-25T08:00:00+07:00").toISOString());
    });

    it("should parse 'trưa thứ ba tuần sau'", () => {
      expect(parseDateFromText("trưa thứ ba tuần sau")).toBe(dayjs("2026-05-26T12:00:00+07:00").toISOString());
    });

    it("should parse 'chiều thứ tư tuần sau'", () => {
      expect(parseDateFromText("chiều thứ tư tuần sau")).toBe(dayjs("2026-05-27T14:00:00+07:00").toISOString());
    });

    it("should parse 'tối thứ năm tuần sau'", () => {
      expect(parseDateFromText("tối thứ năm tuần sau")).toBe(dayjs("2026-05-28T20:00:00+07:00").toISOString());
    });

    it("should parse 'sáng thứ sáu tuần sau'", () => {
      expect(parseDateFromText("sáng thứ sáu tuần sau")).toBe(dayjs("2026-05-29T08:00:00+07:00").toISOString());
    });

    it("should parse 'trưa thứ bảy tuần sau'", () => {
      expect(parseDateFromText("trưa thứ bảy tuần sau")).toBe(dayjs("2026-05-30T12:00:00+07:00").toISOString());
    });

    it("should parse 'tối chủ nhật tuần sau'", () => {
      expect(parseDateFromText("tối chủ nhật tuần sau")).toBe(dayjs("2026-05-31T20:00:00+07:00").toISOString());
    });

    it("should parse '12 giờ trưa hôm nay'", () => {
      expect(parseDateFromText("12 giờ trưa hôm nay")).toBe(dayjs("2026-05-22T12:00:00+07:00").toISOString());
    });

    it("should parse '8 giờ tối hôm nay'", () => {
      expect(parseDateFromText("8 giờ tối hôm nay")).toBe(dayjs("2026-05-22T20:00:00+07:00").toISOString());
    });

    it("should parse '10 giờ tối mai'", () => {
      expect(parseDateFromText("10 giờ tối mai")).toBe(dayjs("2026-05-23T22:00:00+07:00").toISOString());
    });

    it("should parse '3 giờ sáng mai'", () => {
      expect(parseDateFromText("3 giờ sáng mai")).toBe(dayjs("2026-05-23T03:00:00+07:00").toISOString());
    });

    it("should parse 'cuối tuần này'", () => {
      expect(parseDateFromText("cuối tuần này")).toBe(dayjs("2026-05-24T12:00:00+07:00").toISOString());
    });

    it("should parse 'cuối tháng'", () => {
      expect(parseDateFromText("cuối tháng")).toBe(dayjs("2026-05-31T17:00:00+07:00").toISOString());
    });

    it("should parse '8 giờ tối' forward to today evening", () => {
      expect(parseDateFromText("8 giờ tối")).toBe(dayjs("2026-05-22T20:00:00+07:00").toISOString());
    });

    it("should parse '7 giờ sáng' forward to next day", () => {
      expect(parseDateFromText("7 giờ sáng")).toBe(dayjs("2026-05-23T07:00:00+07:00").toISOString());
    });

    it("should parse '2 giờ đêm'", () => {
      expect(parseDateFromText("2 giờ đêm")).toBe(dayjs("2026-05-23T02:00:00+07:00").toISOString());
    });
  });

  describe("extractPriority", () => {
    it("should extract urgent for urgent keywords", () => {
      expect(extractPriority("làm gấp việc này")).toBe("urgent");
      expect(extractPriority("khẩn cấp, production bị sập")).toBe("urgent");
      expect(extractPriority("asap, nộp báo cáo")).toBe("urgent");
    });

    it("should extract low for negation/low-priority keywords", () => {
      expect(extractPriority("không gấp, làm khi rảnh")).toBe("low");
      expect(extractPriority("whenever, no rush")).toBe("low");
    });

    it("should extract high for deadline or important keywords", () => {
      expect(extractPriority("đây là công việc quan trọng")).toBe("high");
      expect(extractPriority("hạn chót ngày mai")).toBe("high");
    });

    it("should default to medium for general text", () => {
      expect(extractPriority("đi chợ mua rau")).toBe("medium");
      expect(extractPriority(null)).toBe("medium");
    });
  });
});
