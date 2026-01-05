import { jobStore } from './jobStore';
import { grokService } from './grok';
import { sunoService } from './suno';
import { stitcherService } from './stitcher';
import { falService } from './fal';
import { elevenLabsService } from './elevenlabs';
import { Scene, JobStatus } from '../types/job';
import { v4 as uuidv4 } from 'uuid';

export async function startWorkflow(jobId: string, resumeStatus?: JobStatus) {
  const job = await jobStore.getJob(jobId);
  if (!job) return;
  const language = job.input?.language ?? 'en';
  const models = job.input?.models ?? {};
  const addI18nLog = (key: string, vars?: Record<string, string | number>) =>
    jobStore.addLog(jobId, { key, vars, ts: Date.now() });

  try {
    // === PHASE 1: ANALYSIS & STORYBOARD (Start) ===
    if (!resumeStatus || resumeStatus === 'pending') {
        // 1. Analyze Image
        await jobStore.updateJob(jobId, { status: 'analyzing' });
        await addI18nLog('log.startingImageAnalysis');
        
        const profile = await grokService.analyzeImage(job.input.imageUrl || 'placeholder_image', models.grokVisionModel);
        await addI18nLog('log.analysisComplete', { vibe: profile.perceived_vibe });

        // 2. Generate Prompts (Story)
        await jobStore.updateJob(jobId, { status: 'generating_storyboard' });
        await addI18nLog('log.generatingStoryAndPrompts');
        
        const scenePrompts = await grokService.generateScenePrompts(
            profile, 
            job.input.style, 
            job.input.genre, 
            job.input.sceneCount,
            language,
            models.grokChatModel
        );

        // Pre-generate audio prompts/scripts here to save time later, or do it in parallel
        let musicPrompt = undefined;
        let narrativePrompt = undefined;

        if (job.input.audioType === 'music') {
             musicPrompt = await grokService.generateMusicPrompt(profile, job.input.style, models.grokChatModel);
        } else {
             // Generate narrative script based on the scene prompts
             narrativePrompt = await grokService.generateNarrative(
                 profile, 
                 job.input.genre, 
                 job.input.sceneCount, 
                 scenePrompts.scenes_en,
                 language,
                 models.grokChatModel
            );
        }

        // 3. Generate Static Images (Storyboard)
        await addI18nLog('log.generatingStoryboardImages');
        
        const scenes: Scene[] = scenePrompts.scenes_en.map((promptEn, idx) => {
            // User requested to remove physical description as we use Image Reference (PuLID)
            // Just use the scene action prompt directly.
            const localized = scenePrompts.scenes_localized?.[idx];
            return {
                id: uuidv4(),
                prompt: language === 'en'
                  ? promptEn
                  : `${localized || promptEn}\n(English guidance: ${promptEn})`,
                localizedPrompt: localized,
                status: 'pending'
            };
        });

        // Save initial empty storyboard
        await jobStore.updateJob(jobId, { 
            storyboard: scenes,
            musicPrompt,
            narrativePrompt
        });

        // Generate images sequentially (1-by-1) so logs match user expectations
        for (let idx = 0; idx < scenes.length; idx++) {
            await addI18nLog('log.generatingImage', { index: idx + 1, total: scenes.length });
            try {
                scenes[idx].status = 'generating_image';
                await jobStore.updateJob(jobId, { storyboard: scenes });
                
                let imageUrl: string;
                if (job.input.imageUrl) {
                    imageUrl = await falService.generateImage(scenes[idx].prompt, job.input.imageUrl, models.falImageModel);
                } else {
                    imageUrl = await grokService.generateImage(scenes[idx].prompt, models.grokImageModel);
                }
                
                scenes[idx].imageUrl = imageUrl;
                scenes[idx].status = 'image_ready';
            } catch (err) {
                console.error(`Failed to generate image for scene ${idx}:`, err);
                scenes[idx].status = 'failed';
            }

            await jobStore.updateJob(jobId, { storyboard: scenes });
        }

        // STOP HERE for User Approval
        await jobStore.updateJob(jobId, { 
            status: 'waiting_for_storyboard_approval', 
            storyboard: scenes 
        });
        await addI18nLog('log.storyboardReadyWaitingApproval');
        return;
    }

    // === PHASE 2: VIDEO GENERATION (Resumed after Storyboard Approval) ===
    if (resumeStatus === 'generating_video') {
        if (!job.storyboard || job.storyboard.length === 0) {
            throw new Error('No storyboard found to animate');
        }

        await jobStore.updateJob(jobId, { status: 'generating_video' });
        await addI18nLog('log.generatingVideoClipsFromStoryboard');

        // In a real app, we would use Image-to-Video (I2V) here using the approved imageUrls.
        // Fal.ai Minimax/Kling/Runway support this.
        // For this MVP, we are still using Text-to-Video via Fal (Minimax/Haiper) OR purely T2V if strict I2V isn't set up.
        // BUT, since we used PuLID for images, to keep consistency we SHOULD use I2V.
        // FalService.generateVideo currently does T2V. 
        // We need to update FalService to support I2V or just use T2V for now.
        // Let's assume T2V for simplicity but using the detailed prompts we have.
        
        // Generate videos sequentially (1-by-1) so logs match user expectations and we persist per-scene progress.
        const updatedScenes = [...job.storyboard];
        for (let idx = 0; idx < updatedScenes.length; idx++) {
            await addI18nLog('log.generatingVideo', { index: idx + 1, total: updatedScenes.length });
            const scene = updatedScenes[idx];
            try {
                scene.status = 'generating_video';
                await jobStore.updateJob(jobId, { storyboard: updatedScenes });

                // Use Kling Image-to-Video if we have a generated image for the scene.
                const videoUrl = await falService.generateVideo(scene.prompt, scene.imageUrl, models.falVideoModel);

                scene.videoUrl = videoUrl;
                scene.status = 'video_ready';
            } catch (e) {
                console.error(`Failed video for scene ${idx}`, e);
                scene.status = 'failed';
            }

            await jobStore.updateJob(jobId, { storyboard: updatedScenes });
        }

        // Save Videos and STOP for Approval
        await jobStore.updateJob(jobId, { 
            status: 'waiting_for_video_approval',
            storyboard: updatedScenes
        });
        await addI18nLog('log.videosGeneratedWaitingApproval');
        return;
    }

    // === PHASE 3: AUDIO & STITCHING (Resumed after Video Approval) ===
    if (resumeStatus === 'generating_audio' || resumeStatus === 'stitching') {
        
        // Generate Audio
        await jobStore.updateJob(jobId, { status: 'generating_audio' });
        let audioUrl: string = '';

        if (job.input.audioType === 'narrative' && job.narrativePrompt) {
            await addI18nLog('log.generatingVoiceover');
            audioUrl = await elevenLabsService.generateSpeech(
              job.narrativePrompt,
              language,
              models.elevenlabsModelId,
              models.elevenlabsVoiceId
            );
        } else if (job.input.audioType === 'music' || job.musicPrompt) {
            await addI18nLog('log.composingMusic');
            audioUrl = await sunoService.generateMusic(job.musicPrompt || 'viral background music', models.sunoModel);
        } else {
             // Fallback
             audioUrl = await sunoService.generateMusic('upbeat background music', models.sunoModel);
        }

        // Stitching
        await jobStore.updateJob(jobId, { status: 'stitching' });
        await addI18nLog('log.stitchingFinalCut');

        // Collect valid video URLs
        const videoUrls = job.storyboard
            ?.filter(s => s.videoUrl && s.status === 'video_ready')
            .map(s => s.videoUrl!) || [];

        if (videoUrls.length === 0) {
            throw new Error('No valid video clips to stitch');
        }

        const finalVideoUrl = await stitcherService.stitchVideo({
            videoClips: videoUrls,
            audioUrl: audioUrl,
            // hookText deprecated
        });

        await jobStore.updateJob(jobId, { 
            status: 'completed',
            result: {
                videoUrl: finalVideoUrl,
                imagesUrl: undefined
            }
        });
        await addI18nLog('log.jobCompletedSuccessfully');
    }

  } catch (error: unknown) {
    console.error(`Job ${jobId} failed:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    await jobStore.updateJob(jobId, { status: 'failed', error: message });
    await addI18nLog('log.jobFailed', { error: message });
  }
}
