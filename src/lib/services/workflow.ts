import { jobStore } from './jobStore';
import { grokService } from './grok';
import { sunoService } from './suno';
import { stitcherService } from './stitcher';

// This function orchestrates the entire AI video creation process
export async function startWorkflow(jobId: string) {
  // Check if job exists (async now due to Redis)
  const job = await jobStore.getJob(jobId);
  if (!job) return;

  try {
    // 1. Analyze Image
    await jobStore.updateJob(jobId, { status: 'analyzing' });
    await jobStore.addLog(jobId, 'Starting image analysis with Grok Vision...');
    
    const profile = await grokService.analyzeImage(job.input.imageUrl || 'placeholder');
    await jobStore.addLog(jobId, `Analysis complete: ${profile.vibe}`);

    // 2. Generate Script (Scenes + Music Prompt)
    await jobStore.updateJob(jobId, { status: 'generating_scenes' });
    await jobStore.addLog(jobId, 'Directing viral video script...');
    
    const script = await grokService.generateDirectorScript(profile, job.input.style);
    await jobStore.addLog(jobId, `Script generated with ${script.scenes.length} scenes.`);

    // 3. Generate Assets (Parallel: Images & Audio)
    await jobStore.updateJob(jobId, { status: 'composing_music' }); 
    await jobStore.addLog(jobId, 'Generating high-res assets (6 Images + Suno Audio)...');
    
    const [imageUrls, audioUrl] = await Promise.all([
      // Image generation (6 images in parallel)
      Promise.all(script.scenes.map(prompt => grokService.generateImage(prompt))),
      // Audio generation
      sunoService.generateMusic(script.suno_prompt)
    ]);

    await jobStore.addLog(jobId, 'Assets generated successfully.');

    // 4. Stitching
    await jobStore.updateJob(jobId, { status: 'stitching' });
    await jobStore.addLog(jobId, 'Stitching images with Ken Burns effect and overlaying audio...');
    
    const finalVideoUrl = await stitcherService.stitchVideo({
      imageUrls: imageUrls,
      audioUrl: audioUrl,
      overlays: script.overlays,
      outputPath: undefined
    });

    // 5. Complete
    await jobStore.updateJob(jobId, { 
      status: 'completed',
      result: {
        videoUrl: finalVideoUrl,
        // TODO: Zip logic for imagesUrl
      }
    });
    await jobStore.addLog(jobId, 'Job completed successfully! Video is ready.');

  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    await jobStore.updateJob(jobId, { status: 'failed', error: error.message || 'Unknown error' });
    await jobStore.addLog(jobId, `Job failed: ${error.message}`);
  }
}
