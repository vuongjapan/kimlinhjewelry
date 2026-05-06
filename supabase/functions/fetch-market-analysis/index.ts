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
 
 const PROMPT = `Hôm nay ${today()}. Bạn là chuyên gia phân tích tài chính vàng bạc hàng đầu.
 
 Hãy phân tích thị trường vàng bạc dựa trên kiến thức mới nhất của bạn:
 
 1. Giá XAU/USD ước tính hiện tại và xu hướng gần nhất
 2. Giá XAG/USD ước tính hiện tại
 3. 24 chỉ số kỹ thuật cho vàng: RSI(14), MACD, MA20, MA50, MA200, Bollinger Bands, Stochastic, ATR, CCI, Williams %R, Momentum, ROC, OBV, MFI, Parabolic SAR, Ichimoku, ADX, Aroon, VWAP, Pivot Point, Support 1, Support 2, Resistance 1, Resistance 2
 4. Tin tức địa chính trị ảnh hưởng giá vàng (chiến tranh, căng thẳng, chính sách Fed, thuế quan)
 5. Chính sách tổng thống Mỹ, thuế quan mới nhất
 6. Xu hướng ngắn/trung/dài hạn
 
 Trả về JSON thuần túy (KHÔNG markdown, KHÔNG backticks):
 {
   "gold": {
     "price": number,
     "change": number,
     "change_pct": number,
     "high_24h": number,
     "low_24h": number,
     "trend": "tăng|giảm|đi ngang",
     "signal": "mua mạnh|mua|trung lập|bán|bán mạnh",
     "short_trend": "tăng|giảm|đi ngang",
     "mid_trend": "tăng|giảm|đi ngang",
     "long_trend": "tăng|giảm|đi ngang",
     "indicators": [
       { "name": "RSI(14)", "value": "55.3", "signal": "mua|bán|trung lập", "group": "oscillator" },
       { "name": "MACD", "value": "12.5", "signal": "mua|bán|trung lập", "group": "trend" },
       ... 24 chỉ số, group: "ma" cho đường trung bình, "oscillator" cho dao động, "trend" cho xu hướng
     ],
     "support": [number, number],
     "resistance": [number, number],
     "summary": "3-4 câu phân tích chuyên sâu bằng tiếng Việt"
   },
   "silver": {
     "price": number,
     "change": number,
     "change_pct": number,
     "high_24h": number,
     "low_24h": number,
     "trend": "tăng|giảm|đi ngang",
     "signal": "mua mạnh|mua|trung lập|bán|bán mạnh",
     "short_trend": "tăng|giảm|đi ngang",
     "mid_trend": "tăng|giảm|đi ngang",
     "long_trend": "tăng|giảm|đi ngang",
     "indicators": [
       { "name": "RSI(14)", "value": "48.2", "signal": "mua|bán|trung lập", "group": "oscillator" }
       ... 24 chỉ số
     ],
     "support": [number, number],
     "resistance": [number, number],
     "summary": "3-4 câu phân tích"
   },
   "news": [
     { "title": "string", "impact": "tích cực|tiêu cực|trung lập", "detail": "1-2 câu" }
     ... 5-7 tin
   ],
   "macro": {
     "fed_rate": "string",
     "usd_index": "string",
     "president_policy": "string",
     "geopolitical": "string"
   }
 }
 
 QUAN TRỌNG: Trả về JSON thuần túy. Giá trị indicators phải là số hoặc chuỗi số. Tất cả text bằng tiếng Việt. Phải có đủ 24 chỉ số cho cả vàng và bạc.`;
 
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
 
     const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         model: "google/gemini-2.5-pro",
         messages: [
           { role: "system", content: "Bạn là chuyên gia phân tích tài chính vàng bạc. Trả về JSON thuần túy, không markdown, không backticks." },
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
 
     // Save to gold_analysis table
     const row = {
       gold_data: parsed.gold || {},
       silver_data: parsed.silver || {},
       news_data: { news: parsed.news || [], macro: parsed.macro || {} },
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
