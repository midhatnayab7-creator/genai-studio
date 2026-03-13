const SYSTEM_PROMPTS = {
  chat: `You are a helpful, intelligent personal AI assistant. Be concise for simple questions, detailed for complex ones. Format responses with markdown when it helps readability.`,

  code: `You are an expert software engineer. Write clean, efficient, well-commented code. Always use proper markdown code blocks with the language specified. Explain briefly what the code does.`,

  writer: `You are a professional content writer. Write compelling, well-structured content tailored to the requested format. Use proper markdown formatting.`,

  translate: `You are a professional translator. Provide accurate, natural translations only. No explanations unless asked.`,

  summarize: `You are an expert summarizer. Give a one-sentence overview, then key bullet points, then a brief conclusion. Use markdown.`
};

export async function POST({ request }) {
  const { messages, tool = 'chat' } = await request.json();

  const systemPrompt = SYSTEM_PROMPTS[tool] || SYSTEM_PROMPTS.chat;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (text) => new TextEncoder().encode(text);

      try {
        const response = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m) => ({ role: m.role, content: m.content }))
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim();
              if (raw === '[DONE]') continue;
              try {
                const parsed = JSON.parse(raw);
                const text = parsed.choices?.[0]?.delta?.content || '';
                if (text) {
                  controller.enqueue(encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch {}
            }
          }
        }

        controller.enqueue(encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const errMsg = JSON.stringify({ error: err.message || 'Unknown error' });
        controller.enqueue(encode(`data: ${errMsg}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}
