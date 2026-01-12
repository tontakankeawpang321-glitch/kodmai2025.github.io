export default async function handler(req, res) {
  // --- ส่วนที่เพิ่ม: อนุญาตให้เว็บอื่นเรียกใช้ได้ (CORS) ---
  // ใส่ '*' คืออนุญาตทุกเว็บ (สะดวกสุด)
  // หรือใส่ 'https://www.yoursite.com' ถ้าอยากระบุเจาะจง
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ถ้าเป็นการเช็คเส้นทาง (Preflight request) ให้ตอบกลับทันที
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // ----------------------------------------------------

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY; 

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server Config Error: API Key missing' });
  }

  try {
    const { history } = req.body;
    // ใช้ Model flash เพื่อความเร็วและประหยัด
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

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
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
