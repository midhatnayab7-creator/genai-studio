export async function GET({ url }) {
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return Response.json({ error: 'No URL provided' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GenAI-Studio/1.0)' }
    });

    if (!res.ok) {
      return Response.json({ error: `Could not fetch page: ${res.status}` }, { status: 400 });
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : targetUrl;

    // Strip HTML tags and clean up text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
      .slice(0, 10000);

    return Response.json({ title, text });
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to fetch URL' }, { status: 500 });
  }
}
