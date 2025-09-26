import { useState, useRef, useEffect } from 'preact/hooks';
import axios from 'axios';
import { marked } from 'marked';

// Configure marked to be synchronous
marked.setOptions({
  async: false
});

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const Chatbot: preact.FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearChat = () => {
    setMessages([]);
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Rate limiting: prevent sending messages too quickly (minimum 2 seconds between messages)
    const now = Date.now();
    if (now - lastMessageTime < 2000) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Please wait a moment before sending another message.',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    setLastMessageTime(now);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/chat`, {
        message,
        history: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        userId: 'anonymous' // Will be replaced with actual user ID
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.data.reply,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I\'m having trouble connecting right now. Please try again later!',
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chatbot Button */}
      <div className={`chatbot-button ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
        {isOpen ? '✕' : '💬'}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>GameNet3 Assistant</h3>
            <span>Your AI gaming companion</span>
            <button className="new-chat-btn" onClick={clearChat} title="Start new chat">
              📄
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.length === 0 && (
              <div className="welcome-message">
                <p>👋 Hi! I'm your AI assistant for GameNet3. I can help you with:</p>
                <ul>
                  <li>Finding and discovering games</li>
                  <li>Understanding blockchain and Web3 concepts</li>
                  <li>Navigating the platform</li>
                  <li>Answering gaming questions</li>
                </ul>
                <p>What would you like to know?</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: marked.parse(message.content) as string }} />
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="message assistant typing">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Ask me anything about gaming..."
              value={inputMessage}
              onInput={(e) => setInputMessage((e.target as HTMLInputElement).value)}
              disabled={isTyping}
            />
            <button type="submit" disabled={isTyping || !inputMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;