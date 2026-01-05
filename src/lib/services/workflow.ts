import { jobStore } from './jobStore';
import { grokService } from './grok';
import { sunoService } from './suno';
import { stitcherService } from './stitcher';

// This function orchestrates the entire AI video creation process
export async function startWorkflow(jobId: string) {
  const job = jobStore.getJob(jobId);
  if (!job) return;

  try {
    // 1. Analyze Image
    jobStore.updateJob(jobId, { status: 'analyzing' });
    jobStore.addLog(jobId, 'Starting image analysis with Grok Vision...');
    
    // Use the actual service (mocked internally)
    const profile = await grokService.analyzeImage(job.input.imageUrl || 'placeholder_image');
    jobStore.addLog(jobId, `Analysis complete: ${profile.perceived_vibe}`);

    // 2. Generate Scenes & Music Prompts
    jobStore.updateJob(jobId, { status: 'generating_scenes' });
    jobStore.addLog(jobId, 'Expanding prompts and planning scenes...');
    
    const scenePrompts = await grokService.generateScenePrompts(profile, job.input.style);
    const musicPrompt = await grokService.generateMusicPrompt(profile, job.input.style);
    
    jobStore.addLog(jobId, `Generated ${scenePrompts.scenes.length} scene prompts.`);

    // 3. Generate Assets (Parallel: Video & Audio)
    jobStore.updateJob(jobId, { status: 'composing_music' }); 
    jobStore.addLog(jobId, 'Generating video clips and music...');
    
    // Parallel execution
    const [videoUrls, audioUrl] = await Promise.all([
      // Video generation (6 clips in parallel)
      Promise.all(scenePrompts.scenes.map(prompt => grokService.generateVideo(prompt))),
      // Audio generation
      sunoService.generateMusic(musicPrompt)
    ]);

    jobStore.addLog(jobId, 'Assets generated successfully.');

    // 4. Stitching
    jobStore.updateJob(jobId, { status: 'stitching' });
    jobStore.addLog(jobId, 'Stitching clips and overlaying audio...');
    
    const finalVideoUrl = await stitcherService.stitchVideo({
      videoClips: videoUrls,
      audioUrl: audioUrl,
      hookText: job.input.hookText
    });

    // 5. Complete
    jobStore.updateJob(jobId, { 
      status: 'completed',
      result: {
        videoUrl: finalVideoUrl,
        imagesUrl: undefined // TODO: Zip raw images/videos if needed
      }
    });
    jobStore.addLog(jobId, 'Job completed successfully!');

  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    jobStore.updateJob(jobId, { status: 'failed', error: error.message || 'Unknown error' });
    jobStore.addLog(jobId, `Job failed: ${error.message}`);
  }
}
