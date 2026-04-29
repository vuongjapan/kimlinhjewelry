import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  smartReply,
  QUICK_REPLIES,
  MAX_MESSAGES_PER_SESSION,
  FALLBACK_BUSY,
  LIMIT_REACHED,
  kimlinhConfig,
} from '@/data/kimlinh-chatbot-config';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-lite`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };
const STORAGE_KEY = 'kimlinh_chat_session';

const GREETING = 'Dạ em chào anh/chị! 🌟 Em là trợ lý của Kim Linh Jewelry. Anh/chị cần tư vấn gì ạ?';

function loadSession(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [{ role: 'assistant', content: GREETING }];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return [{ role: 'assistant', content: GREETING }];
}

function saveSession(msgs: Msg[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch {}
}

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(loadSession);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Đếm số tin nhắn của USER trong phiên
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const limitReached = userMsgCount >= MAX_MESSAGES_PER_SESSION;

  useEffect(() => { saveSession(messages); }, [messages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (limitReached) return;

    setShowQuickReplies(false);
    const userMsg: Msg = { role: 'user', content: trimmed };

    // 1) SMART REPLY — không tốn API
    const local = smartReply(trimmed);
    if (local) {
      setMessages(prev => [...prev, userMsg, { role: 'assistant', content: local }]);
      setInput('');
      return;
    }

    // 2) Đến API (giới hạn context: 2 tin gần nhất + tin hiện tại)
    const history: Msg[] = [...messages.slice(-2), userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json().catch(() => ({}));
      const reply: string = data?.reply || FALLBACK_BUSY;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('[chat-lite] error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: FALLBACK_BUSY }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, limitReached, messages]);

  const handleQuickReply = (query: string) => sendMessage(query);
  const handleSend = () => sendMessage(input);

  const chatPanel = isOpen ? (
    <div
      className={
        isMobile
          ? 'fixed z-50 flex flex-col bg-card border border-border shadow-2xl'
          : 'fixed bottom-20 right-4 z-50 w-[370px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[70vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden'
      }
      style={isMobile ? {
        height: '60dvh', maxHeight: '60dvh', borderRadius: '16px',
        width: '92%', maxWidth: '400px', right: '4%', bottom: '72px',
      } : undefined}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-primary/5 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <p className="font-display font-semibold text-foreground text-sm truncate">🏮 Tư vấn Kim Linh</p>
          <p className="text-[10px] text-muted-foreground font-body">
            Hotline: {kimlinhConfig.hotline}
          </p>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-secondary" aria-label="Thu gọn">
          <Minimize2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 overscroll-contain">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 font-body whitespace-pre-wrap break-words ${
              isMobile ? 'text-[16px] leading-relaxed' : 'text-sm leading-relaxed'
            } ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground rounded-2xl px-4 py-3 font-body text-sm">
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
              Em đang trả lời...
            </div>
          </div>
        )}

        {/* Quick replies */}
        {showQuickReplies && !limitReached && messages.length <= 2 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q.label}
                onClick={() => handleQuickReply(q.query)}
                className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-body hover:bg-primary/10 transition"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {limitReached && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm font-body">
              {LIMIT_REACHED}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className={`shrink-0 border-t border-border bg-card ${isMobile ? 'px-3 py-2.5 pb-[max(env(safe-area-inset-bottom,8px),8px)]' : 'p-2.5'}`}>
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="send"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={limitReached ? `Gọi ${kimlinhConfig.hotline}` : 'Nhập câu hỏi...'}
            disabled={isLoading || limitReached}
            className="flex-1 px-3.5 py-3 rounded-xl border border-input bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || limitReached}
            className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 shrink-0"
            aria-label="Gửi"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {!(isMobile && isOpen) && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 h-14 rounded-full text-white shadow-lg hover:scale-105 transition-transform font-body font-semibold"
          style={{ backgroundColor: '#D4AF37' }}
          aria-label="Mở chat tư vấn"
        >
          {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          <span className="text-sm">Tư Vấn</span>
        </button>
      )}
      {chatPanel}
    </>
  );
};

export default AIChatWidget;