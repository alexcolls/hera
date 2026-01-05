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

## License

See [`LICENSE`](./LICENSE). This repository is **proprietary** and requires a commercial license for use.
