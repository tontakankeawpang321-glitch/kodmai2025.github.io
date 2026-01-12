export default async function handler(req, res) {
  // --- ตั้งค่า Header เพื่อให้เว็บอื่นเรียกใช้ได้ (CORS) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ถ้าเป็นการเช็คเส้นทาง (Preflight request) ให้ตอบกลับทันที
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ถ้าไม่ใช่การส่งข้อมูลแบบ POST ให้แจ้งเตือน
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY; 

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server Config Error: API Key missing' });
  }

  try {
    const { history } = req.body;
    
    // ✅ ใช้ URL รุ่นล่าสุดที่เสถียร (แก้ปัญหาหา Model ไม่เจอ)
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent?key=${API_KEY}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: history })
    });

    const data = await response.json();

    // ถ้า Google แจ้ง Error กลับมา
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API Error');
    }
    
    // ดึงคำตอบส่งกลับไปที่หน้าเว็บ
    const aiReply = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: error.message });
  }
}
