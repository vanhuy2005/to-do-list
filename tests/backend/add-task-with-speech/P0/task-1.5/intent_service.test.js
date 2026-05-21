import { jest } from '@jest/globals';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Ho_Chi_Minh';

let mockRunResult = null;
let mockRunError = null;

// Mocking the governor using absolute path to ensure matching
jest.unstable_mockModule('C:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/backend/src/services/concurrencyGovernor.js', () => ({
  governor: {
    run: jest.fn(async (provider, transcript, fn) => {
      if (mockRunError) throw mockRunError;
      if (mockRunResult) return mockRunResult;
      return await fn();
    }),
  },
  GovernorError: class GovernorError extends Error {
    constructor(message, code) {
      super(message);
      this.code = code;
      this.name = 'GovernorError';
    }
  }
}));

const { extractIntent } = await import('../../../../../to-do-list/backend/src/services/intentService.js');
const { governor, GovernorError } = await import('../../../../../to-do-list/backend/src/services/concurrencyGovernor.js');

describe('Intent Service - AI Pipeline & Enrichment', () => {
  
  beforeEach(() => {
    mockRunResult = null;
    mockRunError = null;
    jest.clearAllMocks();
  });

  it('should successfully extract and enrich intent', async () => {
    mockRunResult = {
      title: 'Đi siêu thị',
      datePhrase: 'chiều nay',
      tags: ['shopping'],
      confidence: 0.9
    };

    const result = await extractIntent({ transcript: 'nhắc mình đi siêu thị chiều nay', requestId: 'req-1' });

    expect(result.title).toBe('Đi siêu thị');
    expect(result.datePhrase).toBe('chiều nay');
    expect(result.dueDate).toBeDefined();
    expect(result.priority).toBe('medium');
  });

  it('should fallback to minimal draft when governor times out', async () => {
    mockRunError = new GovernorError('Queue timeout', 'QUEUE_TIMEOUT');

    const result = await extractIntent({ transcript: 'một việc rất gấp gáp', requestId: 'req-2' });

    expect(result.title).toBe('một việc rất gấp gáp');
    expect(result.confidence).toBe(0.3);
    expect(result.priority).toBe('urgent');
  });

  it('should correctly enrich with priority even if AI doesn\'t see it', async () => {
    mockRunResult = {
      title: 'Họp',
      datePhrase: null,
      tags: [],
      confidence: 0.8
    };

    const result = await extractIntent({ transcript: 'họp gấp vào 9h sáng mai', requestId: 'req-3' });

    expect(result.priority).toBe('urgent');
    expect(dayjs(result.dueDate).tz(TZ).format('HH:mm')).toBe('09:00');
  });
});
