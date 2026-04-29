/*
╔══════════════════════════════════════════╗
║   HƯỚNG DẪN CẬP NHẬT MỖI THỨ 2          ║
╠══════════════════════════════════════════╣
║ Thời gian: ~5 phút/tuần                  ║
║                                          ║
║ BƯỚC 1: Vào TradingView xem XAU/USD      ║
║ BƯỚC 2: Cập nhật lastUpdated = ngày hôm nay ║
║ BƯỚC 3: Sửa signal (Mua/Bán/Tích lũy)   ║
║ BƯỚC 4: Viết summary 2-3 câu tóm tắt    ║
║ BƯỚC 5: Cập nhật keyFactors tuần này     ║
║ BƯỚC 6: Lưu file → website tự cập nhật  ║
║                                          ║
║ KHÔNG cần sửa gì khác!                   ║
║                                          ║
║ MẸO: Truy cập website với ?admin=true   ║
║ để dùng nút "Tạo Phân Tích Mới Bằng AI" ║
║ → Copy nội dung trả về vào file này.    ║
╚══════════════════════════════════════════╝
*/

export type AnalysisSignal = 'Mua mạnh' | 'Mua' | 'Tích lũy' | 'Bán' | 'Bán mạnh';
export type SignalColor = 'green' | 'yellow' | 'red';

export interface AnalysisIndicator {
  name: string;
  value: string;
  signal: string;
}

export interface GoldAnalysisCache {
  lastUpdated: string;
  signal: AnalysisSignal;
  signalColor: SignalColor;
  summary: string;
  priceTrend: string;
  keyFactors: string[];
  recommendation: string;
  indicators: AnalysisIndicator[];
}

export const goldAnalysisCache: GoldAnalysisCache = {
  // ✏️ ADMIN CẬP NHẬT MỖI THỨ 2 HÀNG TUẦN
  lastUpdated: '29/04/2026',

  signal: 'Tích lũy',
  signalColor: 'yellow',

  summary: `
    Vàng đang trong giai đoạn tích lũy quanh vùng 4.500-4.600 USD/oz.
    Các đường trung bình động cho tín hiệu trung lập. Nhà đầu tư nên
    chờ tín hiệu rõ hơn trước khi vào lệnh mạnh.
  `,

  priceTrend: `
    Vàng dao động trong biên độ hẹp 4.520-4.580 USD/oz trong tuần qua.
    Hỗ trợ mạnh tại 4.500 USD, kháng cự tại 4.600 USD.
    Xu hướng trung hạn vẫn tăng nhẹ.
  `,

  keyFactors: [
    'Đồng USD tăng nhẹ gây áp lực lên giá vàng',
    'Căng thẳng địa chính trị hỗ trợ nhu cầu trú ẩn an toàn',
    'Fed chưa có tín hiệu rõ về lãi suất',
    'Nhu cầu mua vàng từ các ngân hàng trung ương vẫn cao',
  ],

  recommendation: `
    Nhà đầu tư dài hạn: Có thể tích lũy thêm khi giá về vùng hỗ trợ.
    Nhà đầu tư ngắn hạn: Chờ breakout khỏi vùng tích lũy mới vào lệnh.
    Lưu ý: Đây chỉ là thông tin tham khảo, không phải tư vấn tài chính.
  `,

  indicators: [
    { name: 'RSI (14)', value: '52', signal: 'Trung lập' },
    { name: 'MACD', value: 'Dương nhẹ', signal: 'Mua yếu' },
    { name: 'MA 50', value: '4.520', signal: 'Hỗ trợ' },
    { name: 'MA 200', value: '4.350', signal: 'Xu hướng tăng' },
    { name: 'Bollinger Bands', value: 'Thu hẹp', signal: 'Sắp bùng nổ' },
  ],
};