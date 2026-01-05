# HERA (v0.1.0)

HERA is a **Next.js “viral video engine”** that turns a single uploaded image into a short-form vertical video via an orchestrated, multi-step AI workflow:

- Analyze the subject (xAI Grok Vision)
- Generate storyboard prompts + images (Grok Chat + Fal Flux / PuLID)
- **Human-in-the-loop** storyboard approval
- Generate per-scene video clips (Fal Kling i2v/t2v)
- **Human-in-the-loop** video approval
- Generate audio (ElevenLabs TTS or music)
- Stitch the final cut (FFmpeg)

## Quickstart

```bash
npm install
# Create .env (see below)
npm run dev
```

Then open `http://localhost:3000`.

## Requirements

- **Node.js**: modern Node (project uses Next.js 16 / React 19)
- **FFmpeg** available on PATH (required for stitching via `fluent-ffmpeg`)
  - Ubuntu/Debian: `sudo apt-get update && sudo apt-get install -y ffmpeg`
  - macOS: `brew install ffmpeg`

## Environment variables

Create `.env` in the repo root.

```bash
cp .env.sample .env
```

Edit `.env` with your actual API keys.

### Required

- **`NEXT_PUBLIC_GROK_API_KEY`**: required (workflow will error without it)

### Optional (will fall back to mocks/placeholders)

- **`NEXT_PUBLIC_FAL_API_KEY`**: enables real Fal image/video generation
- **`NEXT_PUBLIC_ELEVENLABS_API_KEY`**: enables real ElevenLabs voiceover generation
- **`NEXT_PUBLIC_SUNO_API_KEY`**: currently not used (music generation is stubbed)

### Optional (enables persistence + real uploads)

If **both** of these are set, the app uses Supabase for job persistence and storage (recommended for real runs). Otherwise it falls back to an in-memory job store and mock “uploads”.

Note: in the current code, mock storage returns fake URLs and dummy file buffers, which is enough to demo the UI but **won’t complete a real end-to-end generation** (Grok can’t fetch the uploaded image, and FFmpeg can’t stitch dummy buffers).

- **`NEXT_PUBLIC_SUPABASE_URL`**
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**

## How it works

### App flow (UI)

1. Upload an image + choose:
   - language (`en`, `zh`, `es`)
   - style, genre, audio type, scene count
   - optional model overrides (advanced)
2. A job is created via `POST /api/jobs`
3. The UI polls `GET /api/jobs/:id` to render status + logs
4. When storyboard is ready: approve via `POST /api/jobs/:id/approve`
5. When videos are ready: approve via `POST /api/jobs/:id/approve-videos`

### Workflow phases (server)

Implemented in `src/lib/services/workflow.ts`:

- **Phase 1**: image analysis → storyboard prompts → storyboard images → wait for approval
- **Phase 2**: generate per-scene videos → wait for approval
- **Phase 3**: generate audio → stitch final MP4 → mark job completed

## API

### `POST /api/jobs`

Creates a job and starts Phase 1 asynchronously.

- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `imageFile` (required)
  - `language` (`en` | `zh` | `es`)
  - `style` (required)
  - `genre` (required)
  - `audioType` (`narrative` | `music`, required)
  - `sceneCount` (number, default 6)
  - optional model overrides: `grokVisionModel`, `grokChatModel`, `grokImageModel`, `falImageModel`, `falVideoModel`, `elevenlabsModelId`, `elevenlabsVoiceId`, `sunoModel`

Response:

```json
{ "jobId": "..." }
```

### `GET /api/jobs/:id`

Returns the current job state and logs.

### `POST /api/jobs/:id/approve`

Approves storyboard and starts Phase 2 (video generation).

### `POST /api/jobs/:id/approve-videos`

Approves videos and starts Phase 3 (audio + stitching).

## Supabase notes

When Supabase is enabled, this project expects:

- a `jobs` table (with columns used by `src/lib/services/jobStore.ts`, including JSON fields like `input`, `logs`, `storyboard`, `result`)
- a Storage bucket named **`assets`** (used by `src/lib/services/storage.ts`)

## Scripts

- `npm run dev`: local dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: run eslint
