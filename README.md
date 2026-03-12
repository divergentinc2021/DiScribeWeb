# DiScribe

Voice recorder PWA with AI transcription and smart templates.

Record audio from your browser, send it to a Cloudflare Worker for AI transcription, then process it with a template to get structured notes. Everything is stored locally on your device via IndexedDB.

**Live:** [discribe-web.pages.dev](https://discribe-web.pages.dev)

## Features

- **Browser-based recording** — uses MediaRecorder API (microphone), works on any device
- **AI transcription** — Cloudflare Workers AI (Whisper) speech-to-text
- **5 smart templates** — each uses a tailored LLM prompt for different use cases
- **Offline-capable PWA** — installable on mobile/desktop, works offline for playback
- **Copy & share** — structured Markdown output, native share on mobile
- **Dark theme** — matches the DiScreenRecorder desktop companion app

## Templates

| Template | Icon | Use Case |
|----------|------|----------|
| Meeting Minutes | 📋 | Attendees, agenda, discussions, action items table, decisions |
| Dictation Summary | 🎙️ | Clean up spoken notes into polished prose with key points |
| Notes on Self | 🪞 | Personal reflection — thoughts, goals, insights |
| Workshop Summary | 🎓 | Lecture/training content — learnings, exercises, takeaways |
| Exhibition Notes | 🏛️ | Museum/gallery visits — exhibits, facts, reflections |

## Architecture

```
┌──────────────────────────────┐
│  DiScribe PWA (Browser)      │
│  ├── React 19 + TypeScript   │
│  ├── IndexedDB (idb)         │
│  ├── MediaRecorder API       │
│  └── Service Worker (PWA)    │
├──────────────────────────────┤
│  Cloudflare Worker (Backend) │
│  ├── /api/transcribe         │
│  ├── /api/summarize          │
│  └── /api/generate-minutes   │
└──────────────────────────────┘
```

## Getting Started

### 1. Deploy the Worker

The same Cloudflare Worker backend is shared with [DiScreenRecorder](https://github.com/divergentinc2021/ScreenScreen). Deploy it if you haven't already:

```bash
cd worker
npx wrangler deploy
```

The Worker uses Cloudflare Workers AI — no API keys needed, just a Cloudflare account with Workers AI enabled.

### 2. Run the PWA locally

```bash
npm install
npm run dev        # Vite dev server at localhost:5173
```

### 3. Configure

Open the app → **Settings** → paste your Worker URL (e.g. `https://meeting-summarizer.your-subdomain.workers.dev`) → Save.

### 4. Deploy to Cloudflare Pages

```bash
npm run build
wrangler pages deploy dist --project-name discribe-web
```

Or connect the GitHub repo to Cloudflare Pages for automatic deploys:
- **Build command:** `npm run build`
- **Output directory:** `dist`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind v4 |
| State | Zustand |
| Storage | IndexedDB (via `idb`) |
| Build | Vite 7, vite-plugin-pwa |
| AI Backend | Cloudflare Workers AI (Whisper + Llama 3.1 8B) |
| Hosting | Cloudflare Pages |

## Project Structure

```
DiScribeWeb/
├── src/
│   ├── App.tsx                    # Main app with view routing
│   ├── lib/
│   │   ├── db.ts                  # IndexedDB storage layer
│   │   ├── store.ts               # Zustand state management
│   │   └── templates.ts           # 5 template presets + LLM prompts
│   └── components/
│       ├── HomeView.tsx           # Template selector + recordings list
│       ├── RecorderView.tsx       # MediaRecorder with timer
│       ├── RecordingView.tsx      # Audio player + transcribe/process
│       ├── ResultView.tsx         # Dynamic result viewer
│       └── SettingsPanel.tsx      # Worker URL + default template
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── vite.config.ts                 # Vite + PWA manifest config
```

## Related

- **[DiScreenRecorder](https://github.com/divergentinc2021/ScreenScreen)** — Electron desktop app with screen recording, local whisper.cpp transcription, and PDF export

## License

MIT — Divergent Inc
