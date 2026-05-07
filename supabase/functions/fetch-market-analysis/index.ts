 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 function sb() {
   return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 }
 
const today = () => new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
const nowVN = () => new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

// Step 1: Scrape real prices from investing.com via Firecrawl
async function scrapeRealPrices(): Promise<{ goldText: string; silverText: string }> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

  const scrape = async (url: string): Promise<string> => {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });
    if (!res.ok) {
      console.error(`Firecrawl error for ${url}: ${res.status}`);
      return "";
    }
    const json = await res.json();
    return json?.data?.markdown || "";
  };

  const [goldText, silverText] = await Promise.all([
    scrape("https://vn.investing.com/currencies/xau-usd"),
    scrape("https://vn.investing.com/currencies/xag-usd"),
  ]);

  console.log("Scraped gold length:", goldText.length, "silver length:", silverText.length);
  return { goldText, silverText };
}

function buildPrompt(goldText: string, silverText: string): string {
  const todayStr = today();
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
    "change": <thay đổi>,
    "change_pct": <phần trăm thay đổi>,
    "high_24h": <cao nhất 24h>,
    "low_24h": <thấp nhất 24h>,
    "trend": "tăng|giảm|đi ngang",
    "signal": "mua mạnh|mua|trung lập|bán|bán mạnh",
    "short_trend": "tăng|giảm|đi ngang",
    "mid_trend": "tăng|giảm|đi ngang",
    "long_trend": "tăng|giảm|đi ngang",
    "indicators": [
      {"name":"MA20","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"MA50","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"MA200","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"EMA20","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"EMA50","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"Hull MA","value":"<số>","signal":"mua|bán|trung lập","group":"ma"},
      {"name":"RSI(14)","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"Stochastic","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"CCI(20)","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"Williams %R","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"MFI(14)","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"Momentum(10)","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"ROC(12)","value":"<số>","signal":"mua|bán|trung lập","group":"oscillator"},
      {"name":"MACD","value":"<số>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"Bollinger Bands","value":"<mô tả>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"ATR(14)","value":"<số>","signal":"trung lập","group":"trend"},
      {"name":"OBV","value":"<mô tả>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"Parabolic SAR","value":"<số>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"Ichimoku","value":"<mô tả>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"ADX(14)","value":"<số>","signal":"trung lập","group":"trend"},
      {"name":"Aroon","value":"<mô tả>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"VWAP","value":"<số>","signal":"mua|bán|trung lập","group":"trend"},
      {"name":"Pivot Point","value":"<số>","signal":"trung lập","group":"trend"},
      {"name":"Donchian Channel","value":"<mô tả>","signal":"mua|bán|trung lập","group":"trend"}
    ],
    "support": [<S1>, <S2>],
    "resistance": [<R1>, <R2>],
    "summary": "3-4 câu phân tích chuyên sâu bằng tiếng Việt, dựa trên dữ liệu thực"
  },
  "silver": {
    "price": <giá XAG/USD CHÍNH XÁC từ dữ liệu trên, phải > 20>,
    "change": <số>, "change_pct": <số>,
    "high_24h": <số>, "low_24h": <số>,
    "trend": "tăng|giảm|đi ngang",
    "signal": "mua mạnh|mua|trung lập|bán|bán mạnh",
    "short_trend": "tăng|giảm|đi ngang",
    "mid_trend": "tăng|giảm|đi ngang",
    "long_trend": "tăng|giảm|đi ngang",
    "indicators": [ ...24 chỉ số tương tự vàng với group tương ứng... ],
    "support": [<S1>, <S2>], "resistance": [<R1>, <R2>],
    "summary": "3-4 câu phân tích"
  },
  "news": [
    {"title":"<tiêu đề tin>","impact":"tích cực|tiêu cực|trung lập","detail":"<1-2 câu>"}
  ],
  "macro": {
    "fed_rate": "<lãi suất Fed>",
    "usd_index": "<DXY>",
    "president_policy": "<chính sách mới nhất>",
    "geopolitical": "<địa chính trị>"
  }
}

QUAN TRỌNG: 
- Giá gold.price PHẢI lấy CHÍNH XÁC từ dữ liệu scrape ở trên, KHÔNG được bịa số.
- Nếu dữ liệu scrape cho thấy giá ~4600-5000, phải dùng đúng số đó.
- Trả về JSON thuần túy. Tất cả text tiếng Việt. Đủ 24 chỉ số cho cả vàng và bạc.`;
}
 
 serve(async (req) => {
   if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
 
   try {
     const { mode } = await req.json().catch(() => ({ mode: "read" }));
 
     // READ mode: return latest from DB
     if (mode !== "generate") {
       const { data } = await sb()
         .from("gold_analysis")
         .select("*")
         .order("created_at", { ascending: false })
         .limit(1)
         .maybeSingle();
       return new Response(JSON.stringify(data || null), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // GENERATE mode: call AI and save
     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
 
      // Step 1: Scrape real prices from investing.com
      let goldText = "", silverText = "";
      try {
        const scraped = await scrapeRealPrices();
        goldText = scraped.goldText;
        silverText = scraped.silverText;
      } catch (e) {
        console.error("Firecrawl scrape failed:", e);
        // Continue with empty text - AI will use its knowledge
      }

      const PROMPT = buildPrompt(goldText, silverText);

      // Step 2: Send real data to AI for analysis
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
          model: "google/gemini-2.5-flash",
         messages: [
            { role: "system", content: "Bạn là chuyên gia phân tích tài chính vàng bạc. Trả về JSON thuần túy, không markdown, không backticks. Sử dụng CHÍNH XÁC giá từ dữ liệu investing.com được cung cấp." },
           { role: "user", content: PROMPT },
         ],
       }),
     });
 
     if (!aiRes.ok) {
       const status = aiRes.status;
       console.error("AI error:", status);
       return new Response(JSON.stringify({
         error: status === 402 ? "AI_CREDITS_EXHAUSTED" : status === 429 ? "AI_RATE_LIMITED" : "AI_UNAVAILABLE",
       }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
     }
 
     const aiResult = await aiRes.json();
     let text = aiResult.choices?.[0]?.message?.content || "";
     text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
 
     let parsed;
     try {
       parsed = JSON.parse(text);
     } catch {
       console.error("Invalid JSON from AI:", text.slice(0, 300));
       return new Response(JSON.stringify({ error: "AI_INVALID_JSON" }), {
         status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
      // Step 3: Validate prices
      const goldPrice = parsed.gold?.price;
      const silverPrice = parsed.silver?.price;
      if (typeof goldPrice === 'number' && goldPrice < 3000) {
        console.error("Gold price validation failed:", goldPrice);
        return new Response(JSON.stringify({ error: "PRICE_INVALID", detail: `Giá vàng ${goldPrice} < 3000 - không hợp lệ` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof silverPrice === 'number' && silverPrice < 20) {
        console.error("Silver price validation failed:", silverPrice);
        return new Response(JSON.stringify({ error: "PRICE_INVALID", detail: `Giá bạc ${silverPrice} < 20 - không hợp lệ` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

     // Save to gold_analysis table
     const row = {
       gold_data: parsed.gold || {},
       silver_data: parsed.silver || {},
       news_data: { news: parsed.news || [], macro: parsed.macro || {} },
      trigger_type: "manual",
     };
 
     await sb().from("gold_analysis").insert(row);
     console.log("Gold analysis saved");
 
     // Also update legacy market_analysis for chatbot
     try {
       const legacy = {
         overallSignal: parsed.gold?.signal,
         goldPrice: parsed.gold?.price,
         silverPrice: parsed.silver?.price,
         updatedAt: nowVN(),
       };
       const { data: existing } = await sb().from("market_analysis").select("id").limit(1).maybeSingle();
       if (existing) {
         await sb().from("market_analysis").update({ analysis_data: legacy, updated_at: new Date().toISOString() }).eq("id", existing.id);
       } else {
         await sb().from("market_analysis").insert({ analysis_data: legacy });
       }
     } catch (_) {}
 
     return new Response(JSON.stringify({
       id: "new",
       created_at: new Date().toISOString(),
       gold_data: parsed.gold,
       silver_data: parsed.silver,
       news_data: { news: parsed.news, macro: parsed.macro },
     }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
   } catch (e) {
     console.error("Error:", e);
     return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
       status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });
