// NEXT_PUBLIC_FAL_KEY=... (Add this to your .env.local)

import { fal } from '@fal-ai/serverless-client';

export interface FalVideoService {
  generateVideo(prompt: string): Promise<string>;
}

class FalVideoServiceImpl implements FalVideoService {
  
  constructor() {
    fal.config({
      credentials: process.env.NEXT_PUBLIC_FAL_KEY, // Note: For server-side, use standard env, but client lib checks this.
      // Better to proxy requests if this was client-side, but we are running in Next.js API route (Server).
    });
  }

  async generateVideo(prompt: string): Promise<string> {
    console.log(`[Fal.ai] Generating video for prompt: "${prompt}"`);

    if (!process.env.NEXT_PUBLIC_FAL_KEY) {
      console.warn('NEXT_PUBLIC_FAL_KEY not found. Using Mock Video.');
      // Fallback to mixkit
      const stockVideos = [
        'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-lights-at-night-4261-large.mp4',
        'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4'
      ];
      return stockVideos[Math.floor(Math.random() * stockVideos.length)];
    }

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
  }
}

export const falVideoService = new FalVideoServiceImpl();
