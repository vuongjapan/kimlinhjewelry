import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL = 90_000;
const SEARCH_CACHE_TTL = 300_000; // 5 min for web search results

let goldCache: { data: string; ts: number } | null = null;
let silverCache: { data: string; ts: number } | null = null;
let manualGoldCache: { data: string | null; ts: number } | null = null;
let manualSilverCache: { data: string | null; ts: number } | null = null;
let brandedGoldCache: { data: string; ts: number } | null = null;
let brandedSilverCache: { data: string; ts: number } | null = null;
let worldGoldCache: { data: string; ts: number } | null = null;
let worldSilverCache: { data: string; ts: number } | null = null;
let searchCache: Map<string, { data: string; ts: number }> = new Map();

function getCurrentDate(): string {
  return new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
}

function getSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ---------- Visitor Memory ----------
async function getVisitorMemory(visitorId: string): Promise<Record<string, any>> {
  if (!visitorId) return {};
  try {
    const sb = getSupabaseClient();
    const { data } = await sb.from('chat_memories').select('memory').eq('visitor_id', visitorId).maybeSingle();
    return (data?.memory as Record<string, any>) || {};
  } catch (e) {
    console.error("Memory fetch error:", e);
    return {};
  }
}

async function saveVisitorMemory(visitorId: string, memory: Record<string, any>): Promise<void> {
  if (!visitorId || Object.keys(memory).length === 0) return;
  try {
    const sb = getSupabaseClient();
    await sb.from('chat_memories').upsert({
      visitor_id: visitorId,
      memory,
      last_conversation_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'visitor_id' });
  } catch (e) {
    console.error("Memory save error:", e);
  }
}

function extractInfoFromMessages(messages: Array<{ role: string; content: string }>, existingMemory: Record<string, any>): Record<string, any> {
  const memory = { ...existingMemory };
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const text = msg.content.toLowerCase();
    const namePatterns = [
      /(?:tên\s+(?:em|tôi|mình|anh|chị)\s+(?:là|la)\s+)([^\s,.!?]+(?:\s+[^\s,.!?]+)?)/i,
      /(?:em\s+(?:là|la|tên)\s+)([^\s,.!?]+(?:\s+[^\s,.!?]+)?)/i,
      /(?:mình\s+(?:là|la|tên)\s+)([^\s,.!?]+(?:\s+[^\s,.!?]+)?)/i,
      /(?:anh\s+(?:là|la|tên)\s+)([^\s,.!?]+(?:\s+[^\s,.!?]+)?)/i,
      /(?:chị\s+(?:là|la|tên)\s+)([^\s,.!?]+(?:\s+[^\s,.!?]+)?)/i,
      /(?:gọi\s+(?:em|tôi|mình)\s+(?:là|la)\s+)([^\s,.!?]+(?:\s+[^\s,.!?]+)?)/i,
    ];
    for (const pattern of namePatterns) {
      const match = msg.content.match(pattern);
      if (match?.[1]) {
        const name = match[1].trim();
        if (name.length >= 2 && name.length <= 30) memory.name = name;
      }
    }
    if (text.includes('nhẫn cưới') || text.includes('nhan cuoi')) memory.interest_wedding = true;
    if (text.includes('đầu tư') || text.includes('dau tu')) memory.interest_investment = true;
    if (text.includes('quà') || text.includes('tặng')) memory.interest_gift = true;
    if (text.includes('vàng tây') || text.includes('10k') || text.includes('14k') || text.includes('18k')) memory.interest_gold_western = true;
    if (text.includes('9999') || text.includes('24k') || text.includes('sjc')) memory.interest_gold_pure = true;
    if (text.includes('bạc')) memory.interest_silver = true;
    const phoneMatch = msg.content.match(/(?:0\d{9,10})/);
    if (phoneMatch) memory.phone = phoneMatch[0];
  }
  memory.visit_count = (memory.visit_count || 0) + 1;
  memory.last_visit = getCurrentDate();
  return memory;
}

