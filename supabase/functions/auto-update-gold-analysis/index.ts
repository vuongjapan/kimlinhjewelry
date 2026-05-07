import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sb() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const nowVN = () => new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const todayVN = () => new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

function todayISO(): string {
  const now = new Date();
  const vnDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return vnDate.toISOString().split("T")[0];
}

async function scrapeRealPrices(): Promise<{ goldText: string; silverText: string }> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

  const scrape = async (url: string): Promise<string> => {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
    });
    if (!res.ok) return "";
    const json = await res.json();
    return json?.data?.markdown || "";
  };

  const [goldText, silverText] = await Promise.all([
    scrape("https://vn.investing.com/currencies/xau-usd"),
    scrape("https://vn.investing.com/currencies/xag-usd"),
  ]);
  return { goldText, silverText };
}

function buildPrompt(goldText: string, silverText: string): string {
  const todayStr = todayVN();
  return `Hôm nay ${todayStr}. Bạn là chuyên gia phân tích tài chính vàng bạc hàng đầu.

DỮ LIỆU THỰC TẾ VỪA SCRAPE TỪ INVESTING.COM (${todayStr}):

--- XAU/USD ---
${goldText.slice(0, 4000)}

--- XAG/USD ---
${silverText.slice(0, 4000)}

Dựa trên dữ liệu THỰC TẾ ở trên, hãy phân tích và trả về JSON thuần túy (KHÔNG markdown, KHÔNG backticks):
{
  "gold": {
    "price": <giá XAU/USD CHÍNH XÁC từ dữ liệu trên, phải > 3000>,
    "change": <thay đổi>, "change_pct": <phần trăm>,
    "high_24h": <cao nhất 24h>, "low_24h": <thấp nhất 24h>,
    "trend": "tăng|giảm|đi ngang", "signal": "mua mạnh|mua|trung lập|bán|bán mạnh",
    "short_trend": "tăng|giảm|đi ngang", "mid_trend": "tăng|giảm|đi ngang", "long_trend": "tăng|giảm|đi ngang",
    "indicators": [
      {"name":"MA20","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"MA50","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"MA200","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"RSI(14)","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"MACD","value":"<số>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"Bollinger Bands","value":"<mô tả>","signal":"mua|bán|trung lập","group":"trend"}
    ],
    "support": [<S1>, <S2>], "resistance": [<R1>, <R2>],
    "summary": "3-4 câu phân tích chuyên sâu bằng tiếng Việt"
  },
  "silver": {
    "price": <giá XAG/USD CHÍNH XÁC, phải > 20>,
    "change": <số>, "change_pct": <số>,
    "high_24h": <số>, "low_24h": <số>,
    "trend": "tăng|giảm|đi ngang", "signal": "mua mạnh|mua|trung lập|bán|bán mạnh",
    "short_trend": "tăng|giảm|đi ngang", "mid_trend": "tăng|giảm|đi ngang", "long_trend": "tăng|giảm|đi ngang",
    "indicators": [ ...tương tự vàng... ],
    "support": [<S1>, <S2>], "resistance": [<R1>, <R2>],
    "summary": "3-4 câu phân tích"
  },
  "news": [{"title":"<tiêu đề>","impact":"tích cực|tiêu cực|trung lập","detail":"<1-2 câu>"}],
  "macro": {"fed_rate":"<lãi suất Fed>","usd_index":"<DXY>","president_policy":"<chính sách>","geopolitical":"<địa chính trị>"}
}

QUAN TRỌNG: Giá gold.price PHẢI lấy CHÍNH XÁC từ dữ liệu scrape. Trả về JSON thuần túy. Tất cả text tiếng Việt.`;
}

async function logResult(triggerType: string, status: string, goldPrice: number | null, message: string | null) {
  try {
    await sb().from("gold_analysis_log").insert({
      trigger_type: triggerType,
      status,
      gold_price: goldPrice,
      message,
    });
  } catch (e) {
    console.error("Failed to write log:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let parsedTrigger = "auto";
  let force = false;
  try {
    const body = await req.json().catch(() => ({}));
    parsedTrigger = body?.trigger_type || "auto";
    force = body?.force === true;
  } catch {}

  try {
    // If auto (not forced), check if admin already updated today
    if (!force && parsedTrigger === "auto") {
      const todayDate = todayISO();
      const { data: latestManual } = await sb()
        .from("gold_analysis")
        .select("created_at, trigger_type")
        .eq("trigger_type", "manual")
        .gte("created_at", todayDate + "T00:00:00+07:00")
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestManual && latestManual.length > 0) {
        await logResult("auto", "skipped", null, "Admin đã cập nhật hôm nay lúc " + new Date(latestManual[0].created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }));
        return new Response(JSON.stringify({ status: "skipped", reason: "admin_updated_today" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Step 1: Scrape
    let goldText = "", silverText = "";
    try {
      const scraped = await scrapeRealPrices();
      goldText = scraped.goldText;
      silverText = scraped.silverText;
    } catch (e) {
      console.error("Scrape failed:", e);
    }

    // Step 2: AI analysis
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await logResult(parsedTrigger, "error", null, "LOVABLE_API_KEY not configured");
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const PROMPT = buildPrompt(goldText, silverText);
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Bạn là chuyên gia phân tích tài chính vàng bạc. Trả về JSON thuần túy, không markdown, không backticks." },
          { role: "user", content: PROMPT },
        ],
      }),
    });

    if (!aiRes.ok) {
      const msg = `AI error: ${aiRes.status}`;
      await logResult(parsedTrigger, "error", null, msg);
      return new Response(JSON.stringify({ error: msg }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResult = await aiRes.json();
    let text = aiResult.choices?.[0]?.message?.content || "";
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(text); } catch {
      await logResult(parsedTrigger, "error", null, "Invalid JSON from AI");
      return new Response(JSON.stringify({ error: "AI_INVALID_JSON" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 3: Validate
    const goldPrice = parsed.gold?.price;
    const silverPrice = parsed.silver?.price;
    if (typeof goldPrice === "number" && goldPrice < 3000) {
      await logResult(parsedTrigger, "error", goldPrice, `Gold price ${goldPrice} < 3000`);
      return new Response(JSON.stringify({ error: "PRICE_INVALID" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof silverPrice === "number" && silverPrice < 20) {
      await logResult(parsedTrigger, "error", goldPrice, `Silver price ${silverPrice} < 20`);
      return new Response(JSON.stringify({ error: "PRICE_INVALID" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 4: Save
    const row = {
      gold_data: parsed.gold || {},
      silver_data: parsed.silver || {},
      news_data: { news: parsed.news || [], macro: parsed.macro || {} },
      trigger_type: parsedTrigger,
    };
    await sb().from("gold_analysis").insert(row);

    // Log success
    await logResult(parsedTrigger, "success", goldPrice, null);

    // Update legacy market_analysis
    try {
      const legacy = { overallSignal: parsed.gold?.signal, goldPrice, silverPrice, updatedAt: nowVN() };
      const { data: existing } = await sb().from("market_analysis").select("id").limit(1).maybeSingle();
      if (existing) await sb().from("market_analysis").update({ analysis_data: legacy, updated_at: new Date().toISOString() }).eq("id", existing.id);
      else await sb().from("market_analysis").insert({ analysis_data: legacy });
    } catch (_) {}

    return new Response(JSON.stringify({ success: true, gold_price: goldPrice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});