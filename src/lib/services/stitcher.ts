import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { storageService } from './storage';
import { v4 as uuidv4 } from 'uuid';

export interface StitchOptions {
  videoClips: string[]; // URLs of video clips
  audioUrl: string;     // URL of audio track
  hookText?: string;
  outputPath?: string; // Optional local output path
}

export interface StitcherService {
  stitchVideo(options: StitchOptions): Promise<string>; // Returns URL of final video
}

class RealStitcherService implements StitcherService {
  
  private async downloadToTemp(url: string, ext: string): Promise<string> {
    const buffer = await storageService.downloadFile(url);
    const tempPath = path.join(os.tmpdir(), `${uuidv4()}.${ext}`);
    await fs.promises.writeFile(tempPath, buffer);
    return tempPath;
  }

  async stitchVideo(options: StitchOptions): Promise<string> {
    console.log('[Stitcher] Starting video assembly...');
    
    const tempFiles: string[] = [];
    
    try {
      // 1. Download assets (Mock logic handles "fake" URLs by returning dummy buffers, 
      // but in real world we need valid video files for ffmpeg)
      // For this MVP demonstration, if we are in "mock" mode (detected by dummy URLs),
      // we might skip actual ffmpeg or fail. 
      // To make this robust for the user's plan, I'll add a check.
      
      // Removed the mock/mixkit check to force real FFmpeg processing
      // if (options.videoClips[0].includes('mock-storage') || options.videoClips[0].includes('mixkit')) { ... }

      console.log('[Stitcher] Downloading assets...');
      console.log(`[Stitcher] Video clips: ${options.videoClips.join(', ')}`);
      const videoPaths = await Promise.all(options.videoClips.map(url => this.downloadToTemp(url, 'mp4')));
      tempFiles.push(...videoPaths);
      
      const audioPath = await this.downloadToTemp(options.audioUrl, 'mp3');
      tempFiles.push(audioPath);

      const outputPath = path.join(os.tmpdir(), `output_${uuidv4()}.mp4`);
      tempFiles.push(outputPath);

      // 2. Build FFmpeg command
      return new Promise((resolve, reject) => {
        const command = ffmpeg();

        // Add inputs
        videoPaths.forEach(p => command.input(p));
        command.input(audioPath);

        // Complex Filter Graph
        // 1. Normalize each clip to consistent 9:16 resolution/fps
        // 2. Concat video streams
        // 3. Map external audio track
        
        const complexFilter: string[] = [];
        const videoOutputMap: string[] = [];

        videoPaths.forEach((_, index) => {
          // IMPORTANT:
          // `zoompan` is great for still images but can make real videos look like a single-frame zoom.
          // Here we keep the original motion and just normalize formats so concat works reliably.
          complexFilter.push(
            `[${index}:v]` +
              `scale=1080:1920:force_original_aspect_ratio=decrease,` +
              `pad=1080:1920:(ow-iw)/2:(oh-ih)/2,` +
              `setsar=1,` +
              `fps=30,` +
              `format=yuv420p,` +
              `setpts=PTS-STARTPTS` +
              `[v${index}]`
          );
          videoOutputMap.push(`[v${index}]`);
        });

        // Concat video streams
        const concatFilter = `${videoOutputMap.join('')}concat=n=${videoPaths.length}:v=1:a=0[vconcat]`;
        complexFilter.push(concatFilter);

        // Passing through [vconcat] as [vfinal] directly
        complexFilter.push(`[vconcat]null[vfinal]`);

        command
          .complexFilter(complexFilter)
          .outputOptions([
            '-map [vfinal]',     // Mapped video from filter
            `-map ${videoPaths.length}:a`, // Map the audio input (last input)
            '-c:v libx264',
            '-movflags +faststart',
            '-pix_fmt yuv420p',
            '-shortest' // Finish when the shortest stream ends (likely video or audio)
          ])
          .output(outputPath)
          .on('start', (cmdLine) => {
            console.log('[Stitcher] Spawned FFmpeg with command: ' + cmdLine);
          })
          .on('error', (err) => {
            console.error('[Stitcher] Error:', err);
            reject(err);
          })
          .on('end', async () => {
            console.log('[Stitcher] Processing finished!');
            try {
              // Upload result
              const fileBuffer = await fs.promises.readFile(outputPath);
              const url = await storageService.uploadFile(fileBuffer, path.basename(outputPath), 'video/mp4');
              resolve(url);
            } catch (uErr) {
              reject(uErr);
            } finally {
                // Clean up temp files
                // tempFiles.forEach(f => fs.unlink(f, () => {}));
            }
          });

        command.run();
      });

    } catch (error) {
      console.error('[Stitcher] Fatal error:', error);
      throw error;
    } finally {
       // Cleanup could happen here too
    }
  }
}

// Export the service
export const stitcherService = new RealStitcherService();
