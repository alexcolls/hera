// NEXT_PUBLIC_ELEVENLABS_KEY=...

const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice ID (Rachel - American, Professional)
// You can make this configurable later
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; 

export interface ElevenLabsService {
  generateSpeech(
    text: string,
    language?: 'en' | 'zh' | 'es',
    modelId?: string,
    voiceId?: string
  ): Promise<string>;
}

class ElevenLabsServiceImpl implements ElevenLabsService {
  
  async generateSpeech(
    text: string,
    language: 'en' | 'zh' | 'es' = 'en',
    modelId?: string,
    voiceId?: string
  ): Promise<string> {
    console.log(`[ElevenLabs] Generating speech for: "${text.substring(0, 50)}..."`);
    
    // Mock if no key
    if (!ELEVENLABS_API_KEY) {
        console.warn('ELEVENLABS_KEY not found. Returning mock audio.');
        // Return a dummy mp3 url (e.g. from a public test asset)
        return 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    }

    try {
      // Default to multilingual model so Chinese/Spanish work as expected.
      const chosenModelId = modelId || 'eleven_multilingual_v2';
      const chosenVoiceId = voiceId || DEFAULT_VOICE_ID;
      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${chosenVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: chosenModelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API Error: ${errorText}`);
      }

      // Convert blob to base64 or upload to storage
      // For now, let's assume we want to upload this Blob to our storage service 
      // But here we need to return a URL.
      // Since this runs on the server (in the workflow), we can't just return a Blob URL.
      // We need to upload it.
      
      const audioBuffer = await response.arrayBuffer();
      
      // We need to use the storage service here, but avoiding circular dependencies or complex imports if possible.
      // Ideally this service just returns the Buffer, and the workflow handles upload.
      // But to match the interface of other services returning URLs (like Suno/Fal), let's handle upload here?
      // Actually, Fal/Suno return a hosted URL. ElevenLabs returns binary.
      // Let's modify the interface to return Buffer, OR we inject StorageService.
      // For simplicity in this file, let's just return the buffer as a base64 data URI?
      // No, that's too heavy for a long audio.
      // Let's rely on the caller to upload, OR import storageService.
      
      // Let's import storageService dynamically or use it directly if it's safe.
      const { storageService } = await import('./storage');
      const filename = `narrative_${Date.now()}.mp3`;
      const url = await storageService.uploadFile(Buffer.from(audioBuffer), filename, 'audio/mpeg');
      
      return url;

    } catch (error) {
      console.error('ElevenLabs generation failed:', error);
      throw error;
    }
  }
}

export const elevenLabsService = new ElevenLabsServiceImpl();