function buildMemoryContext(memory: Record<string, any>): string {
  if (!memory || Object.keys(memory).length === 0) return '';
  let ctx = '\n\n--- THÔNG TIN KHÁCH HÀNG (từ các cuộc trò chuyện trước) ---\n';
  if (memory.name) ctx += `- Tên khách: ${memory.name}\n`;
  if (memory.phone) ctx += `- SĐT: ${memory.phone}\n`;
  if (memory.visit_count > 1) ctx += `- Đã trò chuyện ${memory.visit_count} lần\n`;
  if (memory.last_visit) ctx += `- Lần ghé gần nhất: ${memory.last_visit}\n`;
  const interests: string[] = [];
  if (memory.interest_wedding) interests.push('nhẫn cưới');
  if (memory.interest_investment) interests.push('đầu tư vàng');
  if (memory.interest_gift) interests.push('mua quà tặng');
  if (memory.interest_gold_western) interests.push('vàng tây');
  if (memory.interest_gold_pure) interests.push('vàng 9999/SJC');
  if (memory.interest_silver) interests.push('bạc');
  if (interests.length > 0) ctx += `- Quan tâm: ${interests.join(', ')}\n`;
  ctx += `Hãy sử dụng thông tin này để tư vấn tự nhiên hơn. Nếu biết tên khách, hãy xưng hô bằng tên.\n---`;
  return ctx;
}

// ---------- Web Search via Firecrawl ----------
async function searchWeb(query: string): Promise<string> {
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL) return cached.data;

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) return '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 3 }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return '';
    const result = await response.json();
    const items = result.data || [];
    if (items.length === 0) return '';

    let text = '';
    for (const item of items.slice(0, 3)) {
      const title = item.title || '';
      const desc = item.description || '';
      const markdown = item.markdown ? item.markdown.slice(0, 500) : '';
      text += `- ${title}: ${desc || markdown}\n`;
    }

    const data = text.trim();
    searchCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (e) {
    console.error("Web search error:", e);
    return '';
  }
}

function detectSearchTopics(lastUserMsg: string): string[] {
  const text = lastUserMsg.toLowerCase();
  const queries: string[] = [];

  // Weather
  if (text.includes('thời tiết') || text.includes('mưa') || text.includes('nắng') || text.includes('bão') || text.includes('weather')) {
    queries.push('thời tiết Sầm Sơn Thanh Hóa hôm nay');
  }

  // Geopolitics, wars, economy
  if (text.includes('chiến tranh') || text.includes('xung đột') || text.includes('căng thẳng') || text.includes('địa chính trị') ||
      text.includes('kinh tế') || text.includes('lạm phát') || text.includes('fed') || text.includes('trung quốc') ||
      text.includes('mỹ') || text.includes('ukraine') || text.includes('nga') || text.includes('iran') || text.includes('israel') ||
      text.includes('trump') || text.includes('biden') || text.includes('thuế') || text.includes('tariff') ||
      text.includes('tình hình') || text.includes('thế giới') || text.includes('nên mua') || text.includes('nên bán') ||
      text.includes('xu hướng') || text.includes('dự báo') || text.includes('phân tích')) {
    queries.push('tình hình kinh tế thế giới chiến tranh địa chính trị mới nhất ' + getCurrentDate());
    queries.push('giá vàng xu hướng phân tích dự báo mới nhất');
  }

  // Sầm Sơn tourism/history
  if (text.includes('sầm sơn') || text.includes('du lịch') || text.includes('biển') || text.includes('lịch sử') ||
      text.includes('ẩm thực') || text.includes('đặc sản') || text.includes('chơi gì') || text.includes('ăn gì') ||
      text.includes('khách sạn') || text.includes('resort')) {
    queries.push('du lịch Sầm Sơn Thanh Hóa điểm đến ẩm thực đặc sản');
  }

  // Feng shui / astrology
  if (text.includes('phong thủy') || text.includes('tuổi') || text.includes('mệnh') || text.includes('hợp') ||
      text.includes('ngày tốt') || text.includes('ngày đẹp') || text.includes('cưới')) {
    queries.push('phong thủy vàng trang sức mệnh tuổi hợp');
  }

  // Health
  if (text.includes('sức khỏe') || text.includes('tốt cho') || text.includes('bạc tốt') || text.includes('vàng tốt') ||
      text.includes('đeo vàng') || text.includes('đeo bạc') || text.includes('dị ứng')) {
    queries.push('lợi ích đeo vàng bạc sức khỏe');
  }

  return queries;
}

