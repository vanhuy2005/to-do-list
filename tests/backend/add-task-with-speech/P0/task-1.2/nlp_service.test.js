import { parseDateFromText, extractPriority } from '../../../../../to-do-list/backend/src/services/nlpService.js';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Ho_Chi_Minh';

describe('NLP Service - Date Parsing & Priority Engine', () => {
  
  describe('parseDateFromText()', () => {
    const today = dayjs().tz(TZ);

    it('should parse Vietnamese "mai" as tomorrow', () => {
      const result = parseDateFromText('gặp Nam sáng mai');
      const expected = today.add(1, 'day').hour(8).minute(0).second(0).millisecond(0);
      
      // Compare ISO strings (ignoring milliseconds if any)
      expect(dayjs(result).format('YYYY-MM-DD')).toBe(expected.format('YYYY-MM-DD'));
    });

    it('should parse Vietnamese "mốt" as day after tomorrow', () => {
      const result = parseDateFromText('đi chơi ngày mốt');
      const expected = today.add(2, 'day');
      expect(dayjs(result).format('YYYY-MM-DD')).toBe(expected.format('YYYY-MM-DD'));
    });

    it('should parse "thứ 6 tuần sau" correctly', () => {
      const result = parseDateFromText('họp thứ 6 tuần sau');
      // chrono-node handles "next Friday"
      // We check if it's a Friday
      expect(dayjs(result).day()).toBe(5); // 5 = Friday
      expect(dayjs(result).isAfter(today)).toBe(true);
    });

    it('should parse "cuối tháng" correctly', () => {
      const result = parseDateFromText('trả tiền nhà cuối tháng');
      const expected = today.endOf('month');
      expect(dayjs(result).format('YYYY-MM-DD')).toBe(expected.format('YYYY-MM-DD'));
    });

    it('should parse English "Friday next week" correctly', () => {
      const result = parseDateFromText('Meeting Friday next week');
      expect(dayjs(result).day()).toBe(5);
      expect(dayjs(result).isAfter(today.add(6, 'day'))).toBe(true);
    });

    it('should return null for non-date text', () => {
      const result = parseDateFromText('làm việc chăm chỉ');
      expect(result).toBeNull();
    });

    it('should handle null or empty input gracefully', () => {
      expect(parseDateFromText(null)).toBeNull();
      expect(parseDateFromText('')).toBeNull();
    });
  });

  describe('extractPriority()', () => {
    it('should extract "urgent" for high-priority keywords', () => {
      expect(extractPriority('việc này rất gấp')).toBe('urgent');
      expect(extractPriority('ASAP meeting')).toBe('urgent');
      expect(extractPriority('khẩn cấp!!!!')).toBe('urgent');
    });

    it('should extract "high" for important keywords', () => {
      expect(extractPriority('deadline báo cáo')).toBe('high');
      expect(extractPriority('quan trọng: họp team')).toBe('high');
    });

    it('should extract "low" for low-priority keywords', () => {
      expect(extractPriority('làm khi rảnh')).toBe('low');
      expect(extractPriority('không gấp đâu')).toBe('low');
      expect(extractPriority('whenever you can')).toBe('low');
    });

    it('should return "medium" by default', () => {
      expect(extractPriority('mua sữa')).toBe('medium');
      expect(extractPriority('')).toBe('medium');
      expect(extractPriority(null)).toBe('medium');
    });
  });
});
