export interface CharacterProfile {
  gender: string;
  age: string;
  hair_style: string;
  clothing_detailed: string;
  vibe: string;
}

export interface DirectorScript {
  scenes: string[]; // 6 image prompts
  overlays: string[]; // 6 short text hooks
  suno_prompt: string;
}

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

export interface GrokService {
  analyzeImage(imageUrl: string): Promise<CharacterProfile>;
  generateDirectorScript(profile: CharacterProfile, style: string): Promise<DirectorScript>;
  generateImage(prompt: string): Promise<string>; // Returns URL of generated image
}

class GrokServiceImpl implements GrokService {
  
  private async callGrokChat(messages: any[], model: string = 'grok-2-vision-1212'): Promise<any> {
    if (!GROK_API_KEY) {
      console.warn('GROK_API_KEY missing. Returning null mock.');
      return null;
    }

    try {
      const res = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: false,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`Grok API Error: ${res.statusText}`);
      }

      const data = await res.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.error('Grok Call Failed', e);
      return null;
    }
  }

  async analyzeImage(imageUrl: string): Promise<CharacterProfile> {
    console.log(`[Grok] Analyzing image: ${imageUrl.substring(0, 30)}...`);
    
    // In real implementation:
    // const content = [
    //   { type: "text", text: "Analyze this image. Output strictly valid JSON. Fields: 'gender', 'age', 'hair_style', 'clothing_detailed', 'vibe'." },
    //   { type: "image_url", image_url: { url: imageUrl } }
    // ];
    // const result = await this.callGrokChat([{ role: "user", content }], 'grok-2-vision-1212');
    
    // Mock response for now
    await new Promise(r => setTimeout(r, 1500));
    return {
      gender: 'female',
      age: '20s',
      hair_style: 'neon blue bob cut',
      clothing_detailed: 'black leather jacket with LED strips',
      vibe: 'cyberpunk rebel'
    };
  }

  async generateDirectorScript(profile: CharacterProfile, style: string): Promise<DirectorScript> {
    console.log(`[Grok] Generating script for style: ${style}`);
    
    const characterDesc = `A ${profile.age} ${profile.gender}, ${profile.hair_style}, wearing ${profile.clothing_detailed}, ${profile.vibe} vibe.`;
    
    const systemPrompt = `You are a viral TikTok director. Based on the character description, generate a JSON object containing:
    - scenes: Array of 6 image prompts. Requirement: Every prompt MUST start with the character description exactly to ensure consistency.
    - overlays: Array of 6 short text hooks (max 5 words) for each scene.
    - suno_prompt: A musical style description (e.g., 'Phonk, high bpm, aggressive').`;

    const userPrompt = `Character: ${characterDesc}\nStyle: ${style}\nOutput JSON only.`;

    // Real call would involve parsing the JSON response
    // const result = await this.callGrokChat([{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], 'grok-2');
    
    await new Promise(r => setTimeout(r, 1500));
    
    return {
      scenes: [
        `${characterDesc} standing in a rainy neon street, cinematic lighting, 8k.`,
        `${characterDesc} sitting in a futuristic cafe, looking out the window, melancholic.`,
        `${characterDesc} riding a high-tech motorcycle through a tunnel, motion blur.`,
        `${characterDesc} hacking into a holographic terminal, intense focus.`,
        `${characterDesc} walking away from an explosion, cool guy don't look at explosion style.`,
        `${characterDesc} staring directly at camera, breaking the fourth wall, smirk.`
      ],
      overlays: [
        "It started with a glitch...",
        "Then everything changed.",
        "Speed was the only escape.",
        "The system fought back.",
        "But I survived.",
        "Are you ready?"
      ],
      suno_prompt: "Cyberpunk Phonk, heavy bass, 140bpm, aggressive synthesizer, drift phonk style."
    };
  }

  async generateImage(prompt: string): Promise<string> {
    console.log(`[Grok] Generating image for prompt: "${prompt.substring(0, 30)}..."`);
    // TODO: Use grok-2-image API if available, or fallback to DALLE/Midjourney via proxy if Grok image API isn't public yet.
    // The user specified "Grok Imagine" (grok-2-image).
    
    // Mock response
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Return a random high-quality placeholder image
    const randomId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/seed/${randomId}/1080/1920`; 
  }
}

export const grokService = new GrokServiceImpl();