// ---------- Price fetchers (unchanged logic) ----------
async function fetchManualPrices(type: 'gold' | 'silver'): Promise<string | null> {
  const cacheRef = type === 'gold' ? manualGoldCache : manualSilverCache;
  const now = Date.now();
  if (cacheRef && now - cacheRef.ts < CACHE_TTL) return cacheRef.data;

  try {
    const sb = getSupabaseClient();
    const settingKey = type === 'gold' ? 'gold_price_manual' : 'silver_price_manual';
    const { data: setting } = await sb.from('site_settings').select('value').eq('key', settingKey).maybeSingle();
    const isManual = (setting?.value as any)?.enabled === true;

    if (!isManual) {
      const result = { data: null, ts: now };
      if (type === 'gold') manualGoldCache = result; else manualSilverCache = result;
      return null;
    }

    const { data: overrides } = await sb.from('price_overrides').select('*').eq('price_type', type).eq('is_active', true);
    if (!overrides?.length) {
      const result = { data: null, ts: now };
      if (type === 'gold') manualGoldCache = result; else manualSilverCache = result;
      return null;
    }

    const label = type === 'gold' ? 'GIÁ VÀNG THỦ CÔNG (Admin cập nhật)' : 'GIÁ BẠC THỦ CÔNG (Admin cập nhật)';
    let text = `${label}:\n`;
    for (const o of overrides) {
      text += `- ${o.item_name}: Mua ${o.buy_price || '—'} | Bán ${o.sell_price || '—'}\n`;
    }

    const result = { data: text, ts: now };
    if (type === 'gold') manualGoldCache = result; else manualSilverCache = result;
    return text;
  } catch (e) {
    console.error(`Manual ${type} price fetch error:`, e);
    return cacheRef?.data ?? null;
  }
}

async function fetchGoldPrices(): Promise<string> {
  const now = Date.now();
  if (goldCache && now - goldCache.ts < CACHE_TTL) return goldCache.data;

  try {
    const response = await fetch("https://vangmlc.vn/includes/view/api_proxy.php", {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", Referer: "https://vangmlc.vn/" },
    });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();

    const valueMap: Record<string, string> = {};
    for (const item of data) {
      const key = Object.keys(item)[0];
      valueMap[key] = Object.values(item)[0] as string;
    }

    const fmt = (raw: string) => { const n = parseInt(raw, 10); return isNaN(n) ? raw : n.toLocaleString("vi-VN"); };
    const adj = (raw: string, a: number) => { const n = parseInt(raw, 10); return isNaN(n) ? raw : String(n + a); };

    const rows = [
      { row: 1, name: "Nhẫn Ép Vỉ 9999 (24K)", cat: "Vàng ta" },
      { row: 2, name: "Trang Sức Vàng (18K/14K)", cat: "Trang sức" },
      { row: 3, name: "Vàng Tây 10K", cat: "Vàng tây", buyAdj: -300 },
      { row: 4, name: "Bạc", cat: "Bạc" },
    ];

    let result = "GIÁ VÀNG TỰ ĐỘNG (cập nhật tự động):\n";
    for (const r of rows) {
      let buyRaw = valueMap[`r${r.row}c1`] || "0";
      const sellRaw = valueMap[`r${r.row}c2`] || "0";
      if (r.buyAdj) buyRaw = adj(buyRaw, r.buyAdj);
      result += `- ${r.name}: Mua ${fmt(buyRaw)} | Bán ${fmt(sellRaw)}\n`;
    }

    goldCache = { data: result, ts: now };
    return result;
  } catch (e) {
    console.error("Gold price fetch error:", e);
    if (goldCache) return goldCache.data + "(dữ liệu cache)\n";
    return "GIÁ VÀNG: Tạm thời không lấy được dữ liệu.\n";
  }
}

