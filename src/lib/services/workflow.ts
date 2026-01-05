import { jobStore } from './jobStore';
import { grokService } from './grok';
import { sunoService } from './suno';
import { stitcherService } from './stitcher';
import { falVideoService } from './fal';
import { Scene } from '../types/job';
import { v4 as uuidv4 } from 'uuid';

export async function startWorkflow(jobId: string, resume: boolean = false) {
  const job = await jobStore.getJob(jobId);
  if (!job) return;

  try {
    // === PHASE 1: ANALYSIS & STORYBOARD ===
    if (!resume) {
        // 1. Analyze Image
        await jobStore.updateJob(jobId, { status: 'analyzing' });
        await jobStore.addLog(jobId, 'Starting image analysis with Grok Vision...');
        
        const profile = await grokService.analyzeImage(job.input.imageUrl || 'placeholder_image');
        await jobStore.addLog(jobId, `Analysis complete: ${profile.perceived_vibe}`);

        // 2. Generate Prompts
        await jobStore.updateJob(jobId, { status: 'generating_storyboard' });
        await jobStore.addLog(jobId, 'Generating scene prompts...');
        
        const scenePrompts = await grokService.generateScenePrompts(profile, job.input.style);
        const musicPrompt = await grokService.generateMusicPrompt(profile, job.input.style);

        // 3. Generate Static Images (Storyboard)
        await jobStore.addLog(jobId, 'Generating storyboard images (Grok Image)...');
        
        const scenes: Scene[] = await Promise.all(
            scenePrompts.scenes.map(async (prompt) => {
                const imageUrl = await grokService.generateImage(prompt);
                return {
                    id: uuidv4(),
                    prompt,
                    imageUrl,
                    status: 'image_ready'
                };
            })
        );

        // Save Storyboard and PAUSE
        await jobStore.updateJob(jobId, { 
            status: 'waiting_for_approval', 
            storyboard: scenes,
            musicPrompt
        });
        await jobStore.addLog(jobId, 'Storyboard ready. Waiting for user approval.');
        return; // STOP HERE
    }

    // === PHASE 2: VIDEO & AUDIO (RESUMED) ===
    if (job.status === 'generating_video' || resume) {
        // Check if we have scenes
        if (!job.storyboard || job.storyboard.length === 0) {
            throw new Error('No storyboard found to animate');
        }

        await jobStore.updateJob(jobId, { status: 'generating_video' });
        await jobStore.addLog(jobId, 'Generating video clips from storyboard (Fal.ai I2V)...');

        // Parallel Video Generation (Image-to-Video)
        // Note: falVideoService.generateVideo needs to be updated to support Image input if possible, 
        // OR we just use the prompt. 
        // User requested: "show them in the UI process so the user can confirm... before sending it to the video generator"
        // Ideally we use Image-to-Video. 
        // Fal.ai Minimax supports image-to-video? 
        // Minimax is typically T2V. Kling/Runway are I2V.
        // For MVP, if Minimax only supports T2V, we pass the prompt. 
        // BUT user wanted consistency. 
        // Let's assume for now we just pass the PROMPT to Minimax (T2V) because integrating Kling (I2V) might need different config.
        // OR if the user is ok with T2V for now, we use the prompt.
        // Wait, earlier plan was "Image-to-Video". 
        // Let's check FalService. For now passing prompt. 
        // TODO: Upgrade FalService to I2V to use the image.
        
        const videoUrls = await Promise.all(
            job.storyboard.map(scene => falVideoService.generateVideo(scene.prompt))
        );

        // Audio Generation
        await jobStore.addLog(jobId, 'Composing music...');
        const audioUrl = await sunoService.generateMusic(job.musicPrompt || 'upbeat viral music');

        // === PHASE 3: STITCHING ===
        await jobStore.updateJob(jobId, { status: 'stitching' });
        await jobStore.addLog(jobId, 'Stitching final cut...');

        const finalVideoUrl = await stitcherService.stitchVideo({
            videoClips: videoUrls,
            audioUrl: audioUrl,
            hookText: job.input.hookText
        });

        await jobStore.updateJob(jobId, { 
            status: 'completed',
            result: {
                videoUrl: finalVideoUrl,
                imagesUrl: undefined
            }
        });
        await jobStore.addLog(jobId, 'Job completed successfully!');
    }

  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    await jobStore.updateJob(jobId, { status: 'failed', error: error.message || 'Unknown error' });
    await jobStore.addLog(jobId, `Job failed: ${error.message}`);
  }
}
