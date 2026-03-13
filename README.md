# GenAI Studio

A modern, 7-in-1 AI-powered productivity suite built with SvelteKit. Features a sleek dark theme with real-time streaming responses — **no API keys required**.

![SvelteKit](https://img.shields.io/badge/SvelteKit-2.0-FF3E00?logo=svelte&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### 1. AI Chat
General-purpose conversational AI assistant. Ask about anything — research, writing, math, coding, ideas, and more. Full conversation history with real-time streaming.

### 2. Image Generator
Generate images from text descriptions using Stable Horde's distributed AI network. Creates 2 images per prompt (512x512) with download support.

### 3. Code Assistant
Write, debug, explain, and optimize code in any programming language. Includes syntax highlighting with copy-to-clipboard for code blocks.

### 4. Content Writer
Generate professional content with 6 format options:
- Email | Blog Post | Essay | Social Media Post | Resume/CV | Cover Letter

### 5. Translator
Translate text between 15+ languages instantly:
English, Spanish, French, Arabic, Chinese, German, Japanese, Italian, Portuguese, Russian, Hindi, Korean, Turkish, Dutch, Swedish

### 6. Summarizer
Paste any long text and get a clear summary with key bullet points and a brief conclusion.

### 7. URL Reader
Fetch any webpage, extract its content, and ask AI questions about it. Great for analyzing articles, documentation, and research papers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2 + Svelte 5 |
| Build Tool | Vite 6 |
| Markdown | marked + highlight.js |
| Text AI | Pollinations.ai (free, no auth) |
| Image AI | Stable Horde API (free, anonymous) |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/midhatnayab7-creator/genai-studio.git
cd genai-studio

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
genai-studio/
├── src/
│   ├── app.html                    # HTML template
│   ├── lib/
│   │   └── markdown.js             # Markdown renderer with syntax highlighting
│   └── routes/
│       ├── +page.svelte            # Main app (all 7 tools + UI)
│       └── api/
│           ├── chat/+server.js     # Text generation API (streaming SSE)
│           ├── generate-image/+server.js  # Image generation API
│           └── fetch-url/+server.js      # URL content extractor
├── static/                         # Static assets
├── svelte.config.js                # SvelteKit configuration
├── vite.config.js                  # Vite configuration
├── vercel.json                     # Vercel deployment config
├── package.json
└── .env.example
```

## How It Works

- **Text Generation**: Uses [Pollinations.ai](https://pollinations.ai/) — a free, open-source AI API. Responses stream in real-time via Server-Sent Events (SSE).
- **Image Generation**: Uses [Stable Horde](https://stablehorde.net/) — a distributed volunteer network running Stable Diffusion. Images take 20–60 seconds on free servers.
- **URL Reading**: Fetches web pages server-side, strips HTML to extract clean text (capped at 10,000 characters), then uses AI to answer questions about the content.

## Design

- **Theme**: Professional dark navy design with sky-blue and indigo accents
- **Layout**: Sidebar navigation (248px) with main content area
- **Responsive**: Sidebar hidden on mobile (< 600px)
- **Typography**: System font stack with Fira Code for code blocks
- **Animations**: Blinking cursor, smooth scroll, gradient hover effects

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Deploy — zero configuration needed

### Other Platforms

The app uses `@sveltejs/adapter-auto` which auto-detects the deployment platform. Works with Vercel, Netlify, Cloudflare Pages, and more.

## License

MIT

## Author

**Midhat** — Built with SvelteKit and free AI APIs
