import { governor } from '../../../../../to-do-list/backend/src/services/concurrencyGovernor.js';
import { jest } from '@jest/globals';

describe('Global Concurrency Governor', () => {
  
  beforeEach(() => {
    // Reset governor state if possible or ensure clean start
  });

  it('should limit global concurrency to 3', async () => {
    const slowTask = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'done';
    };

    // Run 6 tasks. The first 3 should run, next 3 should wait.
    const tasks = Array(6).fill(null).map(() => governor.run('groq', Math.random().toString(), slowTask));
    
    // Wait a bit to let them start
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const stats = governor.getStats();
    expect(stats.global_concurrency).toBeLessThanOrEqual(3);
    expect(stats.global_pending).toBeGreaterThanOrEqual(3);

    await Promise.all(tasks);
  });

  it('should deduplicate identical inflight requests', async () => {
    let callCount = 0;
    const task = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      return { data: 'result', timestamp: Date.now() };
    };

    // Call twice with same hash key (transcript)
    const p1 = governor.run('groq', 'same transcript', task);
    const p2 = governor.run('groq', 'same transcript', task);

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(callCount).toBe(1); // Only called once
    expect(res1).toEqual(res2); // Both got same result
  });

  it('should not deduplicate if transcripts are different', async () => {
    let callCount = 0;
    const task = async () => {
      callCount++;
      return 'done';
    };

    await Promise.all([
      governor.run('groq', 'transcript 1', task),
      governor.run('groq', 'transcript 2', task)
    ]);

    expect(callCount).toBe(2);
  });

  it('should handle errors in wrapped tasks and release the slot', async () => {
    const failingTask = async () => {
      throw new Error('Task Failed');
    };

    await expect(governor.run('groq', 'failing task', failingTask)).rejects.toThrow('Task Failed');
    
    // Verify that we can still run subsequent tasks
    const successTask = async () => 'ok';
    const result = await governor.run('groq', 'success task', successTask);
    expect(result).toBe('ok');
  });
});
