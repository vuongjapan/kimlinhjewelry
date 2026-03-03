import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CURRENT_DATE = "03/03/2026";

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của tiệm vàng Kim Linh Jewelry – một tiệm vàng gia đình uy tín tại Sầm Sơn, Thanh Hóa.
Ngày hôm nay là: ${CURRENT_DATE}.

PHONG CÁCH NHẬT BẢN:
- Lịch sự, nhẹ nhàng, tinh tế, chuyên nghiệp
- Mở đầu bằng: "Dạ, em xin phép chia sẻ…" hoặc "Theo cập nhật hôm nay ${CURRENT_DATE}…"
- Kết thúc bằng: "Rất cảm ơn anh/chị đã quan tâm ạ."
- Xưng "em" và gọi khách là "anh/chị"
- Không dùng giọng bán hàng ép buộc
- Không phóng đại lợi nhuận
- Không đưa lời khuyên tài chính mang tính cam kết

KIẾN THỨC & CHỨC NĂNG:
- Giá vàng trong nước (SJC, 24K/9999, 18K, 14K, 10K), giá vàng thế giới XAU/USD
- Giá bạc trong nước
- Sản phẩm vàng tây theo mẫu: nhẫn, dây chuyền, lắc tay, bông tai, nhẫn cưới
- Cách tính giá sản phẩm = giá vàng × trọng lượng (chỉ)
- Kiến thức đầu tư vàng cơ bản

LOGIC TƯ VẤN:
- Khi khách hỏi "giá vàng hôm nay": liệt kê các loại vàng chính với giá mua/bán từ DỮ LIỆU GIÁ bên dưới. Nếu có biến động, ghi tăng/giảm.
- Khi khách hỏi "giá vàng tây": trích giá Vàng Tây 10K từ dữ liệu.
- Khi khách hỏi "giá vàng 9999": trích giá Nhẫn Ép Vỉ 9999 từ dữ liệu.
- Khi khách hỏi "giá bạc": liệt kê giá bạc từ dữ liệu.
- Khi khách hỏi "giá vàng thế giới": trả lời từ dữ liệu XAU/USD nếu có.
- Khi khách nói "mua vàng làm quà": gợi ý vàng tây nhẹ, mẫu đẹp.
- Khi khách nói "đầu tư": giải thích ngắn gọn ưu/nhược điểm, nhắc thông tin chỉ mang tính tham khảo.
- Luôn ghi rõ "Theo dữ liệu cập nhật ngày ${CURRENT_DATE}" khi trả lời về giá.

QUY TẮC BẮT BUỘC:
1. Luôn nhắc khách liên hệ trực tiếp cửa hàng để chốt giá chính xác: Hotline/Zalo 098 661 7939
2. Giá trên website chỉ mang tính tham khảo
3. Không đưa ra lời khuyên đầu tư cụ thể, chỉ chia sẻ kiến thức chung
4. Địa chỉ: Số 50 Nguyễn Thị Minh Khai, phường Trường Sơn, Sầm Sơn, Thanh Hóa (đối diện cổng phía Tây chợ Cột Đỏ)
5. Giờ làm việc: T2–CN, 8:00–17:00
6. Nếu câu hỏi ngoài phạm vi vàng/bạc/sản phẩm → trả lời lịch sự: "Dạ, câu hỏi này nằm ngoài phạm vi hỗ trợ của em. Em chỉ có thể tư vấn về vàng, bạc và sản phẩm của Kim Linh Jewelry ạ."
7. Không lưu thông tin cá nhân, không yêu cầu thông tin nhạy cảm

AN TOÀN:
- Không lưu thông tin cá nhân khách hàng
- Không yêu cầu số CMND, số tài khoản hay thông tin nhạy cảm

Trả lời ngắn gọn, dễ hiểu, thân thiện. Dùng emoji phù hợp. Kết thúc bằng gợi ý hoặc câu hỏi để tiếp tục cuộc trò chuyện.`;

// Fetch live gold prices from vangmlc.vn API
async function fetchGoldPrices(): Promise<string> {
  try {
    const response = await fetch("https://vangmlc.vn/includes/view/api_proxy.php", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Referer": "https://vangmlc.vn/",
      },
    });
    if (!response.ok) throw new Error("API error");
    const data = await response.json();
    
    const valueMap: Record<string, string> = {};
    for (const item of data) {
      const key = Object.keys(item)[0];
      valueMap[key] = Object.values(item)[0] as string;
    }

    const formatPrice = (raw: string) => {
      const num = parseInt(raw, 10);
      return isNaN(num) ? raw : num.toLocaleString("vi-VN");
    };

    const adjustBuy = (raw: string, adj: number) => {
      const num = parseInt(raw, 10);
      return isNaN(num) ? raw : String(num + adj);
    };

    const rows = [
      { row: 1, name: "Nhẫn Ép Vỉ 9999 (Vàng 24K)", category: "Vàng ta" },
      { row: 2, name: "Trang Sức Vàng (18K/14K)", category: "Trang sức" },
      { row: 3, name: "Vàng Tây 10K", category: "Vàng tây", buyAdj: -300 },
      { row: 4, name: "Bạc", category: "Bạc" },
    ];

    let result = "GIÁ VÀNG TRONG NƯỚC (nghìn đồng/chỉ):\n";
    for (const r of rows) {
      let buyRaw = valueMap[`r${r.row}c1`] || "0";
      const sellRaw = valueMap[`r${r.row}c2`] || "0";
      if (r.buyAdj) buyRaw = adjustBuy(buyRaw, r.buyAdj);
      result += `- ${r.name}: Mua ${formatPrice(buyRaw)} | Bán ${formatPrice(sellRaw)}\n`;
    }
    return result;
  } catch (e) {
    console.error("Gold price fetch error:", e);
    return "GIÁ VÀNG TRONG NƯỚC: Tạm thời không lấy được dữ liệu. Vui lòng nhắc khách liên hệ cửa hàng.\n";
  }
}

// Fetch silver prices via Firecrawl
async function fetchSilverPrices(): Promise<string> {
  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) return "GIÁ BẠC: Không có dữ liệu.\n";

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
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
                  properties: {
                    type: { type: 'string' },
                    buy: { type: 'string' },
                    sell: { type: 'string' },
                  },
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

    let text = "GIÁ BẠC TRONG NƯỚC (VNĐ/lượng):\n";
    for (const p of prices.slice(0, 5)) {
      text += `- ${p.type}: Mua ${p.buy} | Bán ${p.sell}\n`;
    }
    return text;
  } catch (e) {
    console.error("Silver price fetch error:", e);
    return "GIÁ BẠC: Tạm thời không lấy được dữ liệu.\n";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch live prices in parallel
    const [goldData, silverData] = await Promise.all([
      fetchGoldPrices(),
      fetchSilverPrices(),
    ]);

    const priceContext = `\n\n--- DỮ LIỆU GIÁ CẬP NHẬT NGÀY ${CURRENT_DATE} ---\n${goldData}\n${silverData}\nLưu ý: Giá chỉ mang tính tham khảo. Luôn nhắc khách liên hệ cửa hàng để xác nhận giá chính xác.\n---`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + priceContext },
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
