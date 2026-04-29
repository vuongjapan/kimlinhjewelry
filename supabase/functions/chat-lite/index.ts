import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOP_INFO = `Kim Linh Jewelry — Số 50 Nguyễn Thị Minh Khai, P. Trường Sơn, Sầm Sơn, Thanh Hóa. Hotline/Zalo: 098 661 7939. Mở cửa 8:00–17:00 hàng ngày. Dịch vụ: mua bán vàng bạc, gia công trang sức, thu đổi vàng, kiểm định vàng miễn phí, bảo hành 12 tháng.`;

const SYSTEM_PROMPT = `Bạn là trợ lý Kim Linh Jewelry - tiệm vàng bạc trang sức.
Trả lời NGẮN GỌN tối đa 3 câu, thân thiện, xưng "em".
Nếu không chắc → bảo khách gọi hotline 098 661 7939.
KHÔNG bịa giá vàng, KHÔNG hứa hẹn không chắc chắn.
Thông tin tiệm: ${SHOP_INFO}`;

const FALLBACK_BUSY = `Dạ hệ thống đang bận, anh/chị vui lòng gọi hotline 098 661 7939 hoặc nhắn Zalo để được tư vấn trực tiếp ạ! 😊`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    // Chỉ gửi tin hiện tại + 2 tin gần nhất (tối đa 3 messages)
    const trimmed = messages.slice(-3).map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 800),
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ reply: FALLBACK_BUSY, fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // model rẻ nhất
        max_tokens: 250,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...trimmed,
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error(`AI gateway error: ${aiRes.status}`);
      // Trả 200 + fallback để client KHÔNG crash
      return new Response(JSON.stringify({
        reply: FALLBACK_BUSY,
        fallback: true,
        upstream_status: aiRes.status,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || FALLBACK_BUSY;

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-lite error:", e);
    return new Response(JSON.stringify({ reply: FALLBACK_BUSY, fallback: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});