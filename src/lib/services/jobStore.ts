import { Job, JobStatus } from '../types/job';

// Simple in-memory store for MVP. 
// In production, replace with Redis or Database.
class JobStore {
  private jobs: Map<string, Job> = new Map();

  createJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<Job>): void {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, { ...job, ...updates });
    }
  }

  addLog(id: string, message: string): void {
    const job = this.jobs.get(id);
    if (job) {
      const logs = job.logs || [];
      this.jobs.set(id, { ...job, logs: [...logs, message] });
    }
  }
}

export const jobStore = new JobStore();
