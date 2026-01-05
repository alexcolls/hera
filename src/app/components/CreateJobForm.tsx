'use client';

import { useState, useRef } from 'react';
import { APP_LANGUAGES, AppLanguage } from '@/lib/i18n/i18n';
import { useI18n } from '@/lib/providers/i18n-provider';

export default function CreateJobForm({ onJobCreated }: { onJobCreated: (jobId: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sceneCount, setSceneCount] = useState(6);
  const { language, setLanguage, t } = useI18n();
  const [modelsOpen, setModelsOpen] = useState(false);

  const STYLES = [
    { id: 'photorealistic', labelKey: 'style.photorealistic.label', descKey: 'style.photorealistic.desc', keywords: '4k, 8k, hyper-realistic, macro photography, cinematic lighting' },
    { id: '3d_render', labelKey: 'style.3d_render.label', descKey: 'style.3d_render.desc', keywords: 'Unreal Engine 5, Octane Render, Ray Tracing, blender' },
    { id: 'anime', labelKey: 'style.anime.label', descKey: 'style.anime.desc', keywords: 'Studio Ghibli, Makoto Shinkai, cel shaded, vibrant colors' },
    { id: 'cyberpunk', labelKey: 'style.cyberpunk.label', descKey: 'style.cyberpunk.desc', keywords: 'Neon lights, futuristic, hightech, purple and blue palette' },
    { id: 'oil_painting', labelKey: 'style.oil_painting.label', descKey: 'style.oil_painting.desc', keywords: 'Impressionism, thick brushstrokes, palette knife' },
    { id: 'pixel_art', labelKey: 'style.pixel_art.label', descKey: 'style.pixel_art.desc', keywords: '8-bit, 16-bit, retro game, pixelated, sprite' },
    { id: 'watercolor', labelKey: 'style.watercolor.label', descKey: 'style.watercolor.desc', keywords: 'Soft edges, wet-on-wet, ink and wash, pastel colors' },
    { id: 'vector', labelKey: 'style.vector.label', descKey: 'style.vector.desc', keywords: 'Minimalist, clean lines, solid colors, 2D, vector illustration' },
    { id: 'surrealism', labelKey: 'style.surrealism.label', descKey: 'style.surrealism.desc', keywords: 'Salvador Dali, dreamscape, ethereal, mystical' },
    { id: 'low_poly', labelKey: 'style.low_poly.label', descKey: 'style.low_poly.desc', keywords: 'Geometric, polygons, faceted, sharp edges' }
  ];

  const GENRES = [
    { id: 'comedy', labelKey: 'genre.comedy.label', descKey: 'genre.comedy.desc' },
    { id: 'tragedy', labelKey: 'genre.tragedy.label', descKey: 'genre.tragedy.desc' },
    { id: 'thriller', labelKey: 'genre.thriller.label', descKey: 'genre.thriller.desc' },
    { id: 'romance', labelKey: 'genre.romance.label', descKey: 'genre.romance.desc' },
    { id: 'scifi', labelKey: 'genre.scifi.label', descKey: 'genre.scifi.desc' },
    { id: 'fantasy', labelKey: 'genre.fantasy.label', descKey: 'genre.fantasy.desc' },
    { id: 'mystery', labelKey: 'genre.mystery.label', descKey: 'genre.mystery.desc' },
    { id: 'horror', labelKey: 'genre.horror.label', descKey: 'genre.horror.desc' },
    { id: 'adventure', labelKey: 'genre.adventure.label', descKey: 'genre.adventure.desc' },
    { id: 'historical', labelKey: 'genre.historical.label', descKey: 'genre.historical.desc' }
  ];


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    
    // Validate file
    const file = formData.get('imageFile') as File;
    if (!file || file.size === 0) {
      setError(t('form.error.uploadImage'));
      setLoading(false);
      return;
    }

    try {
      // Send FormData directly (browser sets Content-Type to multipart/form-data)
      const res = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create job');
      }

      const { jobId } = await res.json();
      onJobCreated(jobId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-background p-8 border border-gray-200 dark:border-gray-800 rounded-none max-w-xl mx-auto animate-fade-in">

      {/* Language (affects UI + generation) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">
          {t('form.language')}
        </label>
        <input type="hidden" name="language" value={language} />
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('form.language')}>
          {APP_LANGUAGES.map((l) => {
            const active = l.code === language;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code as AppLanguage)}
                disabled={loading}
                aria-pressed={active}
                className={[
                  'border px-3 py-3 text-sm font-mono uppercase transition-all',
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-gray-300 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-500',
                  loading ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <span className="mr-2" aria-hidden="true">
                  {l.flag}
                </span>
                {l.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Image Upload Area */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">{t('form.targetSubject')}</label>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative w-full aspect-square md:aspect-video border-2 border-dashed 
            ${preview ? 'border-foreground' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'} 
            flex flex-col items-center justify-center cursor-pointer transition-colors group
          `}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-2 group-hover:text-foreground text-gray-500">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-mono uppercase">{t('form.clickToUploadImage')}</span>
            </div>
          )}
          <input 
            ref={fileInputRef}
            type="file" 
            name="imageFile" 
            accept="image/png, image/jpeg, image/webp" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Style Selection */}
      <div className="space-y-4">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">{t('form.videoStyle')}</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STYLES.map((style) => (
            <label key={style.id} className="cursor-pointer group">
              <input type="radio" name="style" value={style.id} className="peer hidden" defaultChecked={style.id === 'photorealistic'} />
              <div className="
                h-full border border-gray-300 dark:border-gray-800 p-4 transition-all
                peer-checked:bg-foreground peer-checked:text-background peer-checked:border-foreground
                hover:border-gray-400 dark:hover:border-gray-500
              ">
                <div className="font-bold uppercase text-sm mb-1">{t(style.labelKey)}</div>
                <div className="text-[10px] opacity-70 mb-2">{t(style.descKey)}</div>
                <div className="text-[10px] font-mono opacity-50">{style.keywords}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Genre Selection */}
      <div className="space-y-4">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">{t('form.storyGenre')}</label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {GENRES.map((genre) => (
            <label key={genre.id} className="cursor-pointer">
              <input type="radio" name="genre" value={genre.id} className="peer hidden" defaultChecked={genre.id === 'comedy'} />
              <div className="
                h-full border border-gray-300 dark:border-gray-800 p-2 text-center transition-all
                peer-checked:bg-foreground peer-checked:text-background peer-checked:border-foreground
                hover:border-gray-400 dark:hover:border-gray-500 flex flex-col justify-center
              ">
                <div className="font-bold uppercase text-[10px] mb-1">{t(genre.labelKey)}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Audio Type */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">{t('form.audioType')}</label>
        <div className="grid grid-cols-2 gap-4">
            <label className="cursor-pointer">
              <input type="radio" name="audioType" value="narrative" className="peer hidden" defaultChecked />
              <div className="
                border border-gray-300 dark:border-gray-800 p-4 text-center text-sm font-mono uppercase transition-all
                peer-checked:bg-foreground peer-checked:text-background peer-checked:border-foreground
              ">
                {t('form.audioType.narrative')}
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="audioType" value="music" className="peer hidden" />
              <div className="
                border border-gray-300 dark:border-gray-800 p-4 text-center text-sm font-mono uppercase transition-all
                peer-checked:bg-foreground peer-checked:text-background peer-checked:border-foreground
              ">
                {t('form.audioType.music')}
              </div>
            </label>
        </div>
      </div>

      {/* Scene Count */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-gray-500">
            {t('form.sceneCount', { count: sceneCount })}
        </label>
        <input 
            type="range" 
            name="sceneCount"
            min="2" 
            max="12" 
            value={sceneCount} 
            onChange={(e) => setSceneCount(Number(e.target.value))}
            className="w-full accent-foreground h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
            <span>{t('form.sceneCount.min')}</span>
            <span>{t('form.sceneCount.max')}</span>
        </div>
      </div>

      {/* Models (Advanced) */}
      <details
        open={modelsOpen}
        onToggle={(e) => setModelsOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="border border-gray-200 dark:border-gray-800"
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-foreground flex items-center justify-between">
          <span>Models</span>
          <span className="font-mono text-[10px] opacity-60">{modelsOpen ? 'HIDE' : 'SHOW'}</span>
        </summary>
        <div className="p-4 space-y-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-[10px] font-mono text-gray-500 leading-relaxed">
            Advanced: override which provider/model is used at each workflow step. Leave defaults if you’re not sure.
          </p>

          {/* Grok */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Grok (xAI)</div>

            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">Vision (image analysis)</div>
                <select
                  name="grokVisionModel"
                  defaultValue="grok-2-vision-1212"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                >
                  <option value="grok-2-vision-1212">grok-2-vision-1212 (default)</option>
                  <option value="grok-vision-beta">grok-vision-beta</option>
                </select>
              </label>

              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">Chat (storyboard/narrative prompts)</div>
                <select
                  name="grokChatModel"
                  defaultValue="grok-2-latest"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                >
                  <option value="grok-2-latest">grok-2-latest (default)</option>
                  <option value="grok-2">grok-2</option>
                  <option value="grok-beta">grok-beta</option>
                </select>
              </label>

              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">Image (fallback image generation)</div>
                <select
                  name="grokImageModel"
                  defaultValue="grok-2-image-1212"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                >
                  <option value="grok-2-image-1212">grok-2-image-1212 (default)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Fal */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Fal</div>

            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">Storyboard images</div>
                <select
                  name="falImageModel"
                  defaultValue="fal-ai/flux-pulid"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                >
                  <option value="fal-ai/flux-pulid">fal-ai/flux-pulid (default)</option>
                  <option value="fal-ai/flux/dev">fal-ai/flux/dev</option>
                  <option value="fal-ai/flux/schnell">fal-ai/flux/schnell</option>
                </select>
              </label>

              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">Scene video (image-to-video)</div>
                <select
                  name="falVideoModel"
                  defaultValue="fal-ai/kling-video/v1/standard/image-to-video"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                >
                  <option value="fal-ai/kling-video/v1/standard/image-to-video">fal-ai/kling-video/v1/standard/image-to-video (default)</option>
                  <option value="fal-ai/kling-video/v1/standard/text-to-video">fal-ai/kling-video/v1/standard/text-to-video</option>
                </select>
              </label>
            </div>
          </div>

          {/* ElevenLabs */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">ElevenLabs</div>
            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">TTS model</div>
                <select
                  name="elevenlabsModelId"
                  defaultValue="eleven_multilingual_v2"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                >
                  <option value="eleven_multilingual_v2">eleven_multilingual_v2 (default)</option>
                  <option value="eleven_turbo_v2_5">eleven_turbo_v2_5</option>
                  <option value="eleven_flash_v2">eleven_flash_v2</option>
                  <option value="eleven_monolingual_v1">eleven_monolingual_v1</option>
                </select>
              </label>
              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">Voice ID (optional override)</div>
                <input
                  name="elevenlabsVoiceId"
                  placeholder="21m00Tcm4TlvDq8ikWAM (default)"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                />
              </label>
            </div>
          </div>

          {/* Suno */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Suno</div>
            <div className="grid grid-cols-1 gap-3">
              <label className="space-y-1">
                <div className="text-[10px] font-mono text-gray-500">Music model</div>
                <select
                  name="sunoModel"
                  defaultValue="suno-v3.5"
                  className="w-full border border-gray-300 dark:border-gray-800 bg-background px-3 py-2 text-xs font-mono"
                  disabled={loading}
                >
                  <option value="suno-v3.5">suno-v3.5 (default)</option>
                  <option value="suno-v4">suno-v4</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </details>

      {error && <p className="text-red-500 text-xs font-mono border border-red-900 p-2 text-center">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full bg-foreground text-background font-black uppercase py-4 tracking-widest text-sm
          hover:opacity-90 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 transition-colors
        "
      >
        {loading ? t('form.submit.generating') : t('form.submit.ready')}
      </button>
    </form>
  );
}
