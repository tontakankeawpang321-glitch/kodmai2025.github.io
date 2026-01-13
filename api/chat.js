// ==================================================
// CONFIG
// ==================================================
const RATE_LIMIT = {
  WINDOW_MS: 60_000, // 1 นาที
  MAX_REQ: 20        // 20 ครั้ง / IP / นาที
};

const CACHE_TTL = 5 * 60_000; // 5 นาที
const MAX_CONCURRENT = 2;     // เรียก Gemini พร้อมกันได้กี่งาน
const QUEUE_DELAY = 300;      // ms รอคิว

// ==================================================
// STORES (in-memory)
// ==================================================
const ipStore = new Map();
const cacheStore = new Map();

let activeCount = 0;

// ==================================================
// UTILS
// ==================================================
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ---------- Rate limit ----------
function rateLimit(ip) {
  const now = Date.now();
  const record = ipStore.get(ip) || { count: 0, start: now };

  if (now - record.start > RATE_LIMIT.WINDOW_MS) {
    record.count = 1;
    record.start = now;
  } else {
    record.count++;
  }

  ipStore.set(ip, record);
  return record.count <= RATE_LIMIT.MAX_REQ;
}

// ---------- Cache ----------
function getCache(key) {
  const cached = cacheStore.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expire) {
    cacheStore.delete(key);
    return null;
  }
  return cached.value;
}

function setCache(key, value) {
  cacheStore.set(key, {
    value,
    expire: Date.now() + CACHE_TTL
  });
}

function makeCacheKey(history) {
  const lastUserMsg =
    history
      ?.slice()
      .reverse()
      .find(h => h.role === 'user')
      ?.parts?.[0]?.text ||
    JSON.stringify(history);

  return lastUserMsg
    .trim()
    .toLowerCase()
    .slice(0, 300);
}

// ---------- Queue ----------
async function waitForSlot() {
  while (activeCount >= MAX_CONCURRENT) {
    await sleep(QUEUE_DELAY);
  }
}

// ==================================================
// HANDLER
// ==================================================
export default async function handler(req, res) {
  // -------------------------------
  // CORS
  // -------------------------------
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // -------------------------------
  // IP + Rate limit
  // -------------------------------
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown';

  if (!rateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many requests, please slow down'
    });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'API Key Missing' });
  }

  try {
    let { history } = req.body;

    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'Invalid history format' });
    }

    // -------------------------------
    // Reduce token
    // -------------------------------
    history = history.slice(-6);

    // -------------------------------
    // Cache check
    // -------------------------------
    const cacheKey = makeCacheKey(history);
    const cachedReply = getCache(cacheKey);

    if (cachedReply) {
      return res.status(200).json({
        reply: cachedReply,
        cached: true,
        queued: false
      });
    }

    // -------------------------------
    // Queue (ยอมช้าได้)
    // -------------------------------
    await waitForSlot();
    activeCount++;

    // -------------------------------
    // Gemini call
    // -------------------------------
    const GEMINI_URL =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: history,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 512
        }
      })
    });

    if (response.status === 429) {
      return res.status(429).json({
        error: 'AI is busy, please try again later'
      });
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini Error:', data);
      return res.status(500).json({
        error: data.error?.message || 'Gemini API Error'
      });
    }

    const aiReply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'ไม่สามารถสร้างคำตอบได้';

    // -------------------------------
