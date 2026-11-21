import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/tts?word=hello — Google Translate TTS proxy
router.get('/', async (req: Request, res: Response) => {
  try {
    const word = req.query.word as string;

    if (!word || !word.trim()) {
      return res.status(400).json({ error: 'word query parameter is required' });
    }

    const ttsUrl =
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word.trim())}&tl=en&client=tw-ob`;

    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      console.error(`TTS fetch failed: ${response.status} ${response.statusText}`);
      return res.status(502).json({ error: 'TTS fetch failed' });
    }

    // Stream the MP3 audio back to the client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('TTS proxy error:', error);
    res.status(500).json({ error: 'Internal TTS error' });
  }
});

export default router;

