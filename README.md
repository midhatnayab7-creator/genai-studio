<p align="center">
  <img src="https://img.shields.io/badge/GenAI-Studio-blueviolet?style=for-the-badge&logo=openai&logoColor=white" alt="GenAI Studio" />
  <br/>
  <strong>7-in-1 AI Productivity Suite</strong>
</p>

<p align="center">
  <a href="https://genai-studio-pi.vercel.app">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-genai--studio--pi.vercel.app-00C853?style=for-the-badge" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/SvelteKit-FF3E00?style=flat-square&logo=svelte&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenRouter-AI-blue?style=flat-square" />
</p>

---

## About

**GenAI Studio** is an all-in-one AI-powered productivity suite that brings together seven essential tools in a single, sleek interface. Built with SvelteKit and deployed on Vercel, it delivers fast, responsive AI experiences right from your browser.

---

## Features

| Tool | Description |
|------|-------------|
| **💬 AI Chat** | Have natural conversations with Claude — ask anything, brainstorm, or get advice |
| **🖼️ Image Generator** | Generate stunning images from text descriptions |
| **💻 Code Assistant** | Write, debug, and explain code across multiple languages |
| **✍️ Content Writer** | Generate emails, blog posts, essays, social media posts, resumes & cover letters |
| **🌐 Translator** | Translate text between any languages instantly |
| **📝 Summarizer** | Condense long articles and documents into key points |
| **🔗 URL Reader** | Fetch any webpage and ask AI questions about its content |

---

## Tech Stack

- **Frontend** — [SvelteKit](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/) with Runes
- **Build Tool** — [Vite](https://vitejs.dev/)
- **AI Backend** — [OpenRouter](https://openrouter.ai/) (Claude, GPT & more)
- **Image Generation** — Pollinations AI
- **Markdown Rendering** — [Marked](https://marked.js.org/) + [Highlight.js](https://highlightjs.org/)
- **Deployment** — [Vercel](https://vercel.com/)

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An [OpenRouter](https://openrouter.ai/) API key

### Installation

```bash
# Clone the repository
git clone https://github.com/midhatnayab7-creator/genai-studio.git
cd genai-studio

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Add your OpenRouter API key to .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## Deployment

This project is pre-configured for **Vercel** deployment:

1. Push your code to GitHub
2. Import the repository on [vercel.com/new](https://vercel.com/new)
3. Deploy — zero configuration needed

---

## Project Structure

```
genai-studio/
├── src/
│   ├── lib/
│   │   └── markdown.js          # Markdown rendering utilities
│   ├── routes/
│   │   ├── api/
│   │   │   ├── chat/            # AI chat endpoint
│   │   │   ├── fetch-url/       # URL scraping endpoint
│   │   │   └── generate-image/  # Image generation endpoint
│   │   └── +page.svelte         # Main application UI
├── static/                      # Static assets
├── svelte.config.js
├── vite.config.js
└── vercel.json
```

---

## Author

**Midhat Nayab**
- GitHub: [@midhatnayab7-creator](https://github.com/midhatnayab7-creator)

---

## License

This project is open source and available under the [MIT License](LICENSE).
