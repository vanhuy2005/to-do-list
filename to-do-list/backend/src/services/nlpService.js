import * as chrono from 'chrono-node';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Ho_Chi_Minh';

// --- Vietnamese date aliases (chrono-node không biết tiếng Việt) ---
const VI_ALIASES = [
  // --- 1. Compound Specific Phrases ---
  { pattern: /\bs[aá]ng\s+mai\b/gi,     replace: 'tomorrow at 8:00 AM' },
  { pattern: /\bchi[ề]u\s+mai\b/gi,     replace: 'tomorrow at 2:00 PM' },
  { pattern: /\bt[ố]i\s+mai\b/gi,        replace: 'tomorrow at 8:00 PM' },
  { pattern: /\btr[ư]a\s+mai\b/gi,      replace: 'tomorrow at 12:00 PM' },
  
  { pattern: /\bs[aá]ng\s+nay\b/gi,     replace: 'today at 8:00 AM' },
  { pattern: /\bchi[ề]u\s+nay\b/gi,     replace: 'today at 2:00 PM' },
  { pattern: /\bt[ố]i\s+nay\b/gi,        replace: 'today at 8:00 PM' },
  { pattern: /\btr[ư]a\s+nay\b/gi,      replace: 'today at 12:00 PM' },

  // --- 2. Weekday + Tuần sau ---
  { pattern: /\bth[uứ]\s+2\s+tu[aầ]n\s+(sau|t[oớ]i)\b/gi, replace: 'next Monday' },
  { pattern: /\bth[uứ]\s+3\s+tu[aầ]n\s+(sau|t[oớ]i)\b/gi, replace: 'next Tuesday' },
  { pattern: /\bth[uứ]\s+4\s+tu[aầ]n\s+(sau|t[oớ]i)\b/gi, replace: 'next Wednesday' },
  { pattern: /\bth[uứ]\s+5\s+tu[aầ]n\s+(sau|t[oớ]i)\b/gi, replace: 'next Thursday' },
  { pattern: /\bth[uứ]\s+6\s+tu[aầ]n\s+(sau|t[oớ]i)\b/gi, replace: 'next Friday' },
  { pattern: /\bth[uứ]\s+7\s+tu[aầ]n\s+(sau|t[oớ]i)\b/gi, replace: 'next Saturday' },
  { pattern: /\bch[uủ]\s+nh[aậ]t\s+tu[aầ]n\s+(sau|t[oớ]i)\b/gi, replace: 'next Sunday' },

  // --- 3. Day Offsets ---
  { pattern: /\bng[aà]y\s+kia\b/gi,     replace: '2 days from now' },
  { pattern: /\bm[oố]t\b/gi,          replace: '2 days from now' },
  { pattern: /\bmai\b/gi,              replace: 'tomorrow' },
  { pattern: /\bh[oô]m\s+nay\b/gi,      replace: 'today' },
  { pattern: /\bh[oô]m\s+qua\b/gi,      replace: 'yesterday' },

  // --- 4. Months (descending order) ---
  { pattern: /\bth[aá]ng\s+12\b/gi, replace: 'December' },
  { pattern: /\bth[aá]ng\s+11\b/gi, replace: 'November' },
  { pattern: /\bth[aá]ng\s+10\b/gi, replace: 'October' },
  { pattern: /\bth[aá]ng\s+9\b/gi, replace: 'September' },
  { pattern: /\bth[aá]ng\s+8\b/gi, replace: 'August' },
  { pattern: /\bth[aá]ng\s+7\b/gi, replace: 'July' },
  { pattern: /\bth[aá]ng\s+6\b/gi, replace: 'June' },
  { pattern: /\bth[aá]ng\s+5\b/gi, replace: 'May' },
  { pattern: /\bth[aá]ng\s+4\b/gi, replace: 'April' },
  { pattern: /\bth[aá]ng\s+3\b/gi, replace: 'March' },
  { pattern: /\bth[aá]ng\s+2\b/gi, replace: 'February' },
  { pattern: /\bth[aá]ng\s+1\b/gi, replace: 'January' },

  // --- 5. Weeks & Months ---
  { pattern: /\bcu[oố]i\s+tu[aầ]n\s*(n[aà]y)?\b/gi, replace: 'this Sunday' },
  { pattern: /\btu[aầ]n\s+(sau|t[oớ]i)\b/gi,     replace: 'next week' },

  // --- 6. Weekdays ---
  { pattern: /\bth[uứ]\s+2\b/gi,        replace: 'Monday' },
  { pattern: /\bth[uứ]\s+3\b/gi,        replace: 'Tuesday' },
  { pattern: /\bth[uứ]\s+4\b/gi,        replace: 'Wednesday' },
  { pattern: /\bth[uứ]\s+5\b/gi,        replace: 'Thursday' },
  { pattern: /\bth[uứ]\s+6\b/gi,        replace: 'Friday' },
  { pattern: /\bth[uứ]\s+7\b/gi,        replace: 'Saturday' },
  { pattern: /\bch[uủ]\s+nh[aậ]t\b/gi,  replace: 'Sunday' },

  // --- 7. Lúc / At Patterns (Specific Hour + Minute + Period) ---
  {
    pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*đ[ê]m\b/gi,
    replace: (match, h, g, m) => {
      const hour = parseInt(h, 10);
      if (hour === 12) return `at 12:${m} AM`;
      return hour >= 1 && hour <= 4 ? `at ${hour}:${m} AM` : `at ${hour}:${m} PM`;
    }
  },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*s[aá]ng\b/gi, replace: 'at $1:$3 AM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*ch[iị]u\b/gi, replace: 'at $1:$3 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*t[oố]i\b/gi,   replace: 'at $1:$3 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\b/gi,          replace: 'at $1:$3' },

  // Lúc / At Patterns (Hour + Period)
  {
    pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*đ[ê]m\b/gi,
    replace: (match, h) => {
      const hour = parseInt(h, 10);
      if (hour === 12) return `at 12:00 AM`;
      return hour >= 1 && hour <= 4 ? `at ${hour}:00 AM` : `at ${hour}:00 PM`;
    }
  },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*s[aá]ng\b/gi, replace: 'at $1:00 AM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*ch[iị]u\b/gi, replace: 'at $1:00 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\s*t[oố]i\b/gi,   replace: 'at $1:00 PM' },
  { pattern: /\bl[uú]c\s+(\d+)\s*(giờ|g|h)\b/gi,          replace: 'at $1:00' },

  // Standalone Hour + Minute + Period
  {
    pattern: /\b(\d+)\s*(giờ|g|h)\s*(\d+)\s*ph[uú]t\s*đ[ê]m\b/gi,
    replace: (match, h, g, m) => {
      const hour = parseInt(h, 10);
      if (hour === 12) return `at 12:${m} AM`;
      return hour >= 1 && hour <= 4 ? `at ${hour}:${m} AM` : `at ${hour}:${m} PM`;
    }
  },

  // Standalone Hour + Period
  {
    pattern: /\b(\d+)\s*(giờ|g|h)\s*đ[ê]m\b/gi,
    replace: (match, h) => {
      const hour = parseInt(h, 10);
      if (hour === 12) return `at 12:00 AM`;
      return hour >= 1 && hour <= 4 ? `at ${hour}:00 AM` : `at ${hour}:00 PM`;
    }
  },
  { pattern: /\b(\d+)\s*(giờ|g|h)\s*s[aá]ng\b/gi, replace: 'at $1:00 AM' },
  { pattern: /\b(\d+)\s*(giờ|g|h)\s*ch[iị]u\b/gi, replace: 'at $1:00 PM' },
  { pattern: /\b(\d+)\s*(giờ|g|h)\s*t[oố]i\b/gi,   replace: 'at $1:00 PM' },
  { pattern: /\b(\d+)\s*(giờ|g|h)\b/gi,          replace: 'at $1:00' },

  // --- 8. General Periods ---
  { pattern: /\bs[aá]ng\b/gi,         replace: 'at 8:00 AM' },
  { pattern: /\bchi[ề]u\b/gi,         replace: 'at 2:00 PM' },
  { pattern: /\bt[ố]i\b/gi,           replace: 'at 8:00 PM' },
  { pattern: /\bđêm\b/gi,           replace: 'at 11:00 PM' },
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

  // 1. Pre-process numbers & lowercase
  let normalized = convertVietnameseNumbersToDigits(rawText.toLowerCase()).trim();
  normalized = normalized.replace(/\s+/g, ' ');

  const now = dayjs().tz(TZ);

  // Xử lý thủ công "cuối tháng"
  if (/\bcu[oố]i\s+th[aá]ng\b/i.test(normalized)) {
    return now.endOf('month').hour(17).minute(0).second(0).millisecond(0).toISOString();
  }

  // Xử lý thủ công "cuối tuần"
  if (/\bcu[oố]i\s+tu[aầ]n\b/i.test(normalized)) {
    const target = now.add((7 - now.day()) % 7, 'day').hour(12).minute(0).second(0).millisecond(0);
    return target.toISOString();
  }

  // Helper to extract time components
  const extractTimeComponents = (text) => {
    const timeRegex = /\b(\d+)\s*(?:giờ|g|h)\s*(?:(\d+)\s*(?:phút|p)?)?\b/i;
    const timeMatch = text.match(timeRegex);
    
    const periodRegex = /\b(s[aá]ng|chi[ề]u|t[ố]i|đ[ê]m|tr[ư]a)\b/i;
    const periodMatch = text.match(periodRegex);
    
    let hour = null;
    let minute = 0;
    let period = periodMatch ? periodMatch[1] : null;
    
    if (timeMatch) {
      hour = parseInt(timeMatch[1], 10);
      if (timeMatch[2]) {
        minute = parseInt(timeMatch[2], 10);
      }
    }
    
    return { hour, minute, period };
  };

  const resolveHourAndMinute = (hour, minute, period, defaultHour, defaultMinute) => {
    if (hour === null) {
      if (period) {
        const p = period.toLowerCase();
        if (p.includes("sáng")) return { hour: 8, minute: 0 };
        if (p.includes("trưa")) return { hour: 12, minute: 0 };
        if (p.includes("chiều")) return { hour: 14, minute: 0 };
        if (p.includes("tối")) return { hour: 20, minute: 0 };
        if (p.includes("đêm")) return { hour: 23, minute: 0 };
      }
      return { hour: defaultHour, minute: defaultMinute };
    }
    
    let resolvedHour = hour;
    if (period) {
      const p = period.toLowerCase();
      if (p.includes("sáng")) {
        if (resolvedHour === 12) resolvedHour = 0; // 12 AM
      } else if (p.includes("trưa")) {
        if (resolvedHour < 12) resolvedHour += 12; // 12 trưa is 12 PM
      } else if (p.includes("chiều") || p.includes("tối")) {
        if (resolvedHour < 12) resolvedHour += 12;
      } else if (p.includes("đêm")) {
        if (resolvedHour === 12) {
          resolvedHour = 0; // 12 AM next day
        } else if (resolvedHour >= 1 && resolvedHour <= 4) {
          // Keep same (1 AM - 4 AM)
        } else if (resolvedHour >= 5 && resolvedHour < 12) {
          resolvedHour += 12;
        }
      }
    }
    return { hour: resolvedHour, minute };
  };

  // Match: Weekday + tuần sau
  const weekdayWeekAfterRegex = /\b(?:th[uứ]\s+(hai|2|ba|3|tư|4|năm|5|sáu|6|bảy|7|bẩy)|(ch[uủ]\s+nh[aậ]t|cn))\s+tu[aầ]n\s+(sau|t[oớ]i)\b/i;
  const weekdayMatch = normalized.match(weekdayWeekAfterRegex);
  if (weekdayMatch) {
    let targetDayOfWeek = -1;
    const val = (weekdayMatch[1] || weekdayMatch[2] || "").toLowerCase();
    if (val.includes("hai") || val === "2") targetDayOfWeek = 1;
    else if (val.includes("ba") || val === "3") targetDayOfWeek = 2;
    else if (val.includes("tư") || val === "4") targetDayOfWeek = 3;
    else if (val.includes("năm") || val === "5") targetDayOfWeek = 4;
    else if (val.includes("sáu") || val === "6") targetDayOfWeek = 5;
    else if (val.includes("bảy") || val.includes("bẩy") || val === "7") targetDayOfWeek = 6;
    else if (val.includes("chủ nhật") || val.includes("cn")) targetDayOfWeek = 0;

    if (targetDayOfWeek !== -1) {
      const nextMonday = now.add((8 - now.day()) % 7 || 7, 'day').startOf('day');
      let targetDate = nextMonday.add(targetDayOfWeek === 0 ? 6 : targetDayOfWeek - 1, 'day');
      
      const timeComp = extractTimeComponents(normalized);
      const resolved = resolveHourAndMinute(timeComp.hour, timeComp.minute, timeComp.period, 12, 0);
      
      targetDate = targetDate.hour(resolved.hour).minute(resolved.minute).second(0).millisecond(0);
      return targetDate.toISOString();
    }
  }

  // Match: Day Relative offsets
  const dayRelativeRegex = /\b(?:ng[aà]y\s+)?(mai|kia|m[oố]t|h[oô]m\s+nay|nay|h[oô]m\s+qua|qua)\b/i;
  const dayMatch = normalized.match(dayRelativeRegex);
  if (dayMatch) {
    let dayOffset = 0;
    const val = dayMatch[1].toLowerCase();
    if (val === "mai") dayOffset = 1;
    else if (val === "kia" || val === "mốt") dayOffset = 2;
    else if (val === "hôm qua" || val === "qua") dayOffset = -1;
    else if (val === "hôm nay" || val === "nay") dayOffset = 0;

    let targetDate = now.add(dayOffset, 'day');
    
    const timeComp = extractTimeComponents(normalized);
    const resolved = resolveHourAndMinute(timeComp.hour, timeComp.minute, timeComp.period, now.hour(), now.minute());
    
    targetDate = targetDate.hour(resolved.hour).minute(resolved.minute).second(0).millisecond(0);
    return targetDate.toISOString();
  }

  // Match: Standalone time (e.g. "8 giờ tối", "7 giờ sáng", "2 giờ đêm")
  const timeComp = extractTimeComponents(normalized);
  if ((timeComp.hour !== null || timeComp.period !== null) && !/\b(?:ng[aà]y|th[aá]ng)\s+\d+/i.test(normalized)) {
    const resolved = resolveHourAndMinute(timeComp.hour, timeComp.minute, timeComp.period, now.hour(), now.minute());
    let targetDate = now.hour(resolved.hour).minute(resolved.minute).second(0).millisecond(0);
    
    // Applying forwardDate logic for standalone times
    if (targetDate.isBefore(now)) {
      targetDate = targetDate.add(1, 'day');
    }
    return targetDate.toISOString();
  }

  // 3. Fallback to chrono-node pipeline
  for (const { pattern, replace } of VI_ALIASES) {
    normalized = normalized.replace(pattern, replace);
  }

  // Xoá các tiền tố/giới từ tiếng Việt còn sót lại
  normalized = normalized.replace(/\b(ngày|vào lúc|vào|vào ngày|lúc)\b/gi, ' ');

  const refDate = now.toDate();
  const results = chrono.parse(normalized, refDate, { forwardDate: true });

  if (!results.length) return null;

  const result = results[0];
  const parsedDate = result.date();
  
  const hasMeridiem = result.start.isCertain('meridiem') || 
                      /\b(s[aá]ng|chi[ề]u|t[ố]i|đ[ê]m|am|pm)\b/i.test(rawText);
  const parsedHour = result.start.get('hour');
  
  if (!hasMeridiem && parsedHour !== null && parsedHour >= 1 && parsedHour <= 12) {
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
 * Output: 'high' | 'medium' | 'low'
 */
export function extractPriority(text) {
  if (!text) return 'medium';
  for (const { pattern, priority } of PRIORITY_RULES) {
    if (pattern.test(text)) return priority;
  }
  return 'medium';
}
