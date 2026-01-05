export type JobStatus = 
  | 'pending' 
  | 'analyzing' 
  | 'generating_storyboard'
  | 'waiting_for_storyboard_approval'
  | 'generating_video'
  | 'waiting_for_video_approval'
  | 'generating_audio'
  | 'stitching' 
  | 'completed' 
  | 'failed';

export type JobGenre = 
  | 'comedy' 
  | 'tragedy' 
  | 'thriller' 
  | 'romance' 
  | 'scifi' 
  | 'fantasy' 
  | 'mystery' 
  | 'horror' 
  | 'adventure' 
  | 'historical';

export type AudioType = 'narrative' | 'music';
export type JobLanguage = 'en' | 'zh' | 'es';

export type WorkflowModelConfig = {
  // Grok
  grokVisionModel?: string; // image analysis (vision)
  grokChatModel?: string; // storyboard/narrative/music prompts (chat)
  grokImageModel?: string; // fallback image generation

  // Fal
  falImageModel?: string; // storyboard images
  falVideoModel?: string; // scene videos

  // ElevenLabs
  elevenlabsModelId?: string;
  elevenlabsVoiceId?: string;

  // Suno
  sunoModel?: string;
};

export interface Scene {
  id: string; // uuid
  prompt: string;
  localizedPrompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  status: 'pending' | 'generating_image' | 'image_ready' | 'generating_video' | 'video_ready' | 'failed';
}

export interface JobResult {
  videoUrl?: string;
  imagesUrl?: string;
}

export type JobLogEntry = {
  key: string;
  vars?: Record<string, string | number>;
  ts?: number; // unix ms
};

export type JobLog = string | JobLogEntry;

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: number;
  input: {
    imageUrl?: string;
    language: JobLanguage;
    style: string;
    genre: JobGenre;
    audioType: AudioType;
    sceneCount: number;
    models?: WorkflowModelConfig;
    hookText?: string; // Kept for backward compatibility but might be unused in new UI
  };
  storyboard?: Scene[];
  musicPrompt?: string;
  narrativePrompt?: string;
  audioUrl?: string;
  result?: JobResult;
  error?: string;
  // Backward compatible: older jobs may have plain string logs.
  logs: JobLog[];
}

export interface CreateJobRequest {
  imageUrl: string;
  language: JobLanguage;
  style: string;
  genre: JobGenre;
  audioType: AudioType;
  sceneCount: number;
  models?: WorkflowModelConfig;
}

export interface CreateJobResponse {
  jobId: string;
}

export interface JobStatusResponse {
  job: Job;
}
