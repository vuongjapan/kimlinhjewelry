import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL = 90_000;

let goldCache: { data: string; ts: number } | null = null;
let silverCache: { data: string; ts: number } | null = null;
let manualGoldCache: { data: string | null; ts: number } | null = null;
let manualSilverCache: { data: string | null; ts: number } | null = null;

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
    
    // Extract name patterns
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
        if (name.length >= 2 && name.length <= 30) {
          memory.name = name;
        }
      }
    }
    
    // Extract interests
    if (text.includes('nhẫn cưới') || text.includes('nhan cuoi')) {
      memory.interest_wedding = true;
    }
    if (text.includes('đầu tư') || text.includes('dau tu')) {
      memory.interest_investment = true;
    }
    if (text.includes('quà') || text.includes('tặng')) {
      memory.interest_gift = true;
    }
    if (text.includes('vàng tây') || text.includes('10k') || text.includes('14k') || text.includes('18k')) {
      memory.interest_gold_western = true;
    }
    if (text.includes('9999') || text.includes('24k') || text.includes('sjc')) {
      memory.interest_gold_pure = true;
    }
    if (text.includes('bạc')) {
      memory.interest_silver = true;
    }
    
    // Extract phone if shared
    const phoneMatch = msg.content.match(/(?:0\d{9,10})/);
    if (phoneMatch) {
      memory.phone = phoneMatch[0];
    }
  }
  
  // Track visit count
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
  
  ctx += `Hãy sử dụng thông tin này để tư vấn tự nhiên hơn. Nếu biết tên khách, hãy xưng hô bằng tên. Ví dụ: "Dạ, anh/chị [Tên] ơi..."\n---`;
  
  return ctx;
}

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
          schema: {
            type: 'object',
            properties: {
              silverPrices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { type: { type: 'string' }, buy: { type: 'string' }, sell: { type: 'string' } },
                  required: ['type', 'buy', 'sell'],
                },
              },
            },
            required: ['silverPrices'],
          },
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

let brandedGoldCache: { data: string; ts: number } | null = null;
let brandedSilverCache: { data: string; ts: number } | null = null;
let worldGoldCache: { data: string; ts: number } | null = null;
let worldSilverCache: { data: string; ts: number } | null = null;

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

    // Fetch memory + prices in parallel
    const [existingMemory, manualGold, manualSilver, autoGold, autoSilver, brandedGold, brandedSilver, worldGold, worldSilver] = await Promise.all([
      getVisitorMemory(visitor_id || ''),
      fetchManualPrices('gold'),
      fetchManualPrices('silver'),
      fetchGoldPrices(),
      fetchSilverPrices(),
      fetchBrandedGoldPrices(),
      fetchBrandedSilverPrices(),
      fetchWorldGoldPrice(),
      fetchWorldSilverPrice(),
    ]);

    // Extract new info from current messages and save
    const updatedMemory = extractInfoFromMessages(messages, existingMemory);
    // Save memory in background (don't block response)
    if (visitor_id) {
      saveVisitorMemory(visitor_id, updatedMemory).catch(console.error);
    }

    const goldData = manualGold || autoGold;
    const silverData = manualSilver || autoSilver;
    const memoryContext = buildMemoryContext(existingMemory);

    const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của tiệm vàng Kim Linh Jewelry – tiệm vàng gia đình uy tín tại Sầm Sơn, Thanh Hóa.
Ngày: ${currentDate}. Giờ: ${currentTime}.

PHONG CÁCH:
- Lịch sự, nhẹ nhàng, tự nhiên như người thật, tinh tế kiểu Nhật. Xưng "em", gọi khách "anh/chị".
- Nếu biết tên khách hàng, hãy gọi tên thân thiện. Ví dụ: "Dạ, anh Minh ơi..." hoặc "Chị Lan ơi..."
- Nếu khách quay lại, hãy chào đón nồng nhiệt: "Dạ, rất vui được gặp lại anh/chị..."
- Mở đầu: "Dạ," hoặc "Theo cập nhật hôm nay,"
- Kết thúc ngắn gọn, không lặp lại thông tin.
- Không bán hàng ép buộc, không phóng đại.

QUAN TRỌNG VỀ FORMAT:
- Trả lời NGẮN GỌN, súc tích, tối đa 120 từ.
- CHỈ ghi ngày 1 lần duy nhất ở đầu câu trả lời nếu cần.
- Không lặp lại thông tin, không nhắc lại địa chỉ/hotline nếu không được hỏi.
- Khi báo giá → rõ ràng, súc tích, KHÔNG giải thích thêm nếu khách không hỏi.
- Dùng bullet points ngắn cho bảng giá.

CHỨC NĂNG:
- Giá vàng tại Kim Linh (giá nội bộ tiệm)
- Giá vàng thương hiệu (PNJ, SJC, DOJI - để so sánh thị trường)
- Giá bạc tại Kim Linh
- Giá bạc thương hiệu (Phú Quý, SJC, PNJ - để so sánh)
- Giá vàng/bạc thế giới (XAU/USD, XAG/USD)
- Sản phẩm vàng tây: nhẫn, dây chuyền, lắc tay, bông tai, nhẫn cưới
- Cách tính giá = giá vàng × trọng lượng (chỉ)
- Kiến thức đầu tư vàng cơ bản

LOGIC:
- "giá vàng" hoặc "giá vàng hôm nay" → báo giá Kim Linh (giá nội bộ tiệm)
- "giá vàng thương hiệu" hoặc "giá PNJ/SJC/DOJI" → báo giá thương hiệu (PNJ, SJC, etc.)
- "giá bạc" → báo giá bạc Kim Linh
- "giá bạc thương hiệu" hoặc "giá bạc PNJ/SJC/Phú Quý" → báo giá bạc thương hiệu
- "so sánh giá" → so sánh giá Kim Linh vs thương hiệu
- "giá vàng tây" → trích giá Vàng Tây 10K
- "giá vàng 9999" → trích giá Nhẫn Ép Vỉ 9999
- "mua vàng làm quà" → gợi ý vàng tây nhẹ
- "đầu tư" → ưu/nhược điểm ngắn gọn, nhắc tham khảo
- Ngoài phạm vi → "Dạ, câu hỏi này nằm ngoài phạm vi hỗ trợ của em ạ."

GHI NHỚ KHÁCH HÀNG:
- Nếu khách giới thiệu tên, hãy ghi nhớ và sử dụng tên trong suốt cuộc trò chuyện.
- Nếu khách hỏi "em còn nhớ tên anh/chị không" → trả lời tên nếu biết.
- Tận dụng thông tin trước đó để tư vấn phù hợp hơn (ví dụ: khách từng hỏi nhẫn cưới → gợi ý khi có dịp).

QUY TẮC:
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
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + memoryContext + priceContext },
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
