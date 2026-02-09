import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  type Msg = { role: 'user' | 'assistant'; content: string };
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: 'Xin chào quý khách! Tôi là trợ lý tư vấn của Kim Linh Jewelry. Tôi có thể hỗ trợ quý khách về giá vàng, sản phẩm vàng tây, hoặc kiến thức đầu tư. Xin mời quý khách đặt câu hỏi ạ 🙏',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user' as const, content: input },
      {
        role: 'assistant' as const,
        content: 'Cảm ơn quý khách đã quan tâm. Tính năng AI tư vấn sẽ sớm được kích hoạt. Quý khách có thể liên hệ trực tiếp qua hotline 098 661 7939 để được tư vấn ngay ạ 🙏',
      },
    ]);
    setInput('');
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg animate-pulse-gold hover:scale-110 transition-transform"
        aria-label="Mở chat tư vấn"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[70vh] bg-card border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-primary/5">
            <p className="font-display font-semibold text-foreground text-sm">🏮 Tư vấn Kim Linh</p>
            <p className="text-xs text-muted-foreground font-body">Phong cách Nhật – Tận tâm tư vấn</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm font-body ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Nhập câu hỏi..."
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleSend}
                className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
