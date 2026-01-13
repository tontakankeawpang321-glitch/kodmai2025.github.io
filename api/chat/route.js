<script type="module">
/* ===============================
   Chatbot Backend Logic (FIXED)
   =============================== */
const BACKEND_URL = 'https://kodmai2025-github-io.vercel.app/api/chat';

let chatHistory = [];
const chatHistoryEl = document.getElementById('chat-history');
const userInput   = document.getElementById('user-input');
const sendBtn     = document.getElementById('send-btn');
const newChatBtn  = document.getElementById('new-chat-btn');
const thinkingIndicator = document.getElementById('thinking-indicator');

/* ---------- UI Helpers ---------- */
function addChatBubble(message, isUser = true) {
  const bubbleType = isUser ? 'user' : 'model';

  const iconContent = isUser 
    ? `<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
         <span class="material-symbols-rounded text-gray-500 text-sm">person</span>
       </div>` 
    : `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm text-white">
         <span class="material-symbols-rounded text-sm">smart_toy</span>
       </div>`;

  const wrap = document.createElement('div');
  wrap.className = `flex items-start space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-bubble-${bubbleType}`;

  const safeMessage = (message || '').replace(/\n/g, '<br>');
  bubble.innerHTML = `<p>${safeMessage}</p>`;

  wrap.innerHTML = iconContent;
  wrap.appendChild(bubble);

  chatHistoryEl.appendChild(wrap);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function addChatError(message) {
  const w = document.createElement('div');
  w.className = 'flex justify-center my-4';
  w.innerHTML = `
    <span class="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-full border border-red-100 flex items-center gap-1">
      <span class="material-symbols-rounded text-sm">error</span>
      ${message}
    </span>`;
  chatHistoryEl.appendChild(w);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

function setThinking(on) {
  thinkingIndicator.classList.toggle('hidden', !on);
  if (on) chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

/* ---------- Send Logic ---------- */
async function handleSend() {
  const message = (userInput.value || '').trim();
  if (!message) return;

  addChatBubble(message, true);
  userInput.value = '';
  setThinking(true);
  sendBtn.disabled = true;

  chatHistory.push({ role: "user", parts: [{ text: message }] });
  chatHistory = chatHistory.slice(-6); // ✅ ลด token ตั้งแต่หน้าเว็บ

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: chatHistory })
    });

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await response.json();
    const aiReply = data.reply || 'ไม่สามารถตอบได้ในขณะนี้';

    chatHistory.push({ role: "model", parts: [{ text: aiReply }] });
    chatHistory = chatHistory.slice(-6);

    setThinking(false);
    addChatBubble(aiReply, false);

  } catch (err) {
    console.error("Fetch Error:", err);
    setThinking(false);
    addChatError(`ขออภัย ระบบขัดข้อง: ${err.message}`);
    chatHistory.pop(); // กัน history ค้าง
  } finally {
    sendBtn.disabled = false;
    setTimeout(() => userInput.focus(), 100);
  }
}

/* ---------- Events ---------- */
sendBtn.addEventListener('click', handleSend);

userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

newChatBtn.addEventListener('click', () => {
  chatHistoryEl.innerHTML = `
    <div class="flex items-start space-x-2">
      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-sm text-white">
        <span class="material-symbols-rounded text-sm">smart_toy</span>
      </div>
      <div class="chat-bubble chat-bubble-model">
        <p>เริ่มสนทนาใหม่เรียบร้อยครับ ถามผมได้เลย!</p>
      </div>
    </div>`;
  chatHistory = [];
  userInput.value = '';
  setThinking(false);
});

/* ---------- Modal Logic (เหมือนเดิม) ---------- */
const fabToggle = document.getElementById('fab-chat-toggle');
const chatModal = document.getElementById('chatbot-modal');
const chatbotCloseBtn = document.getElementById('chatbot-close-btn');
const chatWindowInner = document.getElementById('chat-window-inner');

if (fabToggle && chatModal && chatbotCloseBtn) {
  fabToggle.addEventListener('click', () => {
    chatModal.classList.remove('chatbot-hidden', 'opacity-0', 'pointer-events-none');
    chatWindowInner.classList.remove('translate-y-full', 'scale-95');
    fabToggle.style.transform = 'scale(0)';
    setTimeout(() => userInput.focus(), 300);
  });

  chatbotCloseBtn.addEventListener('click', () => {
    chatWindowInner.classList.add('translate-y-full', 'scale-95');
    setTimeout(() => {
      chatModal.classList.add('opacity-0', 'pointer-events-none', 'chatbot-hidden');
      fabToggle.style.transform = 'scale(1)';
    }, 300);
  });
}
</script>
