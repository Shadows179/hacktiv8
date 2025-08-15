document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');
  
  // Simpan histori percakapan
  let conversationHistory = [];

  // Fungsi untuk format waktu
  function formatTimestamp(date) {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  }

function appendMessage(role, text) {
  const msgContainer = document.createElement('div');
  msgContainer.classList.add('message-container', role);
  
  const msg = document.createElement('div');
  msg.classList.add('message', role === 'user' ? 'user' : 'bot');
  
  // Memproses teks untuk format yang lebih baik
  const processedText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
    .replace(/\n(\d+\.\s+)/g, '\n• ') // Ubah penomoran menjadi bullet points
    .replace(/\n/g, '<br>'); // Ganti newline dengan <br>
  
  msg.innerHTML = processedText;
  
  // Tambahkan timestamp
  const timestamp = document.createElement('div');
  timestamp.classList.add('timestamp');
  timestamp.textContent = formatTimestamp(new Date());
  
  msgContainer.appendChild(msg);
  msgContainer.appendChild(timestamp);
  
  chatBox.appendChild(msgContainer);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msgContainer;
}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userMessage = input.value.trim();
    if (!userMessage) return;

    // Tambahkan pesan user ke UI dan histori
    appendMessage('user', userMessage);
    conversationHistory.push({ 
      role: "user", 
      content: userMessage,
      timestamp: new Date().toISOString() // Simpan timestamp
    });
    
    input.value = '';
    input.focus();

    // Tampilkan pesan "Thinking..."
    const thinkingMsg = appendMessage('bot', 'Gemini is thinking...');

    try {
      // Kirim permintaan ke backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.result) {
        // Update pesan thinking dengan respons aktual
        const botMessage = data.result;
        thinkingMsg.querySelector('.message').textContent = botMessage;
        
        // Tambahkan ke histori percakapan
        conversationHistory.push({ 
          role: "assistant", 
          content: botMessage,
          timestamp: new Date().toISOString() // Simpan timestamp
        });
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('Chat error:', error);
      thinkingMsg.querySelector('.message').textContent = 'Sorry, I encountered an error. Please try again.';
      thinkingMsg.classList.add('error');
    }
  });
});