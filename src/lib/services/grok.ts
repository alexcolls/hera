import { CharacterProfile, ScenePrompts } from '../types/grok';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

export interface GrokService {
  analyzeImage(imageUrl: string): Promise<CharacterProfile>;
  generateScenePrompts(profile: CharacterProfile, style: string): Promise<ScenePrompts>;
  generateMusicPrompt(profile: CharacterProfile, style: string): Promise<string>;
  generateVideo(prompt: string): Promise<string>; // Returns URL of generated video
}

class GrokServiceImpl implements GrokService {
  
  private async callGrok(messages: any[], model: string = 'grok-2-latest', jsonMode: boolean = false): Promise<any> {
    if (!GROK_API_KEY) {
      console.warn('GROK_API_KEY not found');
      throw new Error('GROK_API_KEY is missing');
    }

    const body: any = {
      model,
      messages,
      temperature: 0.7,
      stream: false
    };

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Grok API Error (${response.status}):`, errorText);
        throw new Error(`Grok API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (jsonMode) {
        try {
          return JSON.parse(content);
        } catch (e) {
          console.error('Failed to parse JSON from Grok:', content);
          throw new Error('Invalid JSON response from Grok');
        }
      }
      
      return content;
    } catch (error) {
      console.error('Call to Grok failed:', error);
      throw error;
    }
  }

  async analyzeImage(imageUrl: string): Promise<CharacterProfile> {
    console.log(`[Grok] Analyzing image: ${imageUrl}`);
    
    const messages = [
      {
        role: "system",
        content: "You are an expert visual analyst for film and media. Analyze the image and extract key character details in JSON format."
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this person. Return a JSON with exactly these fields: 'gender', 'physical_description' (detailed visual description of face, hair, clothes), and 'perceived_vibe' (3 adjectives)." },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ];

    // Using grok-2-vision-1212 for vision capabilities
    return this.callGrok(messages, 'grok-2-vision-1212', true);
  }

  async generateScenePrompts(profile: CharacterProfile, style: string): Promise<ScenePrompts> {
    console.log(`[Grok] Generating scene prompts for style: ${style}`);
    
    const messages = [
      {
        role: "system",
        content: `You are an expert AI Video Prompt Engineer. 
        Your goal is to take a character description and a style, and generate 6 distinct, viral-worthy video scene prompts.
        
        CRITICAL RULES:
        1. "Prompt Locking": Every single scene prompt MUST start with the exact character description to ensure consistency.
        2. Style: Apply the "${style}" aesthetic to every scene (lighting, camera angles, environment).
        3. Format: Return a JSON object with a "scenes" array containing 6 strings.`
      },
      {
        role: "user",
        content: `Character: ${profile.physical_description}
        Vibe: ${profile.perceived_vibe}
        Target Style: ${style}
        
        Generate 6 scene prompts.`
      }
    ];

    return this.callGrok(messages, 'grok-2-latest', true);
  }

  async generateMusicPrompt(profile: CharacterProfile, style: string): Promise<string> {
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

    return this.callGrok(messages, 'grok-2-latest', false);
  }

  async generateVideo(prompt: string): Promise<string> {
    console.log(`[Grok] Generating video for prompt: "${prompt}"`);
    // NOTE: At this moment, xAI does not have a public Video Generation API (Imagine is internal or image-only).
    // For this MVP, we will stick to the MOCK/Placeholder for the actual video asset, 
    // but we use the Real Logic to generate the *prompts* above.
    
    // In a real production app, we would call:
    // 1. Luma Dream Machine API
    // 2. RunwayML API
    // 3. Kling AI
    
    // Simulating delay for realism in the UI
    await new Promise(resolve => setTimeout(resolve, 3000)); 
    
    // Returning a random stock video to make the "Stitcher" have something to work with.
    // We'll rotate through a few to make it feel dynamic.
    const stockVideos = [
      'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-lights-at-night-4261-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1610-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-blue-graphs-996-large.mp4',
      'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-white-network-connection-background-3047-large.mp4'
    ];
    
    return stockVideos[Math.floor(Math.random() * stockVideos.length)];
  }
}

export const grokService = new GrokServiceImpl();
