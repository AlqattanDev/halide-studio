# Halide

Live prompt ↔ image studio. Change the text, the plate follows. Request a change, the prompt rewrites itself. Start from a photo — the frame keeps that picture’s shape.

## Features

- **Grok Imagine 2.0** for new plates and edits
- **Grok** rewrites the master prompt from a change request
- Upload a photo to start; aspect ratio comes from the image
- Live prompt anatomy (subject, place, light, style, lens)
- Iteration history — restore any previous plate

## Setup

```bash
npm install
```

Create an API key at [console.x.ai](https://console.x.ai/) with your SuperGrok account.

```bash
export XAI_API_KEY=xai-...
npm run dev
```

Or paste the key in the app via **Connect Grok Imagine**. It stays in the browser.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript |

## Stack

React 19, TanStack Start, Vite, Tailwind v4, Zustand.
