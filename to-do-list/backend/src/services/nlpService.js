import * as chrono from 'chrono-node';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Ho_Chi_Minh';

// --- Vietnamese date aliases (chrono-node không biết tiếng Việt) ---
const VI_ALIASES = [
  { pattern: /\bmai\b/gi,              replace: 'tomorrow' },
  { pattern: /\bm[oố]t\b/gi,          replace: '2 days from now' },
  { pattern: /\bhôm nay\b/gi,         replace: 'today' },
  { pattern: /\bhôm qua\b/gi,         replace: 'yesterday' },
  { pattern: /\bth[uứ] 2\b/gi,        replace: 'Monday' },
  { pattern: /\bth[uứ] 3\b/gi,        replace: 'Tuesday' },
  { pattern: /\bth[uứ] 4\b/gi,        replace: 'Wednesday' },
  { pattern: /\bth[uứ] 5\b/gi,        replace: 'Thursday' },
  { pattern: /\bth[uứ] 6\b/gi,        replace: 'Friday' },
  { pattern: /\bth[uứ] 7\b/gi,        replace: 'Saturday' },
  { pattern: /\bch[uủ] nh[aậ]t\b/gi,  replace: 'Sunday' },
  { pattern: /\btu[aầ]n sau\b/gi,     replace: 'next week' },
  { pattern: /\btu[aầ]n t[oớ]i\b/gi,  replace: 'next week' },
  { pattern: /\bcu[oố]i th[aá]ng\b/gi,replace: 'the last day of this month' },
  { pattern: /\bl[uú]c\s+(\d+)\s*h\s*s[aá]ng\b/gi, replace: 'at $1:00 AM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*h\s*ch[iị]u\b/gi, replace: 'at $1:00 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*h\s*t[oố]i\b/gi,   replace: 'at $1:00 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*h\b/gi,          replace: 'at $1:00' },
  { pattern: /\bs[aá]ng mai\b/gi,     replace: 'tomorrow at 8:00 AM' },
  { pattern: /\bchi[ề]u mai\b/gi,     replace: 'tomorrow at 2:00 PM' },
  { pattern: /\bt[ố]i mai\b/gi,        replace: 'tomorrow at 8:00 PM' },
  { pattern: /\bs[aá]ng\b/gi,         replace: 'at 8:00 AM' },
  { pattern: /\bchi[ề]u\b/gi,         replace: 'at 2:00 PM' },
  { pattern: /\bt[ố]i\b/gi,           replace: 'at 8:00 PM' },
  { pattern: /\bđêm\b/gi,           replace: 'at 11:00 PM' },
  { pattern: /\bcu[ố]i tu[ầ]n\b/gi,   replace: 'this weekend' },
];

/**
 * Input:  rawText (string) — transcript hoặc datePhrase từ AI
 * Output: ISO 8601 string | null
 *
 * Ví dụ:
 *   parseDateFromText("gặp Nam sáng mai")   → "2026-05-17T08:00:00+07:00"
 *   parseDateFromText("thứ 6 tuần sau")     → "2026-05-22T09:00:00+07:00"
 *   parseDateFromText("nothing here")       → null
 */
export function parseDateFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Dịch tiếng Việt → tiếng Anh để chrono hiểu
  let normalized = rawText.toLowerCase();
  
  // Xử lý thủ công "cuối tháng" vì chrono-node không ổn định với cụm này qua dịch thuật
  if (/\bcu[oố]i th[aá]ng\b/i.test(normalized)) {
    return dayjs().tz(TZ).endOf('month').toISOString();
  }

  // Xoá các tiền tố ngày tháng thông dụng để tránh làm nhiễu chrono
  normalized = normalized.replace(/\b(ngày|vào lúc|vào|vào ngày)\b/gi, '');

  for (const { pattern, replace } of VI_ALIASES) {
    normalized = normalized.replace(pattern, replace);
  }

  // 2. Chạy chrono-node với reference time là "now" tại Vietnam
  const refDate = dayjs().tz(TZ).toDate();
  const results = chrono.parse(normalized, refDate, { forwardDate: true });

  if (!results.length) return null;

  // 3. Lấy kết quả đầu tiên, convert sang ISO với timezone Việt Nam
  const parsed = results[0].date();
  return dayjs(parsed).tz(TZ).toISOString();
}

// --- Priority Rule Engine ---
const PRIORITY_RULES = [
  // Check negations/low priority first to avoid matching keywords like "gấp" in "không gấp"
  { pattern: /\b(low|thấp|không gấp|khi rảnh|whenever|no rush)\b/i,   priority: 'low' },
  { pattern: /\b(urgent|gấp|khẩn|asap|ngay|immediately|emergency)\b/i, priority: 'high' },
  { pattern: /\b(deadline|hạn chót|hết hạn|due today|hôm nay)\b/i,    priority: 'high' },
  { pattern: /\b(important|quan trọng|critical|cần thiết)\b/i,         priority: 'high' },
];

/**
 * Input:  text (string)
 * Output: 'urgent' | 'high' | 'medium' | 'low'
 */
export function extractPriority(text) {
  if (!text) return 'medium';
  for (const { pattern, priority } of PRIORITY_RULES) {
    if (pattern.test(text)) return priority;
  }
  return 'medium';
}
