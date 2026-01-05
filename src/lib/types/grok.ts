export interface CharacterProfile {
  gender: string;
  physical_description: string;
  perceived_vibe: string;
}

export interface ScenePrompts {
  scenes_en: string[]; // Array of prompts (English, model-friendly)
  scenes_localized: string[]; // Same prompts localized to target language
}
