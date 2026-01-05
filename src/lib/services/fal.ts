// NEXT_PUBLIC_FAL_KEY=... (Add this to your .env.local)

import { fal } from '@fal-ai/serverless-client';

export interface FalVideoService {
  generateVideo(prompt: string): Promise<string>;
}

class FalVideoServiceImpl implements FalVideoService {
  
  constructor() {
    // The @fal-ai/serverless-client is mainly for client-side usage and auto-configures.
    // However, when running on server-side (Next.js API routes), we sometimes need to ensure 
    // the configuration is applied if 'fal' itself doesn't expose config directly in this version.
    
    // Check if 'config' exists, otherwise rely on the environment variable FAL_KEY/NEXT_PUBLIC_FAL_KEY being set.
    /*
    if (typeof fal.config === 'function') {
        fal.config({
            credentials: process.env.NEXT_PUBLIC_FAL_KEY, 
        });
    }
    */
  }

  async generateVideo(prompt: string): Promise<string> {
    console.log(`[Fal.ai] Generating video for prompt: "${prompt}"`);

    // Force Mock Video for now (User request)
    // if (!process.env.NEXT_PUBLIC_FAL_KEY) {
      console.warn('Fal.ai temporarily disabled. Using Mock Video.');
      // Fallback to mixkit
      const stockVideos = [
        'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-lights-at-night-4261-large.mp4',
        'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4'
      ];
      return stockVideos[Math.floor(Math.random() * stockVideos.length)];
    // }

    /*
    try {
      // Using Minimax model via Fal.ai
      const result: any = await fal.subscribe('fal-ai/minimax/video-01', {
        input: {
          prompt: prompt,
          duration: 5, // Generate 5s clip
          aspect_ratio: '9:16'
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
             update.logs.map((log) => console.log(log.message));
          }
        },
      });

      if (result.video && result.video.url) {
        return result.video.url;
      }
      
      throw new Error('No video URL in response');
    } catch (error) {
      console.error('Fal.ai generation failed:', error);
      throw error;
    }
    */
  }
}

export const falVideoService = new FalVideoServiceImpl();
