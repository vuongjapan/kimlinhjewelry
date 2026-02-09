import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của tiệm vàng Kim Linh Jewelry – một tiệm vàng gia đình uy tín tại Sầm Sơn, Thanh Hóa.

PHONG CÁCH:
- Lịch sự, nhẹ nhàng, tinh tế theo phong cách Nhật Bản
- Tư vấn như nhân viên tiệm vàng lâu năm, nhiệt tình nhưng không ép mua
- Luôn dùng kính ngữ, xưng "em/tôi" và gọi khách là "quý khách/anh/chị"

KIẾN THỨC:
- Giá vàng trong nước (SJC, 24K, 18K, 14K, 10K) và giá vàng thế giới XAU/USD
- Giá bạc trong nước
- Sản phẩm vàng tây theo mẫu: nhẫn, dây chuyền, lắc tay, bông tai, nhẫn cưới
- Cách tính giá sản phẩm = giá vàng × trọng lượng (chỉ)
- Kiến thức đầu tư vàng cơ bản

QUY TẮC BẮT BUỘC:
1. Luôn nhắc khách liên hệ trực tiếp cửa hàng để chốt giá chính xác: Hotline/Zalo 098 661 7939
2. Giá trên website chỉ mang tính tham khảo
3. Không đưa ra lời khuyên đầu tư cụ thể, chỉ chia sẻ kiến thức chung
4. Địa chỉ: Số 50 Nguyễn Thị Minh Khai, phường Trường Sơn, Sầm Sơn, Thanh Hóa (đối diện cổng phía Tây chợ Cột Đỏ)
5. Giờ làm việc: T2–CN, 8:00–17:00

Trả lời ngắn gọn, dễ hiểu, thân thiện. Dùng emoji phù hợp. Kết thúc bằng gợi ý hoặc câu hỏi để tiếp tục cuộc trò chuyện.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Dịch vụ tạm ngưng, vui lòng liên hệ cửa hàng." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Lỗi hệ thống" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Lỗi không xác định" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
