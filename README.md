# Video Factory

CLI tool for producing polished 1080p tutorial videos. Human records screen with guided overlay, AI generates voiceover + effects.

```bash
video-factory tutorial --url=https://app.example.com --purpose="onboarding walkthrough"
```

## How It Works

```
INPUT: --url + --purpose (or --tree-id)

1. Script Generation (Claude API)
   URL + purpose -> step-by-step tutorial script

2. Human Screen Recording (Playwright)
   Script overlay panel -> human follows steps -> cursor/click/key tracking -> events.json

3. Cursor Detection
   events.json -> click zones, dwell regions, zoom points -> markers.json

4. Voice Generation (ElevenLabs)
   Script -> TTS audio + character-level word timestamps

5. Remotion Render
   Screen recording + voice + karaoke subs + zoom + highlights + intro/outro -> draft.mp4

6. FFmpeg Export
   VideoToolbox HEVC Metal -> final_1080p.mp4
```

**Pipeline time:** ~5 min/video on M4 24GB | **Cost:** ~$0.03/video

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Script Generation | Claude API (claude-sonnet-4-6) |
| Screen Recording | Playwright + script overlay panel |
| Cursor Detection | Custom event analysis (click/dwell/zoom) |
| Voice TTS | ElevenLabs with-timestamps (character-level alignment) |
| Compositor | Remotion (React-based video) |
| Export | FFmpeg VideoToolbox (Metal HEVC) |

## Prerequisites

- **Node.js** 20+ — `brew install node`
- **FFmpeg** with VideoToolbox — `brew install ffmpeg`
- **Playwright** browsers — `npx playwright install chromium`
- **API Keys** in `.env.local`:
  ```
  ANTHROPIC_API_KEY=sk-...
  ELEVENLABS_API_KEY=...
  ```

## Installation

```bash
git clone https://github.com/hieuspaceos/universal-video-factory.git
cd universal-video-factory
npm install
npm run build
```

## Commands

```bash
# Primary: create tutorial video (human-assisted)
video-factory tutorial --url=https://app.example.com --purpose="how to sign up"

# Step-by-step commands (for fine-grained control)
video-factory generate-script --url=https://app.example.com --purpose="onboarding"
video-factory record --script=./output/tutorial/script.json
video-factory detect --events=./output/tutorial/events.json

# Action clips (pre-recorded reusable clips)
video-factory record-clip --url=https://app.example.com --action="Click login" --type=button
video-factory clips list
video-factory compose --manifest=./manifest.json

# Web dashboard
video-factory serve --port=3456

# Legacy auto-pipeline (AI-driven, no human recording)
video-factory run --url=https://app.example.com --feature="sign up"
```

Run `video-factory <command> --help` for detailed options per command.

## Output Structure

```
./output/tutorial/
├── final_1080p.mp4        - finished tutorial video
├── draft.mp4              - pre-export Remotion render
├── script.json            - generated tutorial script
├── events.json            - cursor/click/key events from recording
├── markers.json           - detected zoom/highlight markers
├── audio/                 - generated TTS audio
└── scenes/                - recorded scene clips
```

## Brand Customization

Create a `brand.json` to customize video appearance:

```json
{
  "name": "My Company",
  "colors": {
    "primary": "#2563EB",
    "accent": "#FFD700"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter"
  },
  "intro": { "tagline": "See how it works", "duration": 3 },
  "outro": { "cta": "Try it free", "url": "https://myapp.com", "duration": 4 }
}
```

## Video Components

- **Screen recording** with cursor tracking
- **Voiceover** with karaoke-style subtitles
- **Click highlight** — animated SVG ring at click coordinates
- **Zoom** — spring animation zoom to action points
- **Intro/Outro** — brand-driven animations
- **Progress bar** + step counter overlay

## Web Dashboard

A browser-based UI for managing video generation jobs with real-time progress.

```bash
video-factory serve --port=3456
```

Open http://localhost:3456 to access the dashboard. Features:
- Create and manage video generation jobs
- Real-time pipeline progress via WebSocket
- Live log streaming
- Video preview for completed jobs

## Project Structure

```
src/
├── script/          - Tutorial script generation (Claude API)
├── recorder/        - Human screen recorder with overlay panel
├── detection/       - Cursor-based marker detection (zoom, highlight, click)
├── voice/           - ElevenLabs TTS + word-level timestamps
├── compositor/      - Brand loading, scene timing, Remotion render engine
├── export/          - FFmpeg HEVC export, format conversion
├── cli/             - CLI commands, argument parsing, progress display
├── orchestrator/    - Pipeline coordinator, checkpoints, error handling
├── clips/           - Action clips library (record, catalog, compose)
├── server/          - Hono API server, WebSocket hub, job routes
├── queue/           - SQLite job store, runner, worker
├── ai-director/     - (legacy) Claude Vision analysis, click planning
├── capture/         - (legacy) Playwright auto-recording
├── dashboard/       - React web UI (Vite + TypeScript)
└── utils/           - Retry, logger, cleanup utilities

remotion/src/
├── components/      - Click highlight, zoom, karaoke subs, intro/outro
└── universal-template/  - Main composition, props schema, scene sequencer
```

## Development

```bash
npm run dev          # Run CLI in development mode
npm run build        # Build CLI + dashboard
npm run typecheck    # TypeScript type checking
npm test             # Run unit tests
npm run test:watch   # Watch mode
npm run dashboard:dev    # Dashboard Vite dev server
npm run dashboard:build  # Build dashboard only
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ANTHROPIC_API_KEY is not set` | Add to `.env.local` |
| `ELEVENLABS_API_KEY is not set` | Add to `.env.local` |
| `FFmpeg not found` | `brew install ffmpeg` |
| Pipeline interrupted | Re-run with `--resume` |

## License

MIT
