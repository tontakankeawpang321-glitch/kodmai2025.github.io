export default async function handler(req, res) {
  // 1. เปิด CORS เพื่อให้เว็บของคุณ (ไม่ว่าจะรันที่ไหน) เรียกใช้ได้
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ตอบกลับทันทีถ้าเป็นการเช็ค Connection
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ถ้าไม่ใช่ POST ให้ส่ง Error กลับเป็น JSON (แก้ปัญหาเครื่องหมาย <)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. เช็ค API Key
  const API_KEY = process.env.GEMINI_API_KEY; 
  if (!API_KEY) {
    return res.status(500).json({ error: 'Server Error: API Key is missing in Vercel Settings' });
  }

  try {
    const { history } = req.body;
    
    // ✅ ใช้รุ่น latest เพื่อความชัวร์ที่สุด
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: history })
    });

    const data = await response.json();

    // ถ้า Google แจ้ง Error
    if (!response.ok) {
      const errorMsg = data.error?.message || 'Unknown Gemini Error';
      throw new Error(errorMsg);
    }
    
    // 3. ส่งคำตอบกลับ
    const aiReply = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply: aiReply });

  } catch (error) {
    console.error("Backend Error:", error);
    // ส่ง Error กลับเป็น JSON เสมอ
    res.status(500).json({ error: error.message });
  }
}
