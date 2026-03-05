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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();

    // Fetch manual prices first (they take priority)
    const [manualGold, manualSilver, autoGold, autoSilver] = await Promise.all([
      fetchManualPrices('gold'),
      fetchManualPrices('silver'),
      fetchGoldPrices(),
      fetchSilverPrices(),
    ]);

    // Manual prices override auto prices
    const goldData = manualGold || autoGold;
    const silverData = manualSilver || autoSilver;

    const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của tiệm vàng Kim Linh Jewelry – tiệm vàng gia đình uy tín tại Sầm Sơn, Thanh Hóa.
Ngày: ${currentDate}. Giờ: ${currentTime}.

PHONG CÁCH:
- Lịch sự, nhẹ nhàng, tự nhiên như người thật, tinh tế kiểu Nhật. Xưng "em", gọi khách "anh/chị".
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
- Giá vàng trong nước (SJC, 24K/9999, 18K, 14K, 10K), giá vàng thế giới XAU/USD
- Giá bạc trong nước
- Sản phẩm vàng tây: nhẫn, dây chuyền, lắc tay, bông tai, nhẫn cưới
- Cách tính giá = giá vàng × trọng lượng (chỉ)
- Kiến thức đầu tư vàng cơ bản

LOGIC:
- "giá vàng hôm nay" → liệt kê ngắn gọn các loại vàng chính
- "giá vàng tây" → trích giá Vàng Tây 10K
- "giá vàng 9999" → trích giá Nhẫn Ép Vỉ 9999
- "giá bạc" → liệt kê giá bạc
- "mua vàng làm quà" → gợi ý vàng tây nhẹ
- "đầu tư" → ưu/nhược điểm ngắn gọn, nhắc tham khảo
- Ngoài phạm vi → "Dạ, câu hỏi này nằm ngoài phạm vi hỗ trợ của em ạ."

QUY TẮC:
1. Hotline/Zalo: 098 661 7939
2. Giá chỉ mang tính tham khảo
3. Địa chỉ: Số 50 Nguyễn Thị Minh Khai, phường Trường Sơn, Sầm Sơn, Thanh Hóa
4. Giờ làm việc: T2–CN, 8:00–17:00
5. Không lưu/yêu cầu thông tin cá nhân`;

    const priceContext = `\n\n--- DỮ LIỆU GIÁ CẬP NHẬT ${currentDate} ${currentTime} ---\n${goldData}\n${silverData}Lưu ý: Giá chỉ mang tính tham khảo.\n---`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + priceContext },
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
