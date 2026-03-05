import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2, Wifi, WifiOff } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const GOLD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-gold-prices`;
const SILVER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-silver-prices`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };
const CACHE_TTL = 90_000;

// Rotating placeholders
const PLACEHOLDERS = [
  'Dạ, em cảm ơn anh/chị đã quan tâm đến tiệm vàng gia đình em ạ, em xin phép kiểm tra thông tin mới nhất để gửi mình ngay ạ…',
  'Dạ, em cảm ơn anh/chị đã tin tưởng tiệm vàng gia đình em ạ, em kiểm tra dữ liệu mới nhất và phản hồi mình ngay ạ…',
  'Dạ, em cảm ơn anh/chị đã ghé tiệm vàng gia đình em ạ, em xem lại thông tin mới nhất rồi báo mình ngay ạ…',
];
let placeholderIdx = Math.floor(Math.random() * PLACEHOLDERS.length);
function nextPlaceholder(): string {
  const msg = PLACEHOLDERS[placeholderIdx];
  placeholderIdx = (placeholderIdx + 1) % PLACEHOLDERS.length;
  return msg;
}

function getCurrentDateVN(): string {
  return new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ---------- Price cache ----------
interface PriceCache {
  gold: { data: any; ts: number } | null;
  silver: { data: any; ts: number } | null;
}
const priceCache: PriceCache = { gold: null, silver: null };

async function fetchCached(url: string, key: 'gold' | 'silver') {
  const now = Date.now();
  const cached = priceCache[key];
  if (cached && now - cached.ts < CACHE_TTL) return cached.data;
  try {
    const r = await fetch(url, { headers: AUTH_HEADER });
    if (!r.ok) throw new Error();
    const data = await r.json();
    priceCache[key] = { data, ts: Date.now() };
    return data;
  } catch {
    return cached?.data ?? null;
  }
}

// Preload on module init
fetchCached(GOLD_URL, 'gold');
fetchCached(SILVER_URL, 'silver');

// ---------- Local keyword router ----------
function formatLocalPrices(keyword: string): string | null {
  const gold = priceCache.gold?.data;
  if (!gold?.prices) return null;

  const kw = keyword.toLowerCase();
  const prices = gold.prices as Array<{ type: string; buy: string; sell: string; category: string }>;
  const dateStr = getCurrentDateVN();
  const sourceLabel = gold.isManual ? '📌 Giá thủ công (Admin)' : '🔄 Giá cập nhật tự động';

  if (kw.includes('vàng tây') || kw.includes('10k')) {
    const p = prices.find(p => p.type.includes('10K') || p.type.includes('Tây'));
    if (p) return `Theo cập nhật ${dateStr}:\n• ${p.type}: Mua ${p.buy} | Bán ${p.sell} (nghìn đồng/chỉ)\n${sourceLabel}\n\n⚡ Giá tham khảo – liên hệ 098 661 7939 để chốt giá chính xác ạ.`;
  }

  if (kw.includes('9999') || kw.includes('24k')) {
    const p = prices.find(p => p.type.includes('9999'));
    if (p) return `Theo cập nhật ${dateStr}:\n• ${p.type}: Mua ${p.buy} | Bán ${p.sell} (nghìn đồng/chỉ)\n${sourceLabel}\n\n⚡ Giá tham khảo – liên hệ 098 661 7939 để chốt giá chính xác ạ.`;
  }

  if (kw.includes('liên hệ') || kw.includes('địa chỉ') || kw.includes('hotline')) {
    return `📍 Số 50 Nguyễn Thị Minh Khai, P. Trường Sơn, Sầm Sơn, Thanh Hóa\n📞 Hotline/Zalo: 098 661 7939\n🕗 T2–CN, 8:00–17:00`;
  }

  return null;
}

// ---------- SSE stream ----------
async function streamChat(
  messages: Msg[],
  onDelta: (t: string) => void,
  onDone: () => void,
  onError: (e: string) => void,
) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...AUTH_HEADER },
    body: JSON.stringify({ messages }),
  });

  if (resp.status === 429) { onError('Hệ thống đang bận, vui lòng thử lại sau.'); return; }
  if (resp.status === 402) { onError('Dịch vụ tạm ngưng.'); return; }
  if (!resp.ok || !resp.body) { onError('Không thể kết nối, vui lòng thử lại.'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { onDone(); return; }
      try {
        const c = JSON.parse(json).choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

// ---------- Component ----------
const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: `Xin chào quý khách! 🏮 Tôi là trợ lý tư vấn của Kim Linh Jewelry.\n\nHỗ trợ: giá vàng/bạc, sản phẩm, kiến thức đầu tư.\nXin mời quý khách đặt câu hỏi ạ 🙏` },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      fetchCached(GOLD_URL, 'gold');
      fetchCached(SILVER_URL, 'silver');
    }
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    setInput('');

    // Try local answer first
    const localAnswer = formatLocalPrices(text);
    if (localAnswer) {
      setMessages(prev => [...prev, userMsg, { role: 'assistant', content: localAnswer }]);
      return;
    }

    // 2-step: show rotating placeholder immediately
    const placeholder = nextPlaceholder();
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: placeholder }]);
    setIsLoading(true);

    let assistantText = '';
    const update = (chunk: string) => {
      assistantText += chunk;
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m));
    };

    try {
      const timeout = setTimeout(() => {
        if (!assistantText) setIsLightMode(true);
      }, 5000);

      await streamChat(
        [...messages, userMsg],
        (chunk) => {
          clearTimeout(timeout);
          setIsLightMode(false);
          update(chunk);
        },
        () => { clearTimeout(timeout); setIsLoading(false); },
        (err) => {
          clearTimeout(timeout);
          const gold = priceCache.gold?.data;
          if (gold?.prices) {
            const fallback = gold.prices.map((p: any) => `• ${p.type}: Mua ${p.buy} | Bán ${p.sell}`).join('\n');
            setMessages(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: `📊 Giá tham khảo (dữ liệu gần nhất):\n${fallback}\n\n⚠️ ${err}\nLiên hệ: 098 661 7939` } : m
            ));
            setIsLightMode(true);
          } else {
            setMessages(prev => prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: `${err}\nLiên hệ: 098 661 7939` } : m
            ));
          }
          setIsLoading(false);
        },
      );
    } catch {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, content: 'Xin lỗi, có lỗi xảy ra. Liên hệ 098 661 7939 ạ 🙏' } : m
      ));
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const dateStr = getCurrentDateVN();

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        aria-label="Mở chat tư vấn"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[70vh] bg-card border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-border bg-primary/5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-display font-semibold text-foreground text-sm truncate">🏮 Tư vấn Kim Linh</p>
              <div className="flex items-center gap-1">
                {isLightMode ? <WifiOff className="w-3 h-3 text-muted-foreground" /> : <Wifi className="w-3 h-3 text-primary" />}
                <p className="text-[10px] text-muted-foreground font-body">
                  {isLightMode ? 'Đang dùng dữ liệu gần nhất' : `Cập nhật ${dateStr}`}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-secondary" aria-label="Thu gọn">
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm font-body whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-sm font-body">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                  Đang trả lời...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-2.5 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Nhập câu hỏi..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm font-body focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
