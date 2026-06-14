export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m3u8Url = url.searchParams.get('url');

    if (!m3u8Url) {
      return new Response('Missing url parameter', { status: 400 });
    }

    try {
      const response = await fetch(m3u8Url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        return new Response(`Failed to fetch m3u8: ${response.status}`, { status: response.status });
      }

      let text = await response.text();
      const baseUrl = new URL(m3u8Url);
      
      // Rewrite relative URLs to absolute URLs
      const lines = text.split('\n');
      const rewrittenLines = lines.map(line => {
        line = line.trim();
        // Skip empty lines and tags
        if (line === '' || line.startsWith('#')) {
          return line;
        }
        
        // If it's already an absolute URL, leave it
        if (line.startsWith('http://') || line.startsWith('https://')) {
          return line;
        }
        
        // Rewrite relative to absolute
        try {
          const absoluteUrl = new URL(line, baseUrl.href).href;
          return absoluteUrl;
        } catch (e) {
          return line;
        }
      });

      text = rewrittenLines.join('\n');

      return new Response(text, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }
};
