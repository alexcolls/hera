import { Job } from '../types/job';
import { supabaseAdmin } from '../supabase/admin';

export interface JobStore {
  createJob(job: Job): Promise<void>;
  getJob(id: string): Promise<Job | null>;
  updateJob(id: string, updates: Partial<Job>): Promise<void>;
  addLog(id: string, message: string): Promise<void>;
}

class SupabaseJobStore implements JobStore {
  
  async createJob(job: Job): Promise<void> {
    const { error } = await supabaseAdmin
      .from('jobs')
      .insert({
        id: job.id,
        status: job.status,
        created_at: new Date(job.createdAt).toISOString(),
        input: job.input,
        logs: job.logs,
        result: job.result
      });

    if (error) {
      console.error('Supabase createJob error:', error);
      throw new Error('Failed to save job to DB');
    }
  }

  async getJob(id: string): Promise<Job | null> {
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    // Map DB fields back to Job type
    return {
      id: data.id,
      status: data.status,
      createdAt: new Date(data.created_at).getTime(),
      input: data.input,
      result: data.result,
      error: data.error,
      logs: data.logs || []
    };
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<void> {
    // If we're updating logs, we might want to append, but simpler to just overwrite for now 
    // or handle it via a specific stored procedure if concurrency was high.
    // For this MVP, standard update is fine.
    
    const dbUpdates: any = { ...updates };
    if (updates.createdAt) {
      dbUpdates.created_at = new Date(updates.createdAt).toISOString();
      delete dbUpdates.createdAt;
    }

    const { error } = await supabaseAdmin
      .from('jobs')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Supabase updateJob error:', error);
    }
  }

  async addLog(id: string, message: string): Promise<void> {
    // This is tricky with simple UPDATEs as it's a race condition.
    // Best practice: Use a Postgres function or fetch-modify-save.
    // We'll do fetch-modify-save for MVP simplicity.
    
    const job = await this.getJob(id);
    if (!job) return;

    const newLogs = [...(job.logs || []), message];
    
    const { error } = await supabaseAdmin
      .from('jobs')
      .update({ logs: newLogs })
      .eq('id', id);

    if (error) console.error('Supabase addLog error:', error);
  }
}

// Fallback in-memory store for development if Supabase keys are missing
class InMemoryJobStore implements JobStore {
  private jobs: Map<string, Job> = new Map();

  async createJob(job: Job): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async getJob(id: string): Promise<Job | null> {
    return this.jobs.get(id) || null;
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

export const jobStore: JobStore = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? new SupabaseJobStore() 
  : new InMemoryJobStore();