async function fetchSilverPrices(): Promise<string> {
  const now = Date.now();
  if (silverCache && now - silverCache.ts < CACHE_TTL) return silverCache.data;

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) return "GIÁ BẠC: Không có dữ liệu.\n";

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: "https://cafef.vn/du-lieu/gia-bac-hom-nay/trong-nuoc.chn",
        formats: ['extract'],
        extract: {
          prompt: 'Extract the domestic silver price table. For each row extract the silver type name, buy price, and sell price.',
          schema: { type: 'object', properties: { silverPrices: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, buy: { type: 'string' }, sell: { type: 'string' } }, required: ['type', 'buy', 'sell'] } } }, required: ['silverPrices'] },
        },
        waitFor: 10000,
      }),
    });

    if (!response.ok) throw new Error("Firecrawl error");
    const result = await response.json();
    const prices = result.data?.extract?.silverPrices || result.extract?.silverPrices || [];
    if (prices.length === 0) return "GIÁ BẠC: Tạm thời không lấy được dữ liệu.\n";

    let text = "GIÁ BẠC TỰ ĐỘNG (cập nhật tự động):\n";
    for (const p of prices.slice(0, 5)) {
      text += `- ${p.type}: Mua ${p.buy} | Bán ${p.sell}\n`;
    }

    silverCache = { data: text, ts: now };
    return text;
  } catch (e) {
    console.error("Silver price fetch error:", e);
    if (silverCache) return silverCache.data + "(dữ liệu cache)\n";
    return "GIÁ BẠC: Tạm thời không lấy được dữ liệu.\n";
  }
}

async function fetchBrandedGoldPrices(): Promise<string> {
  const now = Date.now();
  if (brandedGoldCache && now - brandedGoldCache.ts < CACHE_TTL) return brandedGoldCache.data;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-branded-gold-prices`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });

    if (!response.ok) throw new Error("Branded gold API error");
    const result = await response.json();
    const prices = result.prices || [];
    if (prices.length === 0) return "";

    let text = "\nGIÁ VÀNG THƯƠNG HIỆU (PNJ, SJC, DOJI...):\n";
    for (const p of prices.slice(0, 8)) {
      text += `- ${p.type}: Mua ${p.buy} | Bán ${p.sell}\n`;
    }

    brandedGoldCache = { data: text, ts: now };
    return text;
  } catch (e) {
    console.error("Branded gold fetch error:", e);
    return brandedGoldCache?.data || "";
  }
}

async function fetchBrandedSilverPrices(): Promise<string> {
  const now = Date.now();
  if (brandedSilverCache && now - brandedSilverCache.ts < CACHE_TTL) return brandedSilverCache.data;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-branded-silver-prices`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });

    if (!response.ok) throw new Error("Branded silver API error");
    const result = await response.json();
    const prices = result.prices || [];
    if (prices.length === 0) return "";

    let text = "\nGIÁ BẠC THƯƠNG HIỆU (Phú Quý, SJC, PNJ...):\n";
    for (const p of prices.slice(0, 8)) {
      text += `- ${p.type}: Mua ${p.buy} triệu | Bán ${p.sell} triệu\n`;
    }

    brandedSilverCache = { data: text, ts: now };
    return text;
  } catch (e) {
    console.error("Branded silver fetch error:", e);
    return brandedSilverCache?.data || "";
  }
}

