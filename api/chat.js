export default async function handler(req, res) {
  // 1. ตรวจสอบว่าเป็น Method POST หรือไม่
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. ดึงข้อความที่ส่งมาจากหน้าเว็บ
  const { history } = req.body;
  
  // 3. ดึง API Key จากที่ซ่อน (Environment Variable)
  const API_KEY = process.env.GEMINI_API_KEY; 

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server Warning: API Key is missing' });
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  try {
    // 4. ส่งข้อมูลไปหา Google Gemini
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: history })
    });

    const data = await response.json();

    // 5. ส่งคำตอบกลับไปที่หน้าเว็บ
    if (!response.ok) throw new Error(data.error?.message || 'Gemini API Error');
    
    // ดึงเฉพาะข้อความตอบกลับเพื่อส่งคืน
    const aiReply = data.candidates[0].content.parts[0].text;
    res.status(200).json({ reply: aiReply });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}