import { Job, JobStatus } from '../types/job';
import Redis from 'ioredis';

// Interface
export interface IJobStore {
  createJob(job: Job): Promise<void>;
  getJob(id: string): Promise<Job | undefined>;
  updateJob(id: string, updates: Partial<Job>): Promise<void>;
  addLog(id: string, message: string): Promise<void>;
}

// Redis Implementation
class RedisJobStore implements IJobStore {
  private redis: Redis;

  constructor() {
    const connectionString = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(connectionString, {
      lazyConnect: true, // Don't crash if redis isn't there immediately in dev
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 50, 2000);
      }
    });
    
    this.redis.on('error', (err) => {
       console.warn('[Redis] Connection error, falling back to memory if possible (not implemented fully).', err.message);
    });
  }

  private getKey(id: string) {
    return `hera:job:${id}`;
  }

  async createJob(job: Job): Promise<void> {
    await this.redis.set(this.getKey(job.id), JSON.stringify(job));
    // Set expiry (e.g., 24 hours)
    await this.redis.expire(this.getKey(job.id), 86400); 
  }

  async getJob(id: string): Promise<Job | undefined> {
    const data = await this.redis.get(this.getKey(id));
    if (!data) return undefined;
    return JSON.parse(data);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<void> {
    const job = await this.getJob(id);
    if (job) {
      const updatedJob = { ...job, ...updates };
      await this.redis.set(this.getKey(id), JSON.stringify(updatedJob));
      await this.redis.expire(this.getKey(id), 86400); // Reset expiry on update
    }
  }

  async addLog(id: string, message: string): Promise<void> {
    const job = await this.getJob(id);
    if (job) {
      const logs = job.logs || [];
      // Limit logs to last 50 lines to save space
      const newLogs = [...logs, message].slice(-50);
      await this.updateJob(id, { logs: newLogs });
    }
  }
}

// In-Memory Implementation (Fallback)
class MemoryJobStore implements IJobStore {
  private jobs: Map<string, Job> = new Map();

  async createJob(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async getJob(id: string): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
    }
  }

  async addLog(id: string, message: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      const logs = job.logs || [];
      this.jobs.set(id, { ...job, logs: [...logs, message] });
    }
  }
}

// Export singleton based on environment
// For this dev environment where we might not have Redis running, we'll default to Memory 
// if REDIS_URL isn't explicitly set, OR try Redis and handle failure.
// But to be safe for "npm run dev", let's use Memory if REDIS_URL is missing.
export const jobStore = process.env.REDIS_URL 
    ? new RedisJobStore() 
    : new MemoryJobStore();