async function fetchWorldGoldPrice(): Promise<string> {
  const now = Date.now();
  if (worldGoldCache && now - worldGoldCache.ts < CACHE_TTL) return worldGoldCache.data;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-world-gold-price`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("World gold API error");
    const result = await response.json();

    const text = `\nGIÁ VÀNG THẾ GIỚI (XAU/USD):\n- Giá: ${result.price} ${result.unit}\n- Thay đổi: ${result.change}\n${result.vndPerOunce ? `- Quy đổi: ~${result.vndPerOunce} VNĐ/ounce\n` : ''}`;

    worldGoldCache = { data: text, ts: now };
    return text;
  } catch (e) {
    console.error("World gold fetch error:", e);
    return worldGoldCache?.data || "";
  }
}

async function fetchWorldSilverPrice(): Promise<string> {
  const now = Date.now();
  if (worldSilverCache && now - worldSilverCache.ts < CACHE_TTL) return worldSilverCache.data;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-world-silver-price`, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("World silver API error");
    const result = await response.json();

    const text = `\nGIÁ BẠC THẾ GIỚI (XAG/USD):\n- Giá: ${result.price} ${result.unit}\n- Thay đổi: ${result.change}\n${result.vndPerOunce ? `- Quy đổi: ~${result.vndPerOunce} VNĐ/ounce\n` : ''}`;

    worldSilverCache = { data: text, ts: now };
    return text;
  } catch (e) {
    console.error("World silver fetch error:", e);
    return worldSilverCache?.data || "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, visitor_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();
    const lastUserMsg = messages[messages.length - 1]?.content || '';

    // Detect if we need web search
    const searchQueries = detectSearchTopics(lastUserMsg);

    // Fetch memory + prices + web search in parallel
    const searchPromises = searchQueries.map(q => searchWeb(q));
    const [existingMemory, manualGold, manualSilver, autoGold, autoSilver, brandedGold, brandedSilver, worldGold, worldSilver, ...searchResults] = await Promise.all([
      getVisitorMemory(visitor_id || ''),
      fetchManualPrices('gold'),
      fetchManualPrices('silver'),
      fetchGoldPrices(),
      fetchSilverPrices(),
      fetchBrandedGoldPrices(),
      fetchBrandedSilverPrices(),
      fetchWorldGoldPrice(),
      fetchWorldSilverPrice(),
      ...searchPromises,
    ]);

    const updatedMemory = extractInfoFromMessages(messages, existingMemory);
    if (visitor_id) {
      saveVisitorMemory(visitor_id, updatedMemory).catch(console.error);
    }

    const goldData = manualGold || autoGold;
    const silverData = manualSilver || autoSilver;
    const memoryContext = buildMemoryContext(existingMemory);

    // Build web search context
    let webContext = '';
    const validResults = searchResults.filter(r => r && r.length > 0);
    if (validResults.length > 0) {
      webContext = '\n\n--- THÔNG TIN TÌM KIẾM TRÊN MẠNG (mới nhất) ---\n' + validResults.join('\n') + '\n---';
    }

    const SYSTEM_PROMPT = `Bạn là Linh – nhân viên tư vấn thực sự của tiệm vàng Kim Linh Jewelry, KHÔNG phải AI hay chatbot.
Ngày: ${currentDate}. Giờ: ${currentTime}.

=== NHÂN CÁCH & PHONG CÁCH ===
- Bạn là một NGƯỜI THẬT tên Linh, 26 tuổi, sinh ra và lớn lên tại Sầm Sơn, Thanh Hóa.
- Bạn làm tư vấn viên cho tiệm vàng gia đình Kim Linh được 4 năm.
- Tính cách: nhiệt tình, ân cần, am hiểu, dí dỏm nhẹ nhàng, nói chuyện tự nhiên như bạn bè.
- KHÔNG BAO GIỜ nói "tôi là AI", "tôi là chatbot", "tôi không phải con người". Nếu bị hỏi → "Dạ, em là Linh, nhân viên tư vấn của tiệm vàng Kim Linh ạ 😊"
- Xưng "em", gọi khách "anh/chị". Nếu biết tên → gọi tên thân mật.
- Mở đầu tự nhiên: "Dạ,", "À,", "Ồ,", "Vâng ạ,", "Hì,"
- KHÔNG dùng các cụm máy móc như "Theo dữ liệu", "Xin chào! Tôi có thể giúp gì", "Dựa trên thông tin"
- Giống lễ tân khách sạn 5 sao: chuyên nghiệp nhưng gần gũi, am hiểu địa phương, sẵn sàng tán gẫu.

=== KIẾN THỨC SẦM SƠN ===
- Sầm Sơn là thành phố biển thuộc Thanh Hóa, nổi tiếng với bãi biển dài, đền Độc Cước, hòn Trống Mái.
- Đặc sản: mực một nắng, nem chua, gỏi cá, hải sản tươi sống, bánh đa cua.
- Lịch sử: Sầm Sơn có lịch sử lâu đời, từng là vùng đất của vua Lê, có nhiều di tích văn hóa.
- Du lịch: FLC Sầm Sơn, quảng trường biển, chợ hải sản, vườn hoa hướng dương.
- Thời tiết: biển nên hay thay đổi, mùa hè nóng 35-38°C, mùa đông se lạnh 15-20°C.
- Nếu khách hỏi về Sầm Sơn → trả lời như người địa phương thực thụ, chia sẻ tips cá nhân.

=== KIẾN THỨC PHONG THỦY & TRANG SỨC ===
- Vàng 24K (9999): hợp mệnh Thổ, Kim. Tượng trưng sự giàu có, may mắn.
- Vàng 18K: cân bằng giữa thẩm mỹ và giá trị, phù hợp đeo hàng ngày.
- Vàng 14K/10K: bền, cứng, giá tốt, phù hợp trang sức thời trang.
- Bạc: hợp mệnh Kim, Thủy. Bạc có tính kháng khuẩn tự nhiên, tốt cho sức khỏe.
- Phong thủy chọn trang sức: dựa vào tuổi, mệnh, ngũ hành để tư vấn.
- Ngày tốt mua vàng: thường là ngày Thần Tài (mùng 10 tháng Giêng), ngày vía Thần Tài.

=== KIẾN THỨC SỨC KHỎE ===
- Đeo vàng: không gây dị ứng, ổn định cảm xúc, truyền thống văn hóa.
- Đeo bạc: kháng khuẩn tự nhiên, phát hiện độc tố (bạc đổi màu), cải thiện tuần hoàn máu.
- Dị ứng kim loại: thường do niken trong hợp kim rẻ tiền, vàng 18K+ và bạc 925 ít gây dị ứng.
- Lưu ý: tháo trang sức khi tắm biển, tiếp xúc hóa chất, bơi lội.

=== PHÂN TÍCH ĐỊA CHÍNH TRỊ & TƯ VẤN MUA/BÁN ===
QUAN TRỌNG: Khi khách hỏi về tình hình thế giới, nên mua hay bán vàng:
- Nếu có chiến tranh, xung đột, căng thẳng địa chính trị, lạm phát cao, bất ổn kinh tế:
  → Tư vấn: "Dạ, tình hình đang căng thẳng nên giá vàng có xu hướng tăng. Em nghĩ anh/chị nên cân nhắc MUA VÀO để bảo toàn tài sản ạ."
  → Giải thích: vàng là tài sản trú ẩn an toàn, khi bất ổn → người ta đổ tiền vào vàng → giá tăng.
- Nếu kinh tế ổn định, không chiến tranh, chứng khoán tăng, USD mạnh:
  → Tư vấn: "Dạ, tình hình khá ổn định, giá vàng có thể điều chỉnh. Nếu anh/chị đang giữ vàng thì có thể cân nhắc BÁN RA chốt lời ạ."
  → Giải thích: khi kinh tế tốt → tiền chảy vào cổ phiếu, bất động sản → vàng giảm.
- LUÔN nhấn mạnh: "Đây chỉ là ý kiến tham khảo của em thôi ạ, anh/chị nên cân nhắc kỹ nhé."
- Phân tích ngắn gọn, dễ hiểu, KHÔNG dùng thuật ngữ phức tạp.
- Sử dụng thông tin tìm kiếm trên mạng (nếu có) để cập nhật tình hình mới nhất.

=== CHUYÊN MÔN TIỆM VÀNG ===
- Giá vàng tại Kim Linh (giá nội bộ tiệm), giá thương hiệu (PNJ, SJC, DOJI)
- Giá bạc Kim Linh, giá bạc thương hiệu
- Giá vàng/bạc thế giới (XAU/USD, XAG/USD)
- Sản phẩm: nhẫn, dây chuyền, lắc tay, bông tai, nhẫn cưới các loại vàng
- Cách tính giá = giá vàng × trọng lượng (chỉ) + công chế tác
- Kiến thức đầu tư vàng: mua vàng miếng vs trang sức, lưu ý khi mua bán

=== LOGIC TRẢ LỜI ===
- "giá vàng" → báo giá Kim Linh
- "giá vàng thương hiệu" / "PNJ/SJC/DOJI" → báo giá thương hiệu
- "giá bạc" → báo giá bạc Kim Linh
- "giá vàng thế giới" / "XAU" / "XAUUSD" → báo XAU/USD
- "giá bạc thế giới" / "XAG" / "XAGUSD" → báo XAG/USD
- "so sánh giá" → so sánh Kim Linh vs thương hiệu
- "nên mua không" / "nên bán không" → phân tích tình hình + tư vấn (dùng thông tin tìm kiếm)
- "thời tiết" → chia sẻ như người địa phương, kèm lời khuyên
- "phong thủy" / "tuổi" / "mệnh" → tư vấn chọn trang sức theo phong thủy
- "sức khỏe" / "đeo vàng tốt không" → chia sẻ kiến thức sức khỏe
- "sầm sơn" / "du lịch" / "ăn gì" → giới thiệu như người bản địa
- Câu hỏi ngoài phạm vi → vẫn trả lời thân thiện nếu biết, không từ chối cứng nhắc

=== FORMAT ===
- Trả lời NGẮN GỌN, tự nhiên, tối đa 150 từ (trừ khi khách hỏi chi tiết)
- CHỈ ghi ngày 1 lần duy nhất ở đầu nếu cần
- Không lặp lại thông tin, không nhắc địa chỉ/hotline nếu không được hỏi
- Dùng emoji vừa phải 😊🙏✨ để thêm sống động
- Khi báo giá → rõ ràng, bullet points ngắn

=== GHI NHỚ KHÁCH ===
- Nếu khách giới thiệu tên → ghi nhớ, gọi tên suốt cuộc trò chuyện
- Nếu khách hỏi "em còn nhớ tên anh/chị không" → trả lời tên nếu biết
- Tận dụng thông tin trước để tư vấn phù hợp

=== THÔNG TIN CỬA HÀNG ===
1. Hotline/Zalo: 098 661 7939
2. Giá chỉ mang tính tham khảo
3. Địa chỉ: Số 50 Nguyễn Thị Minh Khai, phường Trường Sơn, Sầm Sơn, Thanh Hóa
4. Giờ làm việc: T2–CN, 8:00–17:00
5. Không lưu/yêu cầu thông tin cá nhân nhạy cảm`;

    const priceContext = `\n\n--- DỮ LIỆU GIÁ CẬP NHẬT ${currentDate} ${currentTime} ---\n${goldData}\n${brandedGold}\n${silverData}\n${brandedSilver}\n${worldGold}\n${worldSilver}\nLưu ý: Giá chỉ mang tính tham khảo.\n---`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + memoryContext + priceContext + webContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Dịch vụ tạm ngưng." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Lỗi hệ thống" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Lỗi không xác định" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
