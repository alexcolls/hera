import { CharacterProfile, ScenePrompts } from '../types/grok';
import { AppLanguage, getLanguageNameForPrompt } from '../i18n';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;
const GROK_CHAT_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_IMAGE_URL = 'https://api.x.ai/v1/images/generations';

export interface GrokService {
  analyzeImage(imageUrl: string, model?: string): Promise<CharacterProfile>;
  generateScenePrompts(profile: CharacterProfile, style: string, genre: string, sceneCount: number, language: AppLanguage, model?: string): Promise<ScenePrompts>;
  generateNarrative(profile: CharacterProfile, genre: string, sceneCount: number, scenes: string[], language: AppLanguage, model?: string): Promise<string>;
  generateMusicPrompt(profile: CharacterProfile, style: string, model?: string): Promise<string>;
  generateImage(prompt: string, model?: string): Promise<string>; // Returns URL of generated static image
}

class GrokServiceImpl implements GrokService {
  
  private async callGrokChat<T = string>(
    messages: unknown[],
    model: string = 'grok-2-latest',
    jsonMode: boolean = false,
    timeoutMs: number = 120_000
  ): Promise<T> {
    if (!GROK_API_KEY) {
      console.warn('GROK_API_KEY not found');
      throw new Error('GROK_API_KEY is missing');
    }

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.7,
      stream: false
    };

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(GROK_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Grok API Error (${response.status}):`, errorText);
        throw new Error(`Grok API Error: ${response.statusText}`);
      }

      const data: unknown = await response.json();
      const content = (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content;
      
      if (jsonMode) {
        try {
          let cleanContent = (content ?? '').trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json/, '').replace(/```$/, '');
          } else if (cleanContent.startsWith('```')) {
             cleanContent = cleanContent.replace(/^```/, '').replace(/```$/, '');
          }
          
          return JSON.parse(cleanContent) as T;
        } catch {
          console.error('Failed to parse JSON from Grok:', content);
          throw new Error('Invalid JSON response from Grok');
        }
      }
      
      return content as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Grok request timed out');
      }
      console.error('Call to Grok Chat failed:', error);
      throw error;
    }
  }

  async analyzeImage(imageUrl: string, model: string = 'grok-2-vision-1212'): Promise<CharacterProfile> {
    console.log(`[Grok] Analyzing image: ${imageUrl}`);
    
    const messages = [
      {
        role: "system",
        content: "You are an expert visual analyst for film casting. Your job is to create precise character descriptions for image generation consistency."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this person. Return a JSON with exactly these fields: 'gender', 'physical_description', and 'perceived_vibe' (3 adjectives). IMPORTANT: 'physical_description' must be a highly detailed visual prompt describing the face, hair, age, ethnicity, and clothing. Focus on distinctive facial features (e.g., 'sharp jawline', 'almond-shaped hazel eyes', 'scar on left cheek') to ensure the character looks exactly the same in future generations." },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ];

    return this.callGrokChat<CharacterProfile>(messages, model, true);
  }

  async generateScenePrompts(profile: CharacterProfile, style: string, genre: string, sceneCount: number, language: AppLanguage, model: string = 'grok-2-latest'): Promise<ScenePrompts> {
    console.log(`[Grok] Generating ${sceneCount} scene prompts for style: ${style}, genre: ${genre}, lang: ${language}`);
    const languageName = getLanguageNameForPrompt(language);
    
    const messages = [
      {
        role: "system",
        content: `You are an expert AI Video Prompt Engineer and Screenwriter. 
        Your goal is to take a character description, a style, and a genre, and generate a coherent ${sceneCount}-scene storyboard.
        
        CRITICAL RULES:
        1. Style: Apply the "${style}" aesthetic to every scene (lighting, camera angles, environment).
        2. Story Arc: The ${sceneCount} scenes must tell a coherent mini-story following the structure of the ${genre} genre.
        3. Format: Return a JSON object with exactly these keys:
           - "scenes_en": array of exactly ${sceneCount} strings (English, model-friendly)
           - "scenes_localized": array of exactly ${sceneCount} strings (same meaning, translated to ${languageName})
        
        IMPORTANT: In each prompt, return descriptive scene prompts.
        Example: "A cinematic shot of a person walking through a neon-lit alleyway, looking over shoulder in fear, high contrast lighting."
        Do NOT include the specific character physical details, just refer to 'a person' or 'the character' if needed, or focus on the environment/action.
        The system will handle character identity via an image reference.`
      },
      {
        role: "user",
        content: `Character Vibe: ${profile.perceived_vibe}
        Target Style: ${style}
        Genre: ${genre}
        Scene Count: ${sceneCount}
        
        Generate ${sceneCount} scene prompts that tell a short visual story.
        Focus on the ACTION and ENVIRONMENT.
        
        Return both English and ${languageName} versions as specified.`
      }
    ];

    const raw = await this.callGrokChat<unknown>(messages, model, true);
    const obj = raw as Partial<ScenePrompts> & { scenes?: unknown };

    const scenesEn = Array.isArray(obj?.scenes_en) ? obj.scenes_en : Array.isArray(obj?.scenes) ? (obj.scenes as string[]) : null;
    const scenesLocalized = Array.isArray(obj?.scenes_localized) ? obj.scenes_localized : scenesEn;

    if (!scenesEn || scenesEn.length !== sceneCount) {
      throw new Error('Invalid scene prompts response from Grok');
    }

    return {
      scenes_en: scenesEn,
      scenes_localized: (scenesLocalized ?? scenesEn).slice(0, sceneCount),
    };
  }

  async generateNarrative(profile: CharacterProfile, genre: string, sceneCount: number, scenes: string[], language: AppLanguage, model: string = 'grok-2-latest'): Promise<string> {
      console.log(`[Grok] Generating narrative script lang=${language}`);
      const languageName = getLanguageNameForPrompt(language);
      const messages = [
          {
            role: "system",
            content: `You are an expert Voiceover Scriptwriter. Write a short, engaging script that narrates the visual story described in the scenes. Write the final script in ${languageName}.`
          },
          {
            role: "user",
            content: `Genre: ${genre}
            Character Vibe: ${profile.perceived_vibe}
            Scenes: 
            ${scenes.map((s, i) => `${i+1}. ${s}`).join('\n')}
            
            Write a cohesive narration script (max 3-4 sentences) that ties these scenes together into a viral video story. 
            Do not include scene numbers or stage directions. Just the spoken text.
            Output language: ${languageName}.`
          }
      ];
      return this.callGrokChat<string>(messages, model, false);
  }

  async generateMusicPrompt(profile: CharacterProfile, style: string, model: string = 'grok-2-latest'): Promise<string> {
    console.log(`[Grok] Generating music prompt for vibe: ${profile.perceived_vibe}`);
    
    const messages = [
      {
        role: "system",
        content: "You are an expert Music Producer for viral short-form videos."
      },
      {
        role: "user",
        content: `Create a concise, high-quality AI music generation prompt for a video with this character and vibe.
        
        Character Vibe: ${profile.perceived_vibe}
        Style: ${style}
        
        The prompt should include: Genre, BPM, Instrumentation, and Mood. 
        Keep it under 20 words. Return ONLY the prompt text.`
      }
    ];

    return this.callGrokChat<string>(messages, model, false);
  }

  async generateImage(prompt: string, model: string = 'grok-2-image-1212'): Promise<string> {
    console.log(`[Grok] Generating image for prompt: "${prompt}"`);
    
    if (!GROK_API_KEY) {
        throw new Error('GROK_API_KEY is missing');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

      const response = await fetch(GROK_IMAGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify({
          model,
          prompt: prompt,
          n: 1,
          response_format: 'url' 
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Grok Image API Error (${response.status}):`, errorText);
            throw new Error(`Grok Image API Error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.data && data.data[0] && data.data[0].url) {
            return data.data[0].url;
        }
        
        throw new Error('No image URL in response');

    } catch (error) {
        console.error('Call to Grok Image API failed:', error);
        throw error;
    }
  }
}

export const grokService = new GrokServiceImpl();
