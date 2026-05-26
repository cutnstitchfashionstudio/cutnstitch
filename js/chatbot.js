document.addEventListener('DOMContentLoaded', () => {
  // Inject CSS
  const style = document.createElement('style');
  style.innerHTML = `
    .chatbot-widget {
      position: fixed;
      bottom: 100px;
      right: var(--sp-6);
      width: 350px;
      height: 500px;
      max-height: calc(100vh - 120px);
      background: var(--c-white);
      border-radius: var(--r-xl);
      box-shadow: var(--sh-xl);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all var(--dur-base) var(--ease-bounce);
    }
    .chatbot-widget.active {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    .chat-header {
      background: var(--grad-primary);
      color: var(--c-white);
      padding: var(--sp-4);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chat-title {
      font-family: var(--ff-heading);
      font-size: var(--fs-lg);
      font-weight: var(--fw-bold);
      display: flex; align-items: center; gap: 8px;
    }
    .chat-close { 
      color: var(--c-white); opacity: 0.8; font-size: 28px; line-height: 1; 
      border: none; background: transparent; cursor: pointer; padding: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .chat-close:hover { opacity: 1; }
    
    .chat-body {
      flex: 1;
      padding: var(--sp-4);
      overflow-y: auto;
      background: var(--c-pearl);
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }
    
    .msg { max-width: 80%; padding: var(--sp-3); border-radius: var(--r-md); font-size: var(--fs-sm); animation: chatSlide 0.3s ease; }
    .msg-bot { background: var(--c-white); color: var(--c-text); border-bottom-left-radius: 0; align-self: flex-start; box-shadow: var(--sh-xs); }
    .msg-user { background: var(--c-primary); color: var(--c-white); border-bottom-right-radius: 0; align-self: flex-end; }
    
    .chat-input {
      padding: var(--sp-4);
      background: var(--c-white);
      border-top: 1px solid var(--c-border);
      display: flex; gap: var(--sp-2);
    }
    .chat-input input { flex: 1; background: var(--c-pearl); border-radius: var(--r-full); padding: 0 var(--sp-4); }
    .chat-input button {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--c-gold); color: var(--c-white);
      display: flex; align-items: center; justify-content: center;
    }

    .chat-toggle {
      position: fixed;
      bottom: 100px; right: var(--sp-6);
      width: 60px; height: 60px;
      background: var(--c-primary); color: var(--c-white);
      border-radius: 50%; box-shadow: var(--sh-md);
      display: flex; align-items: center; justify-content: center;
      z-index: 9998; cursor: pointer; transition: transform var(--dur-fast);
    }
    .chat-toggle:hover { transform: scale(1.1); }

    @media (max-width: 768px) {
      .chatbot-widget { right: 0; bottom: 0; width: 100%; height: 100%; border-radius: 0; }
      .chat-toggle { bottom: 100px; }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  const chatContainer = document.createElement('div');
  chatContainer.innerHTML = `
    <div class="chat-toggle" id="chat-toggle">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
    <div class="chatbot-widget" id="chatbot">
      <div class="chat-header">
        <div class="chat-title">✨ Nazia AI</div>
        <button class="chat-close" id="chat-close">&times;</button>
      </div>
      <div class="chat-body" id="chat-body">
        <div class="msg msg-bot">Hello! I'm Nazia AI. How can I help you today? You can ask me about stitching costs, fabric choices, or booking an appointment.</div>
      </div>
      <div class="chat-input">
        <input type="text" id="chat-input-field" placeholder="Type your message...">
        <button id="chat-send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>
      </div>
    </div>
  `;
  document.body.appendChild(chatContainer);

  const toggle = document.getElementById('chat-toggle');
  const widget = document.getElementById('chatbot');
  const close = document.getElementById('chat-close');
  const input = document.getElementById('chat-input-field');
  const send = document.getElementById('chat-send');
  const body = document.getElementById('chat-body');

  toggle.addEventListener('click', () => { widget.classList.add('active'); toggle.style.display = 'none'; });
  close.addEventListener('click', () => { widget.classList.remove('active'); toggle.style.display = 'flex'; });

  function addMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `msg ${isUser ? 'msg-user' : 'msg-bot'}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, true);
    input.value = '';

    // Simulate AI Response
    setTimeout(() => {
      const lower = text.toLowerCase();
      let reply = "I'm sorry, I didn't catch that. Can I connect you with our senior designer on WhatsApp?";
      
      if (lower.includes('cost') || lower.includes('price') || lower.includes('how much')) {
        reply = "Basic stitching starts at Rs. 3,500. For bespoke bridal or heavy embroidery, please share your design details for a precise quote.";
      } else if (lower.includes('book') || lower.includes('appointment')) {
        reply = "I'd love to help! Please visit our Contact page or click the WhatsApp button to schedule a time.";
      } else if (lower.includes('fabric') || lower.includes('material')) {
        reply = "We source premium fabrics including pure silk, chiffon, raw silk, and luxury lawn. Our designers can help you select the best fabric for your design.";
      }

      addMessage(reply, false);
    }, 800);
  }

  send.addEventListener('click', handleSend);
  input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
});
