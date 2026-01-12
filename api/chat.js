export default async function handler(req, res) {
  // 1. ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY; 
  if (!API_KEY) {
    return res.status(500).json({ error: 'API Key Missing' });
  }

  try {
    const { history } = req.body;
    
    // ✅ ใช้รุ่นล่าสุดที่คุณมี: gemini-2.5-flash
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: history })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API Error');
    }
    
    const aiReply = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: error.message });
  }
}
