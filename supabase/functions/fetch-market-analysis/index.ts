import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sb() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

type Indicator = { name: string; value: string; signal: string; group: string };
type YahooPayload = {
  fetchedAt: string;
  dataDate: Date;
  dataTimestamp: number;
  dataAgeHours: number;
  goldPrice: number;
  goldChange: number;
  goldChangePct: number;
  goldHigh: number;
  goldLow: number;
  silverPrice: number;
  silverChange: number;
  silverChangePct: number;
  silverHigh: number;
  silverLow: number;
  closes: number[];
  timestamps: number[];
};

const money = (n: number, digits = 2) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const nowVN = () => new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

function todayVNLong(): string {
  const today = new Date();
  today.setHours(today.getHours() + 7);
  return today.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function cleanJsonText(text: string): string {
  const trimmed = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "User-Agent": "Mozilla/5.0 (compatible; KimLinhJewelry/1.0)",
    },
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${url}`);
  return res.json();
}

function readResult(json: any, label: string) {
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo không trả dữ liệu ${label}`);
  return result;
}

async function fetchYahooMarketData(): Promise<YahooPayload> {
  const ts = Date.now();
  const [spotJson, histJson, silvJson] = await Promise.all([
    fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/GC=F?_=${ts}`),
    fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=200d&_=${ts}`),
    fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/SI=F?_=${ts}`),
  ]);

  const spot = readResult(spotJson, "GC=F spot");
  const hist = readResult(histJson, "GC=F history");
  const silver = readResult(silvJson, "SI=F spot");
  const meta = spot.meta || {};
  const silverMeta = silver.meta || {};
  const dataTimestamp = Number(meta.regularMarketTime || 0) * 1000;
  const dataDate = new Date(dataTimestamp);
  const diffHours = (Date.now() - dataTimestamp) / 3600000;

  if (!dataTimestamp || Number.isNaN(dataDate.getTime())) throw new Error("Yahoo thiếu regularMarketTime");
  if (diffHours > 72) {
    throw new Error(`Dữ liệu Yahoo quá cũ: ${dataDate.toISOString()} (${Math.round(diffHours)} giờ trước)`);
  }

  const goldPrice = Number(meta.regularMarketPrice);
  if (!Number.isFinite(goldPrice) || goldPrice < 3000 || goldPrice > 9999) {
    throw new Error(`Giá bất thường: $${goldPrice}`);
  }

  const silverPrice = Number(silverMeta.regularMarketPrice);
  if (!Number.isFinite(silverPrice) || silverPrice < 20 || silverPrice > 200) {
    throw new Error(`Giá bạc bất thường: $${silverPrice}`);
  }

  const rawCloses = hist.indicators?.quote?.[0]?.close || [];
  const rawTimestamps = hist.timestamp || [];
  const pairs = rawCloses
    .map((v: number | null, i: number) => ({ close: Number(v), timestamp: Number(rawTimestamps[i]) }))
    .filter((p: { close: number; timestamp: number }) => Number.isFinite(p.close) && p.close > 0 && Number.isFinite(p.timestamp));
  const closes = pairs.map((p: { close: number }) => p.close);
  const timestamps = pairs.map((p: { timestamp: number }) => p.timestamp);
  if (closes.length < 50) throw new Error(`Lịch sử Yahoo thiếu dữ liệu: ${closes.length} điểm`);

  const payload = {
    fetchedAt: new Date().toISOString(),
    dataDate,
    dataTimestamp,
    dataAgeHours: diffHours,
    goldPrice,
    goldChange: Number(meta.regularMarketChange || 0),
    goldChangePct: Number(meta.regularMarketChangePercent || 0),
    goldHigh: Number(meta.regularMarketDayHigh || Math.max(goldPrice, closes[closes.length - 1])),
    goldLow: Number(meta.regularMarketDayLow || Math.min(goldPrice, closes[closes.length - 1])),
    silverPrice,
    silverChange: Number(silverMeta.regularMarketChange || 0),
    silverChangePct: Number(silverMeta.regularMarketChangePercent || 0),
    silverHigh: Number(silverMeta.regularMarketDayHigh || silverPrice),
    silverLow: Number(silverMeta.regularMarketDayLow || silverPrice),
    closes,
    timestamps,
  };

  console.log({
    fetchedAt: payload.fetchedAt,
    dataTime: dataDate.toISOString(),
    goldPrice,
    closePoints: closes.length,
    lastClose: closes[closes.length - 1],
    firstClose: closes[0],
  });

  return payload;
}

function average(values: number[]) {
  return values.reduce((sum, n) => sum + n, 0) / Math.max(values.length, 1);
}

function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  return values.reduce((prev, price, idx) => (idx === 0 ? price : price * k + prev * (1 - k)), values[0] || 0);
}

function rsi(values: number[], period = 14) {
  const slice = values.slice(-(period + 1));
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function standardDeviation(values: number[]) {
  const avg = average(values);
  return Math.sqrt(average(values.map((v) => Math.pow(v - avg, 2))));
}

function buildIndicators(closes: number[], price: number): Indicator[] {
  const ma20 = average(closes.slice(-20));
  const ma50 = average(closes.slice(-50));
  const ma200 = average(closes.slice(-200));
  const ema12 = ema(closes.slice(-80), 12);
  const ema26 = ema(closes.slice(-80), 26);
  const macd = ema12 - ema26;
  const rsi14 = rsi(closes);
  const std20 = standardDeviation(closes.slice(-20));
  const upper = ma20 + 2 * std20;
  const lower = ma20 - 2 * std20;
  const signalByPrice = (base: number) => price > base ? "mua" : price < base ? "bán" : "trung lập";

  return [
    { name: "MA20", value: money(ma20), signal: signalByPrice(ma20), group: "ma" },
    { name: "MA50", value: money(ma50), signal: signalByPrice(ma50), group: "ma" },
    { name: "MA200", value: money(ma200), signal: signalByPrice(ma200), group: "ma" },
    { name: "RSI(14)", value: round(rsi14, 1).toString(), signal: rsi14 > 70 ? "bán" : rsi14 < 30 ? "mua" : "trung lập", group: "oscillator" },
    { name: "MACD", value: round(macd, 2).toString(), signal: macd > 0 ? "mua" : macd < 0 ? "bán" : "trung lập", group: "trend" },
    { name: "Bollinger Bands", value: `${money(lower)} - ${money(upper)}`, signal: price > upper ? "bán" : price < lower ? "mua" : "trung lập", group: "trend" },
  ];
}

function trendFrom(closes: number[], price: number) {
  const ma20 = average(closes.slice(-20));
  const ma50 = average(closes.slice(-50));
  const ma200 = average(closes.slice(-200));
  const previous = closes[closes.length - 2] || closes[0] || price;
  return {
    trend: price > previous ? "tăng" : price < previous ? "giảm" : "đi ngang",
    short: price > ma20 ? "tăng" : price < ma20 ? "giảm" : "đi ngang",
    mid: price > ma50 ? "tăng" : price < ma50 ? "giảm" : "đi ngang",
    long: price > ma200 ? "tăng" : price < ma200 ? "giảm" : "đi ngang",
  };
}

function buildTechnicalAnalysis(market: YahooPayload, aiMeta: Record<string, unknown> = {}) {
  const closes = market.closes;
  const goldTrend = trendFrom(closes, market.goldPrice);
  const min60 = Math.min(...closes.slice(-60));
  const max60 = Math.max(...closes.slice(-60));
  const supports = [round(Math.min(min60, market.goldLow), 2), round(average(closes.slice(-20)), 2)].sort((a, b) => b - a);
  const resistances = [round(Math.max(max60, market.goldHigh), 2), round(market.goldPrice + Math.abs(market.goldChange || market.goldPrice * 0.01), 2)].sort((a, b) => a - b);
  const signal = [goldTrend.short, goldTrend.mid, goldTrend.long].filter((t) => t === "tăng").length >= 2 ? "mua" : [goldTrend.short, goldTrend.mid, goldTrend.long].filter((t) => t === "giảm").length >= 2 ? "bán" : "trung lập";
  const sourceMeta = {
    source: "Yahoo Finance GC=F/SI=F",
    fetched_at: market.fetchedAt,
    source_timestamp: market.dataDate.toISOString(),
    source_timestamp_vn: market.dataDate.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
    raw_price: market.goldPrice,
    closes_count: market.closes.length,
    first_close: market.closes[0],
    last_close: market.closes[market.closes.length - 1],
    data_age_hours: round(market.dataAgeHours, 2),
    ...aiMeta,
  };

  return {
    gold: {
      price: round(market.goldPrice, 2),
      change: round(market.goldChange, 2),
      change_pct: round(market.goldChangePct, 2),
      high_24h: round(market.goldHigh, 2),
      low_24h: round(market.goldLow, 2),
      trend: goldTrend.trend,
      signal,
      short_trend: goldTrend.short,
      mid_trend: goldTrend.mid,
      long_trend: goldTrend.long,
      indicators: buildIndicators(closes, market.goldPrice),
      support: supports,
      resistance: resistances,
      summary: `Giá XAU/USD hiện tại là $${money(market.goldPrice)} theo Yahoo Finance, timestamp dữ liệu ${sourceMeta.source_timestamp_vn}. Phân tích kỹ thuật được tính trực tiếp từ ${closes.length} điểm đóng cửa gần nhất, không dùng dữ liệu hardcode. Xu hướng ngắn hạn ${goldTrend.short}, trung hạn ${goldTrend.mid}, dài hạn ${goldTrend.long}; vùng cần theo dõi là hỗ trợ $${money(supports[0])} và kháng cự $${money(resistances[resistances.length - 1])}.`,
      source_meta: sourceMeta,
    },
    silver: {
      price: round(market.silverPrice, 3),
      change: round(market.silverChange, 3),
      change_pct: round(market.silverChangePct, 2),
      high_24h: round(market.silverHigh, 3),
      low_24h: round(market.silverLow, 3),
      trend: market.silverChange >= 0 ? "tăng" : "giảm",
      signal: market.silverChangePct > 0.5 ? "mua" : market.silverChangePct < -0.5 ? "bán" : "trung lập",
      short_trend: market.silverChange >= 0 ? "tăng" : "giảm",
      mid_trend: "đi ngang",
      long_trend: "đi ngang",
      indicators: [
        { name: "Giá hiện tại", value: money(market.silverPrice, 3), signal: "trung lập", group: "trend" },
        { name: "Biến động ngày", value: `${round(market.silverChangePct, 2)}%`, signal: market.silverChange >= 0 ? "mua" : "bán", group: "oscillator" },
      ],
      support: [round(market.silverLow, 3)],
      resistance: [round(market.silverHigh, 3)],
      summary: `Giá bạc SI=F hiện tại là $${money(market.silverPrice, 3)}, lấy cùng thời điểm dữ liệu thị trường mới nhất. Phần này chỉ hiển thị số liệu thực từ nguồn giá, không dùng thông tin cũ nếu AI không khả dụng.`,
      source_meta: { ...sourceMeta, raw_price: market.silverPrice, source: "Yahoo Finance SI=F" },
    },
    news: [],
    macro: {
      fed_rate: "Đang cập nhật từ nguồn tin mới",
      usd_index: "Đang cập nhật từ nguồn tin mới",
      president_policy: "Đang cập nhật từ nguồn tin mới",
      geopolitical: "Đang cập nhật từ nguồn tin mới",
    },
  };
}

async function scrapeInvestingContext(): Promise<{ goldText: string; silverText: string }> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) return { goldText: "", silverText: "" };
  const ts = Date.now();
  const scrape = async (url: string): Promise<string> => {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
      body: JSON.stringify({ url: `${url}?_=${ts}`, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
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

function buildPrompt(market: YahooPayload, investing: { goldText: string; silverText: string }): string {
  const todayStr = todayVNLong();
  const dataDateVN = market.dataDate.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  return `Hôm nay là ${todayStr}.
Giá XAU/USD HIỆN TẠI lúc fetch: $${market.goldPrice}
(Dữ liệu lấy lúc: ${dataDateVN}, timestamp gốc Yahoo: ${market.dataDate.toISOString()})
Giá XAG/USD hiện tại lúc fetch: $${market.silverPrice}

DỮ LIỆU INVESTING.COM VỪA SCRAPE, CHỈ DÙNG NẾU KHỚP GIÁ HIỆN TẠI:
--- XAU/USD ---
${investing.goldText.slice(0, 2500)}
--- XAG/USD ---
${investing.silverText.slice(0, 1800)}

LƯU Ý QUAN TRỌNG:
- Giá vàng thế giới hiện tại là ~$${market.goldPrice}/oz, lấy từ Yahoo timestamp thực.
- Đây là năm 2026, không phải 2024 hay 2025.
- Không được dùng bất kỳ giá cũ nào nếu không xuất hiện trong dữ liệu hiện tại.
- Chỉ lấy tin từ ${todayStr} hoặc tối đa 3 ngày trước đó; nếu không chắc thì để mảng news rỗng.

Trả về JSON thuần, không markdown:
{"gold":{"price":${market.goldPrice},"change":number,"change_pct":number,"high_24h":number,"low_24h":number,"trend":"tăng|giảm|đi ngang","signal":"mua mạnh|mua|trung lập|bán|bán mạnh","short_trend":"tăng|giảm|đi ngang","mid_trend":"tăng|giảm|đi ngang","long_trend":"tăng|giảm|đi ngang","indicators":[{"name":"MA20","value":"string","signal":"mua|bán|trung lập","group":"ma"}],"support":[number],"resistance":[number],"summary":"3 câu tiếng Việt bám sát giá hiện tại"},"silver":{"price":${market.silverPrice},"change":number,"change_pct":number,"high_24h":number,"low_24h":number,"trend":"tăng|giảm|đi ngang","signal":"mua|bán|trung lập","short_trend":"tăng|giảm|đi ngang","mid_trend":"tăng|giảm|đi ngang","long_trend":"tăng|giảm|đi ngang","indicators":[],"support":[number],"resistance":[number],"summary":"string"},"news":[],"macro":{"fed_rate":"string","usd_index":"string","president_policy":"string","geopolitical":"string"}}`;
}

async function maybeAiAnalysis(market: YahooPayload) {
  const calledAt = new Date().toISOString();
  const base = buildTechnicalAnalysis(market, { ai_called_at: calledAt, ai_status: "not_called" });
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return base;

  try {
    const investing = await scrapeInvestingContext();
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        max_tokens: 4096,
        messages: [
          { role: "system", content: "Bạn phân tích vàng bạc. Bắt buộc trả JSON thuần. Không tự thay đổi giá hiện tại đã được cung cấp." },
          { role: "user", content: buildPrompt(market, investing) },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error("AI unavailable:", aiRes.status);
      return buildTechnicalAnalysis(market, { ai_called_at: calledAt, ai_status: aiRes.status === 402 ? "credits_exhausted" : `error_${aiRes.status}` });
    }

    const aiResult = await aiRes.json();
    const finishReason = aiResult.choices?.[0]?.finish_reason;
    if (finishReason === "length") throw new Error("AI output truncated");
    const parsed = JSON.parse(cleanJsonText(aiResult.choices?.[0]?.message?.content || ""));
    const aiGoldPrice = Number(parsed.gold?.price);
    if (!Number.isFinite(aiGoldPrice) || Math.abs(aiGoldPrice - market.goldPrice) > Math.max(10, market.goldPrice * 0.01)) {
      throw new Error(`AI price mismatch: ${aiGoldPrice} vs ${market.goldPrice}`);
    }

    const ai = buildTechnicalAnalysis(market, { ai_called_at: calledAt, ai_status: "success" });
    return {
      gold: { ...ai.gold, ...parsed.gold, price: round(market.goldPrice, 2), source_meta: ai.gold.source_meta },
      silver: { ...ai.silver, ...parsed.silver, price: round(market.silverPrice, 3), source_meta: ai.silver.source_meta },
      news: Array.isArray(parsed.news) ? parsed.news : [],
      macro: parsed.macro || ai.macro,
    };
  } catch (e) {
    console.error("AI parse/validation failed:", e);
    return buildTechnicalAnalysis(market, { ai_called_at: calledAt, ai_status: e instanceof Error ? `fallback_${e.message}` : "fallback_error" });
  }
}

async function logResult(triggerType: string, status: string, goldPrice: number | null, message: string | null) {
  try {
    await sb().from("gold_analysis_log").insert({ trigger_type: triggerType, status, gold_price: goldPrice, message });
  } catch (e) {
    console.error("Failed to write log:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({ mode: "read" }));
    const mode = body?.mode || "read";

    if (mode !== "generate") {
      const { data } = await sb().from("gold_analysis").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return new Response(JSON.stringify(data || null), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const market = await fetchYahooMarketData();
    const analysis = await maybeAiAnalysis(market);
    const row = {
      gold_data: analysis.gold,
      silver_data: analysis.silver,
      news_data: { news: analysis.news, macro: analysis.macro, ai_created_at: analysis.gold.source_meta?.ai_called_at },
      trigger_type: body?.trigger_type || "manual",
    };

    const { data: inserted, error: insertError } = await sb().from("gold_analysis").insert(row).select("*").single();
    if (insertError) throw insertError;
    await logResult(row.trigger_type, "success", market.goldPrice, `Yahoo ${market.dataDate.toISOString()} • AI ${analysis.gold.source_meta?.ai_status || "unknown"}`);

    try {
      const legacy = { overallSignal: analysis.gold.signal, goldPrice: market.goldPrice, silverPrice: market.silverPrice, updatedAt: nowVN(), sourceTimestamp: market.dataDate.toISOString() };
      const { data: existing } = await sb().from("market_analysis").select("id").limit(1).maybeSingle();
      if (existing) await sb().from("market_analysis").update({ analysis_data: legacy, updated_at: new Date().toISOString() }).eq("id", existing.id);
      else await sb().from("market_analysis").insert({ analysis_data: legacy });
    } catch (_) {}

    return new Response(JSON.stringify({ success: true, ...inserted, debug: analysis.gold.source_meta }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown";
    console.error("Error:", e);
    await logResult("manual", "error", null, message);
    return new Response(JSON.stringify({ error: message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
