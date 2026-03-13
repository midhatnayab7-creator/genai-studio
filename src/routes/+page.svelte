<script>
  import { onMount, tick } from 'svelte';
  import { renderMarkdown } from '$lib/markdown.js';

  // Tools config
  const TOOLS = [
    {
      id: 'chat',
      icon: '💬',
      label: 'AI Chat',
      description: 'Talk to Claude about anything'
    },
    {
      id: 'image',
      icon: '🖼️',
      label: 'Image Generator',
      description: 'Generate images from text'
    },
    {
      id: 'code',
      icon: '💻',
      label: 'Code Assistant',
      description: 'Write, fix and explain code'
    },
    {
      id: 'writer',
      icon: '✍️',
      label: 'Content Writer',
      description: 'Emails, blogs, essays and more'
    },
    {
      id: 'translate',
      icon: '🌐',
      label: 'Translator',
      description: 'Translate text to any language'
    },
    {
      id: 'summarize',
      icon: '📝',
      label: 'Summarizer',
      description: 'Summarize long text instantly'
    },
    {
      id: 'url',
      icon: '🔗',
      label: 'URL Reader',
      description: 'Learn from any website or article'
    }
  ];

  let activeTool = $state('chat');
  const USERNAME = 'Midhat';
  const AVATAR = 'M';

  let messages = $state([]);
  let input = $state('');
  let loading = $state(false);
  let chatContainer;
  let textareaEl;

  // Image generator state
  let imagePrompt = $state('');
  let generatedImages = $state([]);
  let imageLoading = $state(false);

  // Content writer state
  let contentType = $state('email');
  const CONTENT_TYPES = [
    { id: 'email', label: '📧 Email' },
    { id: 'blog', label: '📰 Blog Post' },
    { id: 'essay', label: '📄 Essay' },
    { id: 'social', label: '📱 Social Media Post' },
    { id: 'resume', label: '📋 Resume/CV' },
    { id: 'cover', label: '💼 Cover Letter' }
  ];

  // URL Reader state
  let urlInput = $state('');
  let urlLoaded = $state(false);
  let urlTitle = $state('');
  let urlLoadingMsg = $state('');
  let urlContent = $state('');

  async function loadURL() {
    const url = urlInput.trim();
    if (!url || loading) return;
    urlLoadingMsg = 'Fetching page...';
    urlLoaded = false;
    urlContent = '';
    messages = [];

    try {
      const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.error) {
        urlLoadingMsg = `Error: ${data.error}`;
        return;
      }
      urlContent = data.text;
      urlTitle = data.title || url;
      urlLoaded = true;
      urlLoadingMsg = '';
    } catch (e) {
      urlLoadingMsg = `Failed to fetch: ${e.message}`;
    }
  }

  async function askAboutURL() {
    const q = input.trim();
    if (!q || !urlLoaded || loading) return;
    input = '';
    loading = true;
    messages = [...messages, { role: 'user', content: q }];
    await scrollToBottom();
    const prompt = `Based on this webpage content:\n\n${urlContent.slice(0, 6000)}\n\n---\nAnswer this question: ${q}`;
    await callClaude([{ role: 'user', content: prompt }]);
    loading = false;
  }

  // Translator state
  let translateFrom = $state('English');
  let translateTo = $state('Spanish');
  const LANGUAGES = ['English','Spanish','French','Arabic','Chinese','German','Japanese','Italian','Portuguese','Russian','Hindi','Korean','Turkish','Dutch','Swedish'];

  function switchTool(toolId) {
    activeTool = toolId;
    messages = [];
    input = '';
  }

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Generic Claude streaming call
  async function callClaude(userMessages) {
    messages = [...messages, { role: 'assistant', content: '' }];
    const idx = messages.length - 1;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: userMessages, tool: activeTool })
    });

    if (!response.ok) {
      const err = await response.json();
      messages[idx] = { role: 'assistant', content: `Error: ${err.error || 'Something went wrong.'}` };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              messages[idx] = {
                role: 'assistant',
                content: messages[idx].content + parsed.text
              };
              messages = [...messages];
              await scrollToBottom();
            }
          } catch {}
        }
      }
    }
  }

  // Chat send
  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    input = '';
    loading = true;

    messages = [...messages, { role: 'user', content: text }];
    await scrollToBottom();

    const userMessages = messages.filter(m => m.content !== '');
    await callClaude(userMessages);
    loading = false;
    await tick();
    textareaEl?.focus();
  }

  // Code assistant send
  async function sendCode() {
    const text = input.trim();
    if (!text || loading) return;
    input = '';
    loading = true;
    messages = [...messages, { role: 'user', content: text }];
    await scrollToBottom();
    await callClaude(messages.filter(m => m.content !== ''));
    loading = false;
  }

  // Content writer
  async function generateContent() {
    const text = input.trim();
    if (!text || loading) return;
    const prompt = `Write a ${contentType} about: ${text}`;
    input = '';
    loading = true;
    messages = [...messages, { role: 'user', content: `[${contentType.toUpperCase()}] ${text}` }];
    await scrollToBottom();
    await callClaude([{ role: 'user', content: prompt }]);
    loading = false;
  }

  // Translator
  async function translateText() {
    const text = input.trim();
    if (!text || loading) return;
    const prompt = `Translate the following text from ${translateFrom} to ${translateTo}. Only provide the translation, no explanation:\n\n${text}`;
    input = '';
    loading = true;
    messages = [...messages, { role: 'user', content: text }];
    await scrollToBottom();
    await callClaude([{ role: 'user', content: prompt }]);
    loading = false;
  }

  // Summarizer
  async function summarizeText() {
    const text = input.trim();
    if (!text || loading) return;
    const prompt = `Summarize the following text clearly and concisely. Include the key points as bullet points:\n\n${text}`;
    input = '';
    loading = true;
    messages = [...messages, { role: 'user', content: text.slice(0, 100) + (text.length > 100 ? '...' : '') }];
    await scrollToBottom();
    await callClaude([{ role: 'user', content: prompt }]);
    loading = false;
  }

  // Image generation using Pollinations.ai (free, no key needed)
  let imageError = $state('');

  async function generateImage() {
    const prompt = imagePrompt.trim();
    if (!prompt || imageLoading) return;
    imageLoading = true;
    imageError = '';
    generatedImages = [];

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();

      if (data.error) {
        imageError = data.error;
      } else {
        generatedImages = data.images.map(url => ({ url, prompt, loading: false }));
      }
    } catch (e) {
      imageError = 'Failed to connect to image server.';
    }

    imageLoading = false;
  }

  function handleImageLoad(i) {
    generatedImages[i] = { ...generatedImages[i], loading: false };
    generatedImages = [...generatedImages];
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeTool === 'chat') sendMessage();
      else if (activeTool === 'code') sendCode();
      else if (activeTool === 'writer') generateContent();
      else if (activeTool === 'translate') translateText();
      else if (activeTool === 'summarize') summarizeText();
      else if (activeTool === 'url') askAboutURL();
    }
  }

  function clearAll() {
    messages = [];
    input = '';
    generatedImages = [];
    imagePrompt = '';
    urlInput = '';
    urlLoaded = false;
    urlContent = '';
    urlTitle = '';
  }

  onMount(() => textareaEl?.focus());
