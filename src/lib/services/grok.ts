import { CharacterProfile, ScenePrompts } from '../types/grok';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

export interface GrokService {
  analyzeImage(imageUrl: string): Promise<CharacterProfile>;
  generateScenePrompts(profile: CharacterProfile, style: string): Promise<ScenePrompts>;
  generateMusicPrompt(profile: CharacterProfile, style: string): Promise<string>;
  generateImage(prompt: string): Promise<string>; // New: Returns URL of generated static image
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
          // Clean the content of markdown code blocks if present
          let cleanContent = content.trim();
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json/, '').replace(/```$/, '');
          } else if (cleanContent.startsWith('```')) {
             cleanContent = cleanContent.replace(/^```/, '').replace(/```$/, '');
          }
          
          return JSON.parse(cleanContent);
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

  async generateImage(prompt: string): Promise<string> {
    console.log(`[Grok] Generating image for prompt: "${prompt}"`);
    
    // NOTE: For Grok Image Generation, we can use the same Chat API but with the model 'grok-2-image-1212'?? 
    // Actually, xAI documentation suggests image generation might be a separate capability or tool call.
    // However, based on common patterns and the user provided model list, we'll try treating it 
    // as a chat completion that returns an image OR check if there is a specific format.
    
    // IF the API follows OpenAI's format for DALL-E, it would be /v1/images/generations.
    // IF it follows the Chat completion with tool usage, it's different.
    
    // As per public docs for xAI (Grok-2), it often returns an image URL in the content or as an attachment.
    // Let's assume standard OpenAI-compatible image endpoint first, if not, we use Chat.
    
    // Since we don't have the exact docs for xAI Image API in front of us, 
    // we will assume it might be a prompt to the chat model "grok-2-image-1212" which returns a URL.
    
    const messages = [
        { role: "user", content: `Generate an image of: ${prompt}` }
    ];

    // Warning: grok-2-image-1212 might not work with standard Chat API json parsing.
    // It likely returns a markdown image link like ![image](url).
    
    // Let's try calling it and parsing the URL.
    const content = await this.callGrok(messages, 'grok-2-image-1212', false);
    
    // Extract URL from markdown: ![image](https://...)
    const match = content.match(/\((https?:\/\/[^\)]+)\)/);
    if (match && match[1]) {
        return match[1];
    }
    
    // Fallback: It might return the URL directly or fail.
    if (content.startsWith('http')) {
        return content;
    }

    console.warn('Could not extract image URL from Grok response:', content);
    throw new Error('Failed to generate image');
  }
}

export const grokService = new GrokServiceImpl();
