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
  
  // Hour & Minute patterns with "giờ", "h", "g"
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*s[aá]ng\b/gi, replace: 'at $1:$3 AM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*ch[iị]u\b/gi, replace: 'at $1:$3 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*t[oố]i\b/gi,   replace: 'at $1:$3 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\b/gi,          replace: 'at $1:$3' },
  
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*s[aá]ng\b/gi, replace: 'at $1:$3 AM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ch[iị]u\b/gi, replace: 'at $1:$3 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*t[oố]i\b/gi,   replace: 'at $1:$3 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\b/gi,          replace: 'at $1:$3' },
  
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*s[aá]ng\b/gi, replace: 'at $1:00 AM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*ch[iị]u\b/gi, replace: 'at $1:00 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*t[oố]i\b/gi,   replace: 'at $1:00 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*đ[ê]m\b/gi,    replace: 'at $1:00 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\b/gi,          replace: 'at $1:00' },

  { pattern: /\b(\d+)\s*(giờ|g|h)\s*s[aá]ng\b/gi, replace: 'at $1:00 AM' },
  { pattern: /\b(\d+)\s*(giờ|g|h)\s*ch[iị]u\b/gi, replace: 'at $1:00 PM' },
  { pattern: /\b(\d+)\s*(giờ|g|h)\s*t[oố]i\b/gi,   replace: 'at $1:00 PM' },
  { pattern: /\b(\d+)\s*(giờ|g|h)\s*đ[ê]m\b/gi,    replace: 'at $1:00 PM' },
  { pattern: /\b(\d+)\s*(giờ|g|h)\b/gi,          replace: 'at $1:00' },
  
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
 * Pre-process written Vietnamese numbers to standard digits.
 */
function convertVietnameseNumbersToDigits(text) {
  if (!text) return text;
  let result = text;
  const mappings = [
    { pattern: /\bmười\s+hai\b/gi, replacement: '12' },
    { pattern: /\bmười\s+một\b/gi, replacement: '11' },
    { pattern: /\bmười\b/gi, replacement: '10' },
    { pattern: /\bchín\b/gi, replacement: '9' },
    { pattern: /\btám\b/gi, replacement: '8' },
    { pattern: /\bbảy\b/gi, replacement: '7' },
    { pattern: /\bsáu\b/gi, replacement: '6' },
    { pattern: /\bnăm\b/gi, replacement: '5' },
    { pattern: /\blăm\b/gi, replacement: '5' },
    { pattern: /\bbốn\b/gi, replacement: '4' },
    { pattern: /\btư\b/gi, replacement: '4' },
    { pattern: /\bba\b/gi, replacement: '3' },
    { pattern: /\bhai\b/gi, replacement: '2' },
    { pattern: /\bmột\b/gi, replacement: '1' }
  ];
  for (const { pattern, replacement } of mappings) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Input:  rawText (string) — transcript hoặc datePhrase từ AI
 * Output: ISO 8601 string | null
 */
export function parseDateFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Pre-process numbers & translate to English
  let normalized = convertVietnameseNumbersToDigits(rawText.toLowerCase());
  
  // Xử lý thủ công "cuối tháng"
  if (/\bcu[oố]i th[aá]ng\b/i.test(normalized)) {
    return dayjs().tz(TZ).endOf('month').toISOString();
  }

  // Xoá các tiền tố ngày tháng thông dụng
  normalized = normalized.replace(/\b(ngày|vào lúc|vào|vào ngày)\b/gi, '');

  for (const { pattern, replace } of VI_ALIASES) {
    normalized = normalized.replace(pattern, replace);
  }

  // 2. Chạy chrono-node với reference time là "now" tại Vietnam
  const refDate = dayjs().tz(TZ).toDate();
  const results = chrono.parse(normalized, refDate, { forwardDate: true });

  if (!results.length) return null;

  const result = results[0];
  const parsedDate = result.date();
  
  // 3. Temporal Proximity Heuristic for ambiguous hours (1-12)
  const hasMeridiem = result.start.isCertain('meridiem') || 
                      /\b(s[aá]ng|chi[ề]u|t[ố]i|đ[ê]m|am|pm)\b/i.test(rawText);
  const parsedHour = result.start.get('hour');
  
  if (!hasMeridiem && parsedHour !== null && parsedHour >= 1 && parsedHour <= 12) {
    const now = dayjs().tz(TZ);
    const parsedDayjs = dayjs(parsedDate).tz(TZ);
    const amCandidate = parsedDayjs.hour(parsedHour).minute(result.start.get('minute') || 0).second(0).millisecond(0);
    const pmCandidate = amCandidate.hour(parsedHour + 12);
    
    const diffAM = Math.abs(amCandidate.diff(now, 'minute'));
    const diffPM = Math.abs(pmCandidate.diff(now, 'minute'));
    
    let chosenDate;
    if (diffAM <= 120 || diffPM <= 120) {
      chosenDate = diffAM < diffPM ? amCandidate : pmCandidate;
    } else {
      const isAMFuture = amCandidate.isAfter(now);
      const isPMFuture = pmCandidate.isAfter(now);
      
      if (isAMFuture && isPMFuture) {
        chosenDate = amCandidate;
      } else if (isPMFuture) {
        chosenDate = pmCandidate;
      } else {
        chosenDate = amCandidate;
      }
    }
    return chosenDate.toISOString();
  }

  return dayjs(parsedDate).tz(TZ).toISOString();
}

// --- Priority Rule Engine ---
const PRIORITY_RULES = [
  // Check negations/low priority first to avoid matching keywords like "gấp" in "không gấp"
  { pattern: /\b(low|thấp|không gấp|khi rảnh|whenever|no rush)\b/i,   priority: 'low' },
  { pattern: /\b(urgent|gấp|khẩn|asap|ngay|immediately|emergency)\b/i, priority: 'urgent' },
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