</script>

<div class="app">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">✦</span>
        <span class="logo-text">GenAI Studio</span>
      </div>
    </div>

    <nav class="tool-nav">
      {#each TOOLS as tool}
        <button
          class="tool-btn {activeTool === tool.id ? 'active' : ''}"
          onclick={() => switchTool(tool.id)}
        >
          <span class="tool-icon">{tool.icon}</span>
          <div class="tool-info">
            <div class="tool-label">{tool.label}</div>
            <div class="tool-desc">{tool.description}</div>
          </div>
        </button>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <button class="clear-btn" onclick={clearAll}>🗑 Clear</button>
      <div class="user-badge">
        <div class="avatar">M</div>
        <span>Midhat</span>
      </div>
    </div>
  </aside>

  <!-- Main area -->
  <main class="main">

    <!-- ===== CHAT TOOL ===== -->
    {#if activeTool === 'chat'}
      <div class="chat-wrap">
        <div class="chat-messages" bind:this={chatContainer}>
          {#if messages.length === 0}
            <div class="welcome">
              <div class="welcome-icon">💬</div>
              <h1>AI Chat</h1>
              <p>Ask me anything — I can help with research, writing, math, coding, ideas, and more.</p>
              <div class="chips">
                {#each ['Explain machine learning', 'Write a business plan', 'Help me study for exams', 'Give me healthy meal ideas'] as s}
                  <button class="chip" onclick={() => { input = s; sendMessage(); }}>{s}</button>
                {/each}
              </div>
            </div>
          {/if}
          {#each messages as msg}
            <div class="msg {msg.role}">
              <div class="msg-avatar">{msg.role === 'user' ? AVATAR : '✦'}</div>
              <div class="msg-body">
                <div class="msg-name">{msg.role === 'user' ? USERNAME : 'Claude'}</div>
                {#if msg.content === '' && msg.role === 'assistant'}
                  <span class="cursor"></span>
                {:else}
                  <div class="msg-text markdown">{@html renderMarkdown(msg.content)}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="input-bar">
          <div class="input-box">
            <textarea bind:this={textareaEl} bind:value={input} onkeydown={handleKeydown} placeholder="Ask Claude anything..." rows="1" disabled={loading}></textarea>
            <button class="send" onclick={sendMessage} disabled={!input.trim() || loading}>
              {#if loading}<span class="spin"></span>{:else}↑{/if}
            </button>
          </div>
          <p class="hint">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>

    <!-- ===== IMAGE GENERATOR ===== -->
    {:else if activeTool === 'image'}
      <div class="tool-page">
        <div class="tool-header">
          <h1>🖼️ Image Generator</h1>
          <p>Describe what you want to see — AI will generate it instantly</p>
        </div>
        <div class="image-prompt-area">
          <textarea
            bind:value={imagePrompt}
            placeholder="A futuristic city at sunset with flying cars, cyberpunk style, highly detailed..."
            rows="3"
          ></textarea>
          <button class="generate-btn" onclick={generateImage} disabled={!imagePrompt.trim() || imageLoading}>
            {imageLoading ? 'Generating...' : '✨ Generate Images'}
          </button>
        </div>

        {#if imageLoading}
          <div class="img-generating-state">
            <span class="spin large"></span>
            <p>Generating your images...</p>
            <p class="img-wait-note">This takes 20–60 seconds on free servers. Please wait.</p>
          </div>
        {:else if imageError}
          <div class="img-error-state">
            <span>⚠️</span>
            <p>{imageError}</p>
            <button class="generate-btn" onclick={generateImage}>Try Again</button>
          </div>
        {:else if generatedImages.length > 0}
          <div class="image-grid">
            {#each generatedImages as img, i}
              <div class="image-card">
                <img src={img.url} alt={img.prompt} />
                <div class="img-actions">
                  <a href={img.url} download="ai-image.webp" class="dl-btn">⬇ Download</a>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="image-examples">
            <p class="examples-label">Try these prompts:</p>
            <div class="chips">
              {#each [
                'A beautiful mountain landscape at golden hour, photorealistic',
                'A cute robot reading a book in a cozy library, digital art',
                'Abstract colorful swirls, neon colors, 4K',
                'A medieval castle surrounded by clouds, fantasy art'
              ] as ex}
                <button class="chip" onclick={() => imagePrompt = ex}>{ex}</button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

    <!-- ===== CODE ASSISTANT ===== -->
    {:else if activeTool === 'code'}
      <div class="chat-wrap">
        <div class="chat-messages" bind:this={chatContainer}>
          {#if messages.length === 0}
            <div class="welcome">
              <div class="welcome-icon">💻</div>
              <h1>Code Assistant</h1>
              <p>Write, debug, explain, and optimize code in any programming language.</p>
              <div class="chips">
                {#each ['Write a REST API in Python', 'Fix this React component', 'Explain async/await in JavaScript', 'Write SQL to find duplicates'] as s}
                  <button class="chip" onclick={() => { input = s; sendCode(); }}>{s}</button>
                {/each}
              </div>
            </div>
          {/if}
          {#each messages as msg}
            <div class="msg {msg.role}">
              <div class="msg-avatar">{msg.role === 'user' ? AVATAR : '💻'}</div>
              <div class="msg-body">
                <div class="msg-name">{msg.role === 'user' ? USERNAME : 'Code AI'}</div>
                {#if msg.content === '' && msg.role === 'assistant'}
                  <span class="cursor"></span>
                {:else}
                  <div class="msg-text markdown">{@html renderMarkdown(msg.content)}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="input-bar">
          <div class="input-box">
            <textarea bind:value={input} onkeydown={handleKeydown} placeholder="Describe what code you need or paste code to fix..." rows="2" disabled={loading}></textarea>
            <button class="send" onclick={sendCode} disabled={!input.trim() || loading}>
              {#if loading}<span class="spin"></span>{:else}↑{/if}
            </button>
          </div>
        </div>
      </div>

    <!-- ===== CONTENT WRITER ===== -->
    {:else if activeTool === 'writer'}
      <div class="chat-wrap">
        <div class="chat-messages" bind:this={chatContainer}>
          {#if messages.length === 0}
            <div class="welcome">
              <div class="welcome-icon">✍️</div>
              <h1>Content Writer</h1>
              <p>Generate professional content in seconds.</p>
              <div class="chips">
                {#each ['A job application email for a software engineer', 'A blog post about AI trends in 2026', 'A LinkedIn post about my new project', 'A cover letter for a marketing role'] as s}
                  <button class="chip" onclick={() => { input = s; generateContent(); }}>{s}</button>
                {/each}
              </div>
            </div>
          {/if}
          {#each messages as msg}
            <div class="msg {msg.role}">
              <div class="msg-avatar">{msg.role === 'user' ? AVATAR : '✍️'}</div>
              <div class="msg-body">
                <div class="msg-name">{msg.role === 'user' ? USERNAME : 'Writer AI'}</div>
                {#if msg.content === '' && msg.role === 'assistant'}
                  <span class="cursor"></span>
                {:else}
                  <div class="msg-text markdown">{@html renderMarkdown(msg.content)}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="input-bar">
          <div class="content-type-bar">
            {#each CONTENT_TYPES as ct}
              <button class="type-pill {contentType === ct.id ? 'active' : ''}" onclick={() => contentType = ct.id}>{ct.label}</button>
            {/each}
          </div>
          <div class="input-box">
            <textarea bind:value={input} onkeydown={handleKeydown} placeholder={`What should the ${contentType} be about?`} rows="2" disabled={loading}></textarea>
            <button class="send" onclick={generateContent} disabled={!input.trim() || loading}>
              {#if loading}<span class="spin"></span>{:else}↑{/if}
            </button>
          </div>
        </div>
      </div>

    <!-- ===== TRANSLATOR ===== -->
    {:else if activeTool === 'translate'}
      <div class="chat-wrap">
        <div class="chat-messages" bind:this={chatContainer}>
          {#if messages.length === 0}
            <div class="welcome">
              <div class="welcome-icon">🌐</div>
              <h1>Translator</h1>
              <p>Translate text between 15+ languages instantly.</p>
            </div>
          {/if}
          {#each messages as msg}
            <div class="msg {msg.role}">
              <div class="msg-avatar">{msg.role === 'user' ? AVATAR : '🌐'}</div>
              <div class="msg-body">
                <div class="msg-name">{msg.role === 'user' ? USERNAME : 'Translated'}</div>
                {#if msg.content === '' && msg.role === 'assistant'}
                  <span class="cursor"></span>
                {:else}
                  <div class="msg-text">{msg.content}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="input-bar">
          <div class="lang-bar">
            <select bind:value={translateFrom}>
              {#each LANGUAGES as l}<option>{l}</option>{/each}
            </select>
            <span class="arrow">→</span>
            <select bind:value={translateTo}>
              {#each LANGUAGES as l}<option>{l}</option>{/each}
            </select>
          </div>
          <div class="input-box">
            <textarea bind:value={input} onkeydown={handleKeydown} placeholder={`Type text in ${translateFrom}...`} rows="2" disabled={loading}></textarea>
            <button class="send" onclick={translateText} disabled={!input.trim() || loading}>
              {#if loading}<span class="spin"></span>{:else}→{/if}
            </button>
          </div>
        </div>
      </div>

    <!-- ===== SUMMARIZER ===== -->
    {:else if activeTool === 'summarize'}
      <div class="chat-wrap">
        <div class="chat-messages" bind:this={chatContainer}>
          {#if messages.length === 0}
            <div class="welcome">
              <div class="welcome-icon">📝</div>
              <h1>Summarizer</h1>
              <p>Paste any long text — article, document, email — and get a clear summary with key points.</p>
            </div>
          {/if}
          {#each messages as msg}
            <div class="msg {msg.role}">
              <div class="msg-avatar">{msg.role === 'user' ? AVATAR : '📝'}</div>
              <div class="msg-body">
                <div class="msg-name">{msg.role === 'user' ? USERNAME : 'Summary'}</div>
                {#if msg.content === '' && msg.role === 'assistant'}
                  <span class="cursor"></span>
                {:else}
                  <div class="msg-text markdown">{@html renderMarkdown(msg.content)}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="input-bar">
          <div class="input-box">
            <textarea bind:value={input} onkeydown={handleKeydown} placeholder="Paste the text you want to summarize here..." rows="4" disabled={loading}></textarea>
            <button class="send" onclick={summarizeText} disabled={!input.trim() || loading}>
              {#if loading}<span class="spin"></span>{:else}📝{/if}
            </button>
          </div>
        </div>
      </div>
    <!-- ===== URL READER ===== -->
    {:else if activeTool === 'url'}
      <div class="chat-wrap">
        <div class="chat-messages" bind:this={chatContainer}>
          {#if !urlLoaded && messages.length === 0}
            <div class="welcome">
              <div class="welcome-icon">🔗</div>
              <h1>URL Reader</h1>
              <p>Paste any website URL — news article, blog post, Wikipedia page — and ask me anything about it.</p>
              <div class="chips">
                {#each ['https://en.wikipedia.org/wiki/Artificial_intelligence', 'https://en.wikipedia.org/wiki/Pakistan'] as ex}
                  <button class="chip" onclick={() => { urlInput = ex; loadURL(); }}>{ex}</button>
                {/each}
              </div>
            </div>
          {/if}

          {#if urlLoaded && messages.length === 0}
            <div class="url-loaded-banner">
              <span class="url-icon">✅</span>
              <div>
                <div class="url-loaded-title">{urlTitle}</div>
                <div class="url-loaded-sub">Page loaded — ask me anything about it below</div>
              </div>
            </div>
          {/if}

          {#if urlLoadingMsg}
            <div class="url-status">{urlLoadingMsg}</div>
          {/if}

          {#each messages as msg}
            <div class="msg {msg.role}">
              <div class="msg-avatar">{msg.role === 'user' ? AVATAR : '🔗'}</div>
              <div class="msg-body">
                <div class="msg-name">{msg.role === 'user' ? USERNAME : 'URL AI'}</div>
                {#if msg.content === '' && msg.role === 'assistant'}
                  <span class="cursor"></span>
                {:else}
                  <div class="msg-text markdown">{@html renderMarkdown(msg.content)}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- URL input bar -->
        {#if !urlLoaded}
          <div class="input-bar">
            <div class="input-box">
              <input
                type="url"
                bind:value={urlInput}
                onkeydown={(e) => e.key === 'Enter' && loadURL()}
                placeholder="Paste a URL here (e.g. https://example.com/article)"
                disabled={!!urlLoadingMsg}
              />
              <button class="send" onclick={loadURL} disabled={!urlInput.trim() || !!urlLoadingMsg}>
                {#if urlLoadingMsg}<span class="spin"></span>{:else}→{/if}
              </button>
            </div>
            <p class="hint">Press Enter to load the page</p>
          </div>
        {:else}
          <div class="input-bar">
            <div class="url-loaded-bar">
              <span class="url-tag">🔗 {urlTitle.slice(0, 50)}{urlTitle.length > 50 ? '...' : ''}</span>
              <button class="change-url-btn" onclick={() => { urlLoaded = false; urlInput = ''; messages = []; }}>Change URL</button>
            </div>
            <div class="input-box">
              <textarea bind:value={input} onkeydown={handleKeydown} placeholder="Ask anything about this page..." rows="2" disabled={loading}></textarea>
              <button class="send" onclick={askAboutURL} disabled={!input.trim() || loading}>
                {#if loading}<span class="spin"></span>{:else}↑{/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

  </main>
</div>

<style>
  /* ── Professional Color System ──
     Background:  #070d1a  (deep navy black)
     Surface:     #0d1526  (dark navy)
     Panel:       #111e35  (medium navy)
     Border:      #1a2e4a  (blue-tinted border)
     Accent:      #0ea5e9  (sky blue)
     Accent2:     #6366f1  (indigo)
     Text:        #e8f0fe  (cool white)
     Muted:       #7a9cc0  (blue-gray)
     Faint:       #2a3f5c  (very muted)
  ── */

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
    background: #070d1a;
    color: #e8f0fe;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    height: 100vh;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: 248px;
    background: #0d1526;
    border-right: 1px solid #1a2e4a;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 20px 16px;
    border-bottom: 1px solid #1a2e4a;
    background: linear-gradient(135deg, #0d1526 0%, #111e35 100%);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: #e8f0fe;
  }

  .logo-icon {
    font-size: 22px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tool-nav {
    flex: 1;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .tool-btn {
    width: 100%;
    background: transparent;
    border: none;
    border-radius: 10px;
    padding: 11px 12px;
    color: #7a9cc0;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    transition: all 0.18s;
  }

  .tool-btn:hover {
    background: #111e35;
    color: #c8ddf5;
  }

  .tool-btn.active {
    background: linear-gradient(135deg, #0c2040 0%, #0f1e3a 100%);
    color: #38bdf8;
    border: 1px solid #1a3a5c;
    box-shadow: 0 0 0 1px #0ea5e920 inset;
  }

  .tool-icon { font-size: 17px; flex-shrink: 0; }
  .tool-label { font-size: 13px; font-weight: 600; }
  .tool-desc { font-size: 11px; color: #2a3f5c; margin-top: 1px; }
  .tool-btn.active .tool-desc { color: #1e6090; }

  .sidebar-footer {
    padding: 14px 12px;
    border-top: 1px solid #1a2e4a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: #0a1120;
  }

  .clear-btn {
    background: #111e35;
    border: 1px solid #1a2e4a;
    border-radius: 7px;
    color: #5a7a9a;
    font-size: 12px;
    padding: 6px 12px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .clear-btn:hover {
    background: #1a2e4a;
    color: #a8c8e8;
    border-color: #0ea5e940;
  }

  .user-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #7a9cc0;
  }

  .avatar {
    width: 30px; height: 30px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: white; font-size: 13px;
    box-shadow: 0 0 10px #0ea5e940;
  }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #070d1a; min-height: 0; }

  /* ── Chat layout ── */
  .chat-wrap { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

  .chat-messages {
    flex: 1; overflow-y: auto; padding: 32px 28px;
    scroll-behavior: smooth; min-height: 0;
  }

  .chat-messages::-webkit-scrollbar { width: 5px; }
  .chat-messages::-webkit-scrollbar-thumb { background: #1a2e4a; border-radius: 3px; }

  /* Welcome */
  .welcome {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; min-height: 60vh; gap: 18px; text-align: center;
  }

  .welcome-icon { font-size: 54px; filter: drop-shadow(0 0 20px #0ea5e960); }

  .welcome h1 {
    font-size: 30px; font-weight: 700;
    background: linear-gradient(135deg, #e8f0fe, #7dd3fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .welcome p { font-size: 15px; color: #4a6890; max-width: 480px; line-height: 1.7; }

  .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 580px; margin-top: 8px; }

  .chip {
    padding: 9px 16px;
    background: #0d1526;
    border: 1px solid #1a2e4a;
    border-radius: 22px;
    color: #7a9cc0;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .chip:hover {
    background: #111e35;
    border-color: #0ea5e9;
    color: #bce0f8;
    box-shadow: 0 0 12px #0ea5e920;
  }

  /* Messages */
  .msg {
    display: flex; gap: 14px; margin-bottom: 28px;
    max-width: 800px; margin-left: auto; margin-right: auto; width: 100%;
  }

  .msg-avatar {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; flex-shrink: 0;
  }

  .msg.user .msg-avatar {
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    color: white;
    box-shadow: 0 2px 8px #0ea5e930;
  }

  .msg.assistant .msg-avatar {
    background: #0d1526;
    border: 1px solid #1a2e4a;
    color: #38bdf8;
  }

  .msg-body { flex: 1; padding-top: 4px; }

  .msg-name {
    font-size: 12px; color: #2a4a6a; font-weight: 700;
    margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.5px;
  }

  .msg.user .msg-name { color: #1a6090; }
  .msg.assistant .msg-name { color: #0e4a6a; }

  .msg-text { font-size: 15px; line-height: 1.8; color: #c8ddf5; word-break: break-word; }

  /* Markdown styles */
  :global(.markdown p) { margin-bottom: 12px; color: #c8ddf5; }
  :global(.markdown ul, .markdown ol) { margin: 10px 0 10px 22px; color: #c8ddf5; }
  :global(.markdown li) { margin-bottom: 5px; }
  :global(.markdown h1, .markdown h2, .markdown h3) {
    margin: 18px 0 9px;
    background: linear-gradient(135deg, #e8f0fe, #7dd3fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }
  :global(.markdown strong) { color: #e8f0fe; font-weight: 700; }
  :global(.markdown a) { color: #38bdf8; text-decoration: underline; }
  :global(.markdown code:not(pre code)) {
    background: #0d1a2e; padding: 2px 7px; border-radius: 5px;
    font-family: 'Fira Code', monospace; font-size: 13px;
    color: #38bdf8; border: 1px solid #1a3050;
  }
  :global(.code-block) {
    margin: 14px 0; border-radius: 12px; overflow: hidden;
    border: 1px solid #1a2e4a;
    box-shadow: 0 4px 20px #00000040;
  }
  :global(.code-header) {
    display: flex; justify-content: space-between; align-items: center;
    padding: 9px 16px; background: #0d1a2e;
    font-size: 12px; color: #4a6a8a;
    border-bottom: 1px solid #1a2e4a;
  }
  :global(.code-lang) {
    text-transform: uppercase; font-weight: 700;
    color: #0ea5e9; letter-spacing: 0.5px;
  }
  :global(.copy-btn) {
    background: #111e35; border: 1px solid #1a2e4a;
    color: #4a6a8a; padding: 3px 12px;
    border-radius: 5px; cursor: pointer; font-size: 12px;
    transition: all 0.15s;
  }
  :global(.copy-btn:hover) { background: #1a2e4a; color: #bce0f8; }
  :global(.code-block pre) { margin: 0; padding: 16px; background: #060e1a; overflow-x: auto; }
  :global(.code-block code) { font-family: 'Fira Code', 'Courier New', monospace; font-size: 13px; }

  /* Cursor */
  .cursor {
    display: inline-block; width: 8px; height: 17px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    border-radius: 2px;
    animation: blink 1s infinite;
    box-shadow: 0 0 8px #0ea5e960;
  }

  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

  /* Input bar */
  .input-bar {
    padding: 14px 24px 18px;
    background: #070d1a;
    border-top: 1px solid #1a2e4a;
  }

  .input-box {
    display: flex; align-items: flex-end; gap: 10px;
    background: #0d1526;
    border: 1px solid #1a2e4a;
    border-radius: 14px; padding: 12px 14px;
    max-width: 800px; margin: 0 auto;
    transition: all 0.2s;
    box-shadow: 0 2px 12px #00000030;
  }

  .input-box:focus-within {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px #0ea5e915, 0 2px 12px #00000030;
  }

  textarea {
    flex: 1; background: transparent; border: none; outline: none;
    color: #c8ddf5; font-size: 14px; resize: none; font-family: inherit;
    line-height: 1.6; max-height: 180px; overflow-y: auto;
  }

  textarea::placeholder { color: #2a4060; }
  textarea:disabled { opacity: 0.4; }

  .send {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    border: none; border-radius: 10px;
    color: white; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; flex-shrink: 0;
    box-shadow: 0 2px 10px #0ea5e940;
  }

  .send:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px #0ea5e960;
  }

  .send:disabled {
    background: #111e35;
    box-shadow: none;
    cursor: not-allowed;
  }

  .hint { font-size: 11px; color: #1a2e4a; text-align: center; margin-top: 9px; }

  /* Spin */
  .spin {
    width: 14px; height: 14px; border: 2px solid #ffffff20;
    border-top-color: white; border-radius: 50%;
    animation: spin 0.7s linear infinite; display: inline-block;
  }

  .spin.large { width: 30px; height: 30px; border-width: 3px; }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Image Generator ── */
  .tool-page {
    flex: 1; overflow-y: auto; padding: 36px 32px;
    display: flex; flex-direction: column; gap: 24px; min-height: 0;
  }

  .tool-header h1 {
    font-size: 26px; font-weight: 700; margin-bottom: 6px;
    background: linear-gradient(135deg, #e8f0fe, #7dd3fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tool-header p { color: #4a6890; font-size: 14px; }

  .image-prompt-area {
    display: flex; flex-direction: column; gap: 12px; max-width: 700px;
  }

  .image-prompt-area textarea {
    background: #0d1526; border: 1px solid #1a2e4a; border-radius: 12px;
    padding: 14px; color: #c8ddf5; font-size: 14px; resize: vertical;
    font-family: inherit; outline: none; line-height: 1.6;
    transition: border-color 0.2s;
  }

  .image-prompt-area textarea:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px #0ea5e915;
  }

  .generate-btn {
    padding: 12px 28px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    border: none; border-radius: 10px;
    color: white; font-size: 15px; font-weight: 600;
    cursor: pointer; width: fit-content;
    transition: all 0.2s;
    box-shadow: 0 4px 16px #0ea5e940;
  }

  .generate-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px #0ea5e960;
  }

  .generate-btn:disabled { background: #111e35; box-shadow: none; cursor: not-allowed; }

  .image-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px; max-width: 700px;
  }

  .image-card {
    background: #0d1526; border: 1px solid #1a2e4a; border-radius: 14px;
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .image-card:hover { border-color: #0ea5e960; box-shadow: 0 4px 20px #0ea5e920; }

  .img-placeholder {
    height: 280px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 12px; color: #2a4060;
  }

  .image-card img { width: 100%; display: block; }

  .img-actions { padding: 10px 14px; background: #0a1120; border-top: 1px solid #1a2e4a; }

  .dl-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 14px; background: #111e35;
    border: 1px solid #1a2e4a;
    border-radius: 7px; color: #7a9cc0;
    text-decoration: none; font-size: 13px;
    transition: all 0.15s;
  }

  .dl-btn:hover { background: #1a2e4a; color: #bce0f8; }

  .img-generating-state {
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    padding: 48px 20px; text-align: center; color: #4a6890; max-width: 700px;
  }
  .img-generating-state p { font-size: 15px; color: #7ab0d8; }
  .img-wait-note { font-size: 12px; color: #2a4060; }

  .img-error-state {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 32px; text-align: center; max-width: 700px;
    background: #1a0c0c; border: 1px solid #4a1a1a; border-radius: 12px;
    color: #f87171;
  }
  .img-error-state span { font-size: 32px; }
  .img-error-state p { font-size: 14px; }

  .image-examples { max-width: 700px; }
  .examples-label { font-size: 13px; color: #2a4060; margin-bottom: 10px; }

  /* Content writer type bar */
  .content-type-bar {
    display: flex; flex-wrap: wrap; gap: 6px;
    max-width: 800px; margin: 0 auto 12px;
  }

  .type-pill {
    padding: 5px 14px; background: #0d1526;
    border: 1px solid #1a2e4a;
    border-radius: 18px; color: #4a6890; font-size: 12px; cursor: pointer;
    transition: all 0.15s;
  }

  .type-pill:hover { background: #111e35; color: #7ab0d8; }

  .type-pill.active {
    background: #0c2040;
    border-color: #0ea5e9;
    color: #38bdf8;
    box-shadow: 0 0 8px #0ea5e920;
  }

  /* Translator lang bar */
  .lang-bar {
    display: flex; align-items: center; gap: 12px;
    max-width: 800px; margin: 0 auto 12px;
  }

  .lang-bar select {
    background: #0d1526; border: 1px solid #1a2e4a; border-radius: 9px;
    color: #c8ddf5; padding: 8px 14px; font-size: 13px; outline: none;
    cursor: pointer; transition: border-color 0.2s;
  }

  .lang-bar select:focus { border-color: #0ea5e9; }

  .arrow { color: #0ea5e9; font-size: 18px; }

  /* URL Reader */
  .url-loaded-banner {
    display: flex; align-items: flex-start; gap: 14px;
    background: #0c2040; border: 1px solid #0ea5e940;
    border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;
    max-width: 800px; margin-left: auto; margin-right: auto; width: 100%;
  }

  .url-icon { font-size: 22px; flex-shrink: 0; }
  .url-loaded-title { font-size: 14px; font-weight: 600; color: #bce0f8; margin-bottom: 3px; }
  .url-loaded-sub { font-size: 12px; color: #4a7a9a; }

  .url-status {
    text-align: center; color: #4a7a9a; font-size: 14px;
    padding: 32px; animation: pulse 1.5s infinite;
  }

  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  .url-loaded-bar {
    display: flex; align-items: center; justify-content: space-between;
    max-width: 800px; margin: 0 auto 10px;
    background: #0c2040; border: 1px solid #1a3a5c;
    border-radius: 8px; padding: 8px 14px;
  }

  .url-tag { font-size: 12px; color: #38bdf8; }

  .change-url-btn {
    background: #111e35; border: 1px solid #1a2e4a;
    border-radius: 6px; color: #7a9cc0; font-size: 12px;
    padding: 4px 10px; cursor: pointer; transition: all 0.15s;
  }

  .change-url-btn:hover { background: #1a2e4a; color: #bce0f8; }

  .input-box input[type="url"] {
    flex: 1; background: transparent; border: none; outline: none;
    color: #c8ddf5; font-size: 14px; font-family: inherit; line-height: 1.6;
  }

  .input-box input[type="url"]::placeholder { color: #2a4060; }

  /* Responsive */
  @media (max-width: 600px) {
    .sidebar { display: none; }
  }
</style>
