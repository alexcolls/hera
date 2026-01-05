export type JobStatus = 'pending' | 'analyzing' | 'generating_scenes' | 'composing_music' | 'stitching' | 'completed' | 'failed';

export interface JobResult {
  videoUrl?: string;
  imagesUrl?: string; // ZIP of images
}

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: number;
  input: {
    imageUrl?: string; // In a real app, we might upload this first and get a URL, or pass base64 (not recommended for large files)
    style: string;
    hookText: string;
  };
  result?: JobResult;
  error?: string;
  logs: string[]; // For progress updates like "Analyzing image..."
}

export interface CreateJobRequest {
  imageUrl: string;
  style: string;
  hookText: string;
}

export interface CreateJobResponse {
  jobId: string;
}

export interface JobStatusResponse {
  job: Job;
}
