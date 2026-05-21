import pLimit from 'p-limit';
import Bottleneck from 'bottleneck';
import crypto from 'crypto';

// --- Global semaphore: tối đa 3 AI calls song song ---
const globalLimiter = pLimit(3);

// --- Per-provider token buckets (tuned theo free-tier limits) ---
const providerLimiters = {
  openrouter: new Bottleneck({
    reservoir: 20,          // 20 requests
    reservoirRefreshAmount: 20,
    reservoirRefreshInterval: 60_000,  // mỗi phút
    maxConcurrent: 2,
    minTime: 500,           // tối thiểu 500ms giữa 2 requests
  }),
  gemini: new Bottleneck({
    reservoir: 15,
    reservoirRefreshAmount: 15,
    reservoirRefreshInterval: 60_000,
    maxConcurrent: 2,
    minTime: 800,
  }),
  groq: new Bottleneck({
    reservoir: 30,
    reservoirRefreshAmount: 30,
    reservoirRefreshInterval: 60_000,
    maxConcurrent: 3,
    minTime: 200,
  }),
  ollama: new Bottleneck({
    reservoir: 100,         // Local, higher limits
    reservoirRefreshAmount: 100,
    reservoirRefreshInterval: 60_000,
    maxConcurrent: 5,       // Max 5 parallel local calls to avoid CPU spike
    minTime: 50,
  }),
};

// --- In-flight deduplication cache ---
const inflightCache = new Map(); // hash → { promise, createdAt }
const CACHE_TTL_MS = 30_000;

function makeHash(providerName, transcript) {
  return crypto
    .createHash('md5')
    .update(`${providerName}:${(transcript || '').toLowerCase().trim()}`)
    .digest('hex');
}

/**
 * Bọc bất kỳ AI call nào qua governor
 *
 * Usage:
 *   const result = await governor.run('openrouter', transcript, () => callOpenRouter(transcript));
 */
export const governor = {
  async run(providerName, transcript, fn) {
    const hash = makeHash(providerName, transcript);

    const cached = inflightCache.get(hash);
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      console.info({ event: 'governor.dedup_hit', hash, provider: providerName });
      return cached.promise;
    }

    const limiter = providerLimiters[providerName];
    if (!limiter) throw new Error(`Unknown provider: ${providerName}`);

    const QUEUE_TIMEOUT_MS = 20_000;

    const executionPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        inflightCache.delete(hash);
        reject(new GovernorError('Queue timeout — system too busy', 'QUEUE_TIMEOUT'));
      }, QUEUE_TIMEOUT_MS);

      globalLimiter(() => limiter.schedule(fn))
        .then(val => {
          clearTimeout(timeoutId);
          resolve(val);
        })
        .catch(err => {
          clearTimeout(timeoutId);
          inflightCache.delete(hash);
          reject(err);
        });
    });

    inflightCache.set(hash, { promise: executionPromise, createdAt: Date.now() });

    executionPromise
      .then(() => {
        setTimeout(() => inflightCache.delete(hash), CACHE_TTL_MS);
      })
      .catch(() => {});

    return executionPromise;
  },

  getStats() {
    return {
      global_concurrency: globalLimiter.activeCount,
      global_pending: globalLimiter.pendingCount,
      inflight_cache_size: inflightCache.size,
    };
  },
};

export class GovernorError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = 'GovernorError';
  }
}
