import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL = 600_000; // 10 min
let analysisCache: { data: any; ts: number } | null = null;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const now = Date.now();
    if (analysisCache && now - analysisCache.ts < CACHE_TTL) {
      return new Response(JSON.stringify(analysisCache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Scrape both XAU/USD and XAG/USD technical pages + main page in parallel
    const [goldTechRes, goldMainRes, silverMainRes] = await Promise.all([
      fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.investing.com/currencies/xau-usd-technical',
          formats: ['extract'],
          extract: {
            prompt: `Extract the full technical analysis data for XAU/USD gold:
1. Overall summary signal (Strong Buy/Buy/Neutral/Sell/Strong Sell)
2. Technical Indicators summary and individual indicators: RSI(14) value+action, STOCH value+action, MACD value+action, ADX value+action, CCI value+action, ATR value+action, Williams%R value+action
3. Moving Averages summary: MA5, MA10, MA20, MA50, MA100, MA200 (both Simple and Exponential values + Buy/Sell action)
4. Pivot Points: Classic S1,S2,S3, Pivot, R1,R2,R3`,
            schema: {
              type: 'object',
              properties: {
                overallSignal: { type: 'string' },
                technicalIndicators: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    buyCount: { type: 'number' },
                    sellCount: { type: 'number' },
                    neutralCount: { type: 'number' },
                    indicators: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          value: { type: 'string' },
                          action: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                movingAverages: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    buyCount: { type: 'number' },
                    sellCount: { type: 'number' },
                    averages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          simple: { type: 'string' },
                          simpleAction: { type: 'string' },
                          exponential: { type: 'string' },
                          exponentialAction: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                pivotPoints: {
                  type: 'object',
                  properties: {
                    s3: { type: 'string' },
                    s2: { type: 'string' },
                    s1: { type: 'string' },
                    pivot: { type: 'string' },
                    r1: { type: 'string' },
                    r2: { type: 'string' },
                    r3: { type: 'string' }
                  }
                }
              }
            }
          },
          waitFor: 8000,
        }),
      }),
      fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.investing.com/currencies/xau-usd',
          formats: ['extract'],
          extract: {
            prompt: `Extract current XAU/USD gold price data and latest news headlines:
1. Current price, change amount, change percent
2. Day range (low-high), 52 week range
3. Previous close, open
4. Latest 5 news headlines with dates and brief summary`,
            schema: {
              type: 'object',
              properties: {
                price: { type: 'string' },
                change: { type: 'string' },
                changePercent: { type: 'string' },
                dayLow: { type: 'string' },
                dayHigh: { type: 'string' },
                weekLow52: { type: 'string' },
                weekHigh52: { type: 'string' },
                prevClose: { type: 'string' },
                open: { type: 'string' },
                yearChange: { type: 'string' },
                news: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      date: { type: 'string' },
                      summary: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          waitFor: 8000,
        }),
      }),
      fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.investing.com/currencies/xag-usd',
          formats: ['extract'],
          extract: {
            prompt: `Extract current XAG/USD silver price data:
1. Current price, change amount, change percent
2. Day range, 52 week range
3. Latest 3 news headlines`,
            schema: {
              type: 'object',
              properties: {
                price: { type: 'string' },
                change: { type: 'string' },
                changePercent: { type: 'string' },
                dayLow: { type: 'string' },
                dayHigh: { type: 'string' },
                weekLow52: { type: 'string' },
                weekHigh52: { type: 'string' },
                news: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      date: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          waitFor: 8000,
        }),
      }),
    ]);

    const [goldTech, goldMain, silverMain] = await Promise.all([
      goldTechRes.ok ? goldTechRes.json() : null,
      goldMainRes.ok ? goldMainRes.json() : null,
      silverMainRes.ok ? silverMainRes.json() : null,
    ]);

    const techData = goldTech?.data?.extract || goldTech?.extract || {};
    const priceData = goldMain?.data?.extract || goldMain?.extract || {};
    const silverData = silverMain?.data?.extract || silverMain?.extract || {};

    // Now use AI to generate analysis
    const analysisPrompt = `Bạn là một chuyên gia phân tích thị trường vàng bạc hàng đầu Việt Nam. Dựa trên dữ liệu THỰC TẾ dưới đây từ Investing.com, hãy viết BÀI PHÂN TÍCH KỸ THUẬT chuyên sâu bằng tiếng Việt.

=== DỮ LIỆU GIÁ VÀNG XAU/USD ===
${JSON.stringify(priceData, null, 2)}

=== PHÂN TÍCH KỸ THUẬT XAU/USD ===
${JSON.stringify(techData, null, 2)}

=== DỮ LIỆU GIÁ BẠC XAG/USD ===
${JSON.stringify(silverData, null, 2)}

Hãy viết bài phân tích theo cấu trúc JSON sau (viết bằng tiếng Việt, ngắn gọn, dễ hiểu cho người không chuyên):
{
  "goldPrice": "giá hiện tại XAU/USD",
  "goldChange": "thay đổi (số + %)",
  "silverPrice": "giá hiện tại XAG/USD",  
  "silverChange": "thay đổi",
  "overallSignal": "tín hiệu tổng quan (Mua mạnh/Mua/Trung lập/Bán/Bán mạnh)",
  "signalColor": "green/yellow/red",
  "technicalSummary": "tóm tắt phân tích kỹ thuật 2-3 câu",
  "trendAnalysis": "phân tích xu hướng ngắn hạn và trung hạn 3-4 câu, nêu vùng hỗ trợ/kháng cự",
  "keyIndicators": [
    {"name": "RSI(14)", "value": "giá trị", "signal": "tín hiệu", "explanation": "giải thích ngắn 1 câu"},
    {"name": "MACD", "value": "giá trị", "signal": "tín hiệu", "explanation": "giải thích"},
    {"name": "MA50", "value": "giá trị", "signal": "tín hiệu", "explanation": "giải thích"},
    {"name": "MA200", "value": "giá trị", "signal": "tín hiệu", "explanation": "giải thích"}
  ],
  "supportResistance": {
    "support1": "mức hỗ trợ 1",
    "support2": "mức hỗ trợ 2", 
    "resistance1": "mức kháng cự 1",
    "resistance2": "mức kháng cự 2"
  },
  "geopoliticalImpact": "phân tích tác động địa chính trị đến giá vàng 3-4 câu (dựa vào tin tức)",
  "aiPrediction": "nhận định và dự báo xu hướng ngắn hạn (1 tuần) và trung hạn (1 tháng) 4-5 câu, đưa ra mục tiêu giá cụ thể nếu có thể",
  "recommendation": "khuyến nghị mua/bán/giữ cho nhà đầu tư cá nhân 2-3 câu",
  "silverAnalysis": "phân tích ngắn gọn về bạc XAG/USD 2-3 câu",
  "newsHighlights": ["tin 1", "tin 2", "tin 3"],
  "disclaimer": "Lưu ý rủi ro",
  "updatedAt": "thời gian cập nhật"
}

QUAN TRỌNG: Trả về ĐÚNG JSON format, không markdown, không backticks. Dự báo phải dựa trên dữ liệu thực, có logic. Nếu tín hiệu Strong Buy thì nhận định tích cực, nếu Sell thì tiêu cực. Phải nêu con số cụ thể.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Bạn là chuyên gia phân tích thị trường vàng. Chỉ trả về JSON hợp lệ, không markdown." },
          { role: "user", content: analysisPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) throw new Error(`AI gateway error: ${aiResponse.status}`);
    const aiResult = await aiResponse.json();
    let analysisText = aiResult.choices?.[0]?.message?.content || '';
    
    // Clean up potential markdown wrapping
    analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      console.error("AI returned invalid JSON:", analysisText.slice(0, 500));
      analysis = {
        goldPrice: priceData.price || "N/A",
        goldChange: priceData.change || "N/A",
        silverPrice: silverData.price || "N/A",
        silverChange: silverData.change || "N/A",
        overallSignal: techData.overallSignal || "N/A",
        signalColor: "yellow",
        technicalSummary: "Đang cập nhật phân tích...",
        trendAnalysis: "Dữ liệu đang được xử lý.",
        keyIndicators: [],
        supportResistance: {},
        geopoliticalImpact: "",
        aiPrediction: "Đang phân tích...",
        recommendation: "Vui lòng quay lại sau.",
        silverAnalysis: "",
        newsHighlights: [],
        disclaimer: "Thông tin chỉ mang tính tham khảo.",
        updatedAt: new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      };
    }

    // Add raw data for reference
    analysis.rawTechnical = techData;
    analysis.updatedAt = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

    analysisCache = { data: analysis, ts: now };

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Market analysis error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error",
      goldPrice: "N/A",
      overallSignal: "N/A",
      technicalSummary: "Không thể tải dữ liệu phân tích.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
