// NEXT_PUBLIC_FAL_API_KEY=... (Add this to your .env.local)

import * as fal from '@fal-ai/serverless-client';

export interface FalService {
  generateVideo(prompt: string, imageUrl?: string, modelId?: string): Promise<string>;
  generateImage(prompt: string, referenceImageUrl?: string, modelId?: string): Promise<string>;
}

class FalServiceImpl implements FalService {
  
  constructor() {
    // The @fal-ai/serverless-client automatically uses NEXT_PUBLIC_FAL_API_KEY
    // But we can explicitely set it if needed
    if (process.env.NEXT_PUBLIC_FAL_API_KEY) {
        try {
            fal.config({
                credentials: process.env.NEXT_PUBLIC_FAL_API_KEY
            });
        } catch (e) {
            console.error('Failed to configure Fal client:', e);
        }
    }
  }

  async generateImage(prompt: string, referenceImageUrl?: string, modelId?: string): Promise<string> {
    console.log(`[Fal.ai] Generating image for prompt: "${prompt}"`);

    if (!process.env.NEXT_PUBLIC_FAL_API_KEY) {
        console.warn('FAL_KEY not found. Using Mock Image.');
        return 'https://via.placeholder.com/1024x1792.png?text=Fal+Key+Missing';
    }

    try {
        const chosenModel = modelId || (referenceImageUrl ? 'fal-ai/flux-pulid' : 'fal-ai/flux/dev');
        const usesReference = chosenModel === 'fal-ai/flux-pulid';
        console.log(`[Fal.ai] Using image model: ${chosenModel}`);

        const input: Record<string, unknown> = {
            prompt,
            image_size: "portrait_16_9",
        };

        if (usesReference && referenceImageUrl) {
            input.reference_image_url = referenceImageUrl;
        } else {
            // Common defaults for non-reference Flux variants
            input.num_inference_steps = 28;
            input.guidance_scale = 3.5;
        }

        const result: unknown = await fal.subscribe(chosenModel, {
            input,
            logs: true,
        });

        const images = (result as { images?: Array<{ url?: string }> })?.images;
        if (images && images[0]?.url) {
            return images[0].url;
        }
        
        throw new Error('No image returned from Fal');
    } catch (error) {
        console.error('Fal.ai image generation failed:', error);
        throw error;
    }
  }

  async generateVideo(prompt: string, imageUrl?: string, modelId?: string): Promise<string> {
    console.log(`[Fal.ai] Generating video for prompt: "${prompt}" (Image: ${imageUrl ? 'Yes' : 'No'})`);

    if (!process.env.NEXT_PUBLIC_FAL_API_KEY) {
        console.warn('FAL_KEY not found. Using Mock Video.');
        const stockVideos = [
            'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-lights-at-night-4261-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4'
        ];
        return stockVideos[Math.floor(Math.random() * stockVideos.length)];
    }

    try {
        const defaultModel = imageUrl
            ? 'fal-ai/kling-video/v1/standard/image-to-video'
            : 'fal-ai/kling-video/v1/standard/text-to-video';

        const chosenModel = modelId || defaultModel;
        const expectsImage = chosenModel.includes('/image-to-video');

        console.log(`[Fal.ai] Using video model: ${chosenModel}`);

        const input: Record<string, unknown> = {
            prompt,
            duration: "5",
            aspect_ratio: "9:16",
        };

        if (expectsImage && imageUrl) {
            input.image_url = imageUrl;
        }

        const result: unknown = await fal.subscribe(chosenModel, {
            input,
            logs: true,
        });

        const videoUrl = (result as { video?: { url?: string } })?.video?.url;
        if (videoUrl) {
            return videoUrl;
        }
        
        throw new Error('No video URL in response');
    } catch (error) {
        console.error('Fal.ai video generation failed:', error);
        throw error;
    }
  }
}

export const falService = new FalServiceImpl();
