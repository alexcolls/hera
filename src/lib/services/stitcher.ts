import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { storageService } from './storage';
import { v4 as uuidv4 } from 'uuid';

export interface StitchOptions {
  imageUrls: string[]; // 6 Images
  audioUrl: string;    // 1 Audio
  overlays: string[];  // 6 Text hooks
  outputPath?: string; // Optional local output path
}

export interface StitcherService {
  stitchVideo(options: StitchOptions): Promise<string>; // Returns URL of final video
}

class RealStitcherService implements StitcherService {
  
  private async downloadToTemp(url: string, ext: string): Promise<string> {
    try {
        const buffer = await storageService.downloadFile(url);
        const tempPath = path.join(os.tmpdir(), `${uuidv4()}.${ext}`);
        await fs.promises.writeFile(tempPath, buffer);
        return tempPath;
    } catch (e) {
        console.error(`Failed to download ${url}`, e);
        throw e;
    }
  }

  private async createClipFromImage(imagePath: string, text: string, duration: number = 5): Promise<string> {
    const outputPath = path.join(os.tmpdir(), `clip_${uuidv4()}.mp4`);
    
    return new Promise((resolve, reject) => {
        // FFmpeg Ken Burns Effect (ZoomPan)
        // zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'
        // d=125 (125 frames @ 25fps = 5 seconds)
        // scale=1080:1920 ensures output is strictly 9:16
        
        let command = ffmpeg(imagePath)
            .inputOptions(['-loop 1', `-t ${duration}`]) // Loop image for duration
            .complexFilter([
                // Zoom in
                `zoompan=z='min(zoom+0.0015,1.5)':d=${duration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920`,
                // Draw text (optional - might skip if font issues arise in serverless)
                // We'll try to add simple text. If it fails, catch it? No, fluent-ffmpeg usually crashes.
                // Using generic font or skipping text for safety in MVP if font file missing.
                // On Linux servers, /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf usually exists.
                // Or we can just overlay without specifying fontfile and hope ffmpeg defaults work (often needs fontconfig).
                `drawtext=text='${text.replace(/'/g, '')}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h-300:shadowcolor=black:shadowx=2:shadowy=2`
            ])
            .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-r 25'
            ])
            .output(outputPath);
            
        command.on('end', () => resolve(outputPath))
               .on('error', (err) => {
                   console.error(`Clip generation failed for ${imagePath}:`, err);
                   // Fallback without text if text caused it?
                   reject(err);
               })
               .run();
    });
  }

  async stitchVideo(options: StitchOptions): Promise<string> {
    console.log('[Stitcher] Starting video assembly with images...');
    
    // Check for mocks
    if (options.imageUrls[0].includes('picsum') || options.imageUrls[0].includes('mock')) {
       // We can still process picsum images with real ffmpeg!
       console.log('[Stitcher] Using placeholder images, proceeding with real FFmpeg processing...');
    }
    
    const tempFiles: string[] = [];
    
    try {
      // 1. Download Assets
      console.log('[Stitcher] Downloading assets...');
      const imagePaths = await Promise.all(options.imageUrls.map(url => this.downloadToTemp(url, 'jpg')));
      tempFiles.push(...imagePaths);
      
      const audioPath = await this.downloadToTemp(options.audioUrl, 'mp3');
      tempFiles.push(audioPath);

      // 2. Create Clips (Parallel)
      console.log('[Stitcher] Generating clips with Ken Burns effect...');
      const clipPromises = imagePaths.map((img, i) => 
          this.createClipFromImage(img, options.overlays[i] || '', 5)
      );
      const clipPaths = await Promise.all(clipPromises);
      tempFiles.push(...clipPaths);

      // 3. Concat Clips & Add Audio
      console.log('[Stitcher] Concatenating clips...');
      const outputPath = path.join(os.tmpdir(), `final_${uuidv4()}.mp4`);
      tempFiles.push(outputPath);

      return new Promise((resolve, reject) => {
        const command = ffmpeg();
        
        // Add all clips
        clipPaths.forEach(clip => command.input(clip));
        
        // Add Audio
        command.input(audioPath);

        // Concat Filter
        // [0:v][1:v]...concat=n=6:v=1:a=0[outv]
        const videoInputs = clipPaths.map((_, i) => `[${i}:v]`).join('');
        
        command.complexFilter([
            `${videoInputs}concat=n=${clipPaths.length}:v=1:a=0[vconcat]`,
            // Mix audio: Simply map the audio input. 
            // We should ensure audio duration matches video.
            // video is 6 clips * 5s = 30s.
            // audio might be longer/shorter. -shortest handles it.
            // Also need to volume adjustment if we had voiceover.
        ])
        .outputOptions([
            '-map [vconcat]',
            `-map ${clipPaths.length}:a`, // Audio is the last input
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-shortest'
        ])
        .output(outputPath)
        .on('end', async () => {
            console.log('[Stitcher] Final assembly finished!');
            try {
                const fileBuffer = await fs.promises.readFile(outputPath);
                const url = await storageService.uploadFile(fileBuffer, path.basename(outputPath), 'video/mp4');
                resolve(url);
            } catch (e) { reject(e); }
        })
        .on('error', (err) => reject(err))
        .run();
      });

    } catch (error) {
      console.error('[Stitcher] Fatal error:', error);
      throw error;
    } finally {
        // Cleanup temp files
        // Promise.all(tempFiles.map(f => fs.promises.unlink(f).catch(() => {})));
    }
  }
}

export const stitcherService = new RealStitcherService();
