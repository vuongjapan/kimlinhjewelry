// ============================================================
//  KIM LINH JEWELRY – CHATBOT CONFIG (TĨNH, TIẾT KIỆM CHI PHÍ)
// ============================================================
//
// HƯỚNG DẪN CẬP NHẬT MỖI ĐẦU TUẦN
// --------------------------------
// 1. Mở file này
// 2. Sửa phần `weeklyUpdate`:
//      - Cập nhật giá vàng tham khảo
//      - Thêm khuyến mãi nếu có
//      - Cập nhật ngày
// 3. Lưu file → Lovable tự build lại
// 4. KHÔNG cần sửa gì khác!
//
// Thời gian cập nhật: ~2 phút/tuần
// ============================================================

export const kimlinhConfig = {
  // ✏️ ADMIN CẬP NHẬT MỖI ĐẦU TUẦN — chỉ sửa file này
  weeklyUpdate: `
    Cập nhật: [ngày cập nhật]
    Giá vàng hôm nay (tham khảo):
    - Nhẫn Ép Vỉ 9999: Mua 15.150 / Bán 15.300 (triệu/lượng)
    - Trang Sức Vàng: Mua 15.100 / Bán 15.250
    - Vàng Tây 10K: Mua 5.800 / Bán 7.000
    - Bạc: Mua 140 / Bán 270 (nghìn/chỉ)
    Lưu ý tuần này: [admin điền khuyến mãi nếu có]
  `,

  shopInfo: `
    Tên: Kim Linh Jewelry
    Địa chỉ: Số 50 Nguyễn Thị Minh Khai, P. Trường Sơn, Sầm Sơn, Thanh Hóa
    Hotline: 098 661 7939
    Giờ mở cửa: 8:00 - 17:00 hàng ngày (T2 - CN)
    Dịch vụ: Mua bán vàng bạc, gia công trang sức,
    thu đổi vàng, tư vấn đầu tư vàng
  `,

  policy: `
    - Kiểm định vàng miễn phí
    - Mua lại 100% sản phẩm đã mua tại Kim Linh
    - Bảo hành trang sức 12 tháng
    - Gia công theo yêu cầu 3-7 ngày
    - Thanh toán: Tiền mặt, chuyển khoản
  `,

  hotline: '098 661 7939',
  address: 'Số 50 Nguyễn Thị Minh Khai, P. Trường Sơn, Sầm Sơn, Thanh Hóa',
};

// ---------- SMART REPLY (KHÔNG TỐN API) ----------
export const smartReply = (msg: string): string | null => {
  const m = msg.toLowerCase();

  if (m.match(/giờ|mấy giờ|mở cửa|đóng cửa/))
    return 'Dạ Kim Linh mở cửa 8:00 - 17:00 hàng ngày (T2 - CN) ạ! 🕐';

  if (m.match(/địa chỉ|ở đâu|chỗ nào|đường nào/))
    return `Dạ Kim Linh ở ${kimlinhConfig.address} ạ! 📍 Anh/chị cần chỉ đường không ạ?`;

  if (m.match(/hotline|số điện thoại|liên hệ|gọi|zalo/))
    return `Dạ hotline Kim Linh: ${kimlinhConfig.hotline} ạ! 📞 Anh/chị có thể gọi hoặc nhắn Zalo ạ!`;

  if (m.match(/giá vàng|giá hôm nay|vàng bao nhiêu|9999|sjc/))
    return `Dạ giá vàng tham khảo hôm nay:\n${kimlinhConfig.weeklyUpdate}\nGiá thực tế có thể thay đổi, anh/chị ghé cửa hàng để được báo giá chính xác nhất ạ! 🥇`;

  if (m.match(/bạc|bạc bao nhiêu|giá bạc/))
    return 'Dạ giá bạc hôm nay: Mua 140k - Bán 270k/chỉ ạ! Anh/chị cần tư vấn thêm không ạ?';

  if (m.match(/bảo hành|đổi trả|hoàn tiền/))
    return 'Dạ Kim Linh bảo hành trang sức 12 tháng, mua lại 100% sản phẩm đã mua tại tiệm ạ! ✅';

  if (m.match(/gia công|đặt làm|làm nhẫn|làm dây|thiết kế/))
    return 'Dạ Kim Linh nhận gia công trang sức theo yêu cầu, thời gian 3-7 ngày ạ! 💍 Anh/chị muốn làm gì để em tư vấn cụ thể hơn ạ?';

  if (m.match(/kiểm định|thử vàng|xem vàng|vàng thật|vàng giả/))
    return 'Dạ Kim Linh kiểm định vàng MIỄN PHÍ ạ! Anh/chị mang vàng đến cửa hàng em kiểm tra ngay ạ! ✅';

  if (m.match(/^(xin chào|hello|hi|chào|alo)/))
    return 'Dạ em chào anh/chị! 🌟 Em là trợ lý tư vấn của Kim Linh Jewelry. Anh/chị cần tư vấn về vàng bạc hay trang sức gì ạ?';

  if (m.match(/cảm ơn|thanks|thank/))
    return 'Dạ không có gì ạ! Kim Linh luôn sẵn sàng hỗ trợ anh/chị. Chúc anh/chị ngày vui ạ! 😊';

  return null; // Không khớp → mới gọi API
};

export const QUICK_REPLIES = [
  { label: '💰 Giá vàng hôm nay', query: 'giá vàng hôm nay' },
  { label: '📍 Địa chỉ tiệm', query: 'địa chỉ' },
  { label: '🕐 Giờ mở cửa', query: 'giờ mở cửa' },
  { label: '💍 Gia công trang sức', query: 'gia công trang sức' },
];

export const MAX_MESSAGES_PER_SESSION = 10;

export const FALLBACK_BUSY = `Dạ hệ thống đang bận, anh/chị vui lòng gọi hotline ${kimlinhConfig.hotline} hoặc nhắn Zalo để được tư vấn trực tiếp ạ! 😊`;
export const LIMIT_REACHED = `Anh/chị đã trò chuyện khá nhiều rồi ạ 🙏 Vui lòng gọi hotline ${kimlinhConfig.hotline} để được hỗ trợ trực tiếp nhanh nhất ạ! 📞`;