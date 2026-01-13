export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';

  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API Key Missing' });
  }

  // ✅ กัน body พัง
  const body = req.body || {};
  let history = body.history;

  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'Invalid history format' });
  }

  history = history.slice(-6);

  const cacheKey = makeCacheKey(history);
  const cachedReply = getCache(cacheKey);
  if (cachedReply) {
    return res.status(200).json({
      reply: cachedReply,
      cached: true
    });
  }

  await waitForSlot();
  activeCount++;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: history,
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 512
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || 'Gemini API Error'
      });
    }

    const aiReply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'ไม่สามารถสร้างคำตอบได้';

    setCache(cacheKey, aiReply);

    return res.status(200).json({
      reply: aiReply,
      cached: false
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Worker crashed',
      detail: err.message
    });
  } finally {
    // ✅ สำคัญมาก
    activeCount--;
  }
}
