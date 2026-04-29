// ============================================================
//  GOLD PRICE STORAGE — lưu lịch sử giá vào localStorage
// ============================================================
//
// Tự động lưu giá vàng từ widget Kim Linh theo nhiều khung
// thời gian (30 phút / giờ / ngày / tuần / tháng) để vẽ
// biểu đồ xu hướng. Không gọi API, không tốn chi phí.
// ============================================================

export interface GoldPricePoint {
  timestamp: number;
  datetime: string;       // "29/04/2026 14:30"
  buyPrice: number;       // số nguyên (nghìn đồng/chỉ)
  sellPrice: number;
}

export interface GoldMonthPoint {
  month: string;          // "04/2026"
  monthTimestamp: number; // timestamp đầu tháng
  openBuy: number;
  openSell: number;
  closeBuy: number;
  closeSell: number;
  highBuy: number;
  lowBuy: number;
}

export type StorageKeyName = 'per30min' | 'perHour' | 'perDay' | 'perWeek' | 'perMonth';

export const STORAGE_KEYS: Record<StorageKeyName, string> = {
  per30min: 'gold_30min',   // 48 điểm (1 ngày)
  perHour:  'gold_hourly',  // 168 điểm (1 tuần)
  perDay:   'gold_daily',   // 365 điểm (1 năm)
  perWeek:  'gold_weekly',  // 104 điểm (2 năm)
  perMonth: 'gold_monthly', // 36 điểm (3 năm)
};

const LIMITS: Record<StorageKeyName, number> = {
  per30min: 48,
  perHour: 168,
  perDay: 365,
  perWeek: 104,
  perMonth: 36,
};

// ---------- Helpers ----------
const pad = (n: number) => n.toString().padStart(2, '0');

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatMonth(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Parse chuỗi giá Việt Nam ("15.300", "15,300", "15.300 ") thành số nguyên.
 * Trả về null nếu không hợp lệ.
 */
export function parseVNPrice(str: string | number | undefined | null): number | null {
  if (str == null) return null;
  if (typeof str === 'number') return Number.isFinite(str) && str > 0 ? str : null;
  const cleaned = String(str).replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function safeRead<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[gold-storage] write failed', key, e);
  }
}

export function getStoragePoints(name: StorageKeyName): GoldPricePoint[] {
  return safeRead<GoldPricePoint>(STORAGE_KEYS[name]);
}

export function getMonthlyPoints(): GoldMonthPoint[] {
  return safeRead<GoldMonthPoint>(STORAGE_KEYS.perMonth);
}

function getLastSaved(name: StorageKeyName): GoldPricePoint | null {
  const arr = getStoragePoints(name);
  return arr.length ? arr[arr.length - 1] : null;
}

function appendToStorage(name: StorageKeyName, point: GoldPricePoint) {
  const arr = getStoragePoints(name);
  arr.push(point);
  const trimmed = arr.slice(-LIMITS[name]);
  safeWrite(STORAGE_KEYS[name], trimmed);
}

function updateMonthlyData(buy: number, sell: number, now: number) {
  const monthKey = formatMonth(now);
  const monthly = getMonthlyPoints();
  const idx = monthly.findIndex(m => m.month === monthKey);

  if (idx === -1) {
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    monthly.push({
      month: monthKey,
      monthTimestamp: monthStart.getTime(),
      openBuy: buy, openSell: sell,
      closeBuy: buy, closeSell: sell,
      highBuy: buy, lowBuy: buy,
    });
  } else {
    const m = monthly[idx];
    m.closeBuy = buy;
    m.closeSell = sell;
    m.highBuy = Math.max(m.highBuy, buy);
    m.lowBuy = m.lowBuy === 0 ? buy : Math.min(m.lowBuy, buy);
  }

  safeWrite(STORAGE_KEYS.perMonth, monthly.slice(-LIMITS.perMonth));
}

/**
 * Lưu một điểm giá vào tất cả các khung thời gian phù hợp.
 * Tự throttle: 30ph/1h/1ngày/1tuần — chỉ lưu khi đủ thời gian từ điểm cuối.
 */
export function saveGoldPrice(buyPrice: number, sellPrice: number, now: number = Date.now()): void {
  if (!buyPrice || !sellPrice) return;
  if (typeof window === 'undefined' || !window.localStorage) return;

  const point: GoldPricePoint = {
    timestamp: now,
    datetime: formatDateTime(now),
    buyPrice,
    sellPrice,
  };

  // 30 phút
  const last30 = getLastSaved('per30min');
  if (!last30 || now - last30.timestamp >= 30 * 60 * 1000) {
    appendToStorage('per30min', point);
  }

  // 1 giờ
  const lastHour = getLastSaved('perHour');
  if (!lastHour || now - lastHour.timestamp >= 60 * 60 * 1000) {
    appendToStorage('perHour', point);
  }

  // 1 ngày — chỉ 1 điểm/ngày
  const lastDay = getLastSaved('perDay');
  if (!lastDay || formatDate(lastDay.timestamp) !== formatDate(now)) {
    appendToStorage('perDay', point);
  }

  // 1 tuần
  const lastWeek = getLastSaved('perWeek');
  if (!lastWeek || now - lastWeek.timestamp >= 7 * 24 * 60 * 60 * 1000) {
    appendToStorage('perWeek', point);
  }

  // Tháng (open/close/high/low)
  updateMonthlyData(buyPrice, sellPrice, now);
}

/**
 * Lấy giá đại diện hiện tại từ mảng prices của widget.
 * Ưu tiên Vàng 9999/24K/SJC, fallback dòng đầu tiên có giá hợp lệ.
 */
export function extractCurrentPrice(
  prices: Array<{ type: string; buy: string; sell: string; category?: string }>
): { buy: number; sell: number } | null {
  if (!prices?.length) return null;
  const ranked = [...prices].sort((a, b) => {
    const score = (t: string) => {
      const x = (t || '').toLowerCase();
      if (x.includes('9999') || x.includes('24k')) return 0;
      if (x.includes('sjc')) return 1;
      if (x.includes('nhẫn')) return 2;
      return 3;
    };
    return score(a.type) - score(b.type);
  });
  for (const p of ranked) {
    const buy = parseVNPrice(p.buy);
    const sell = parseVNPrice(p.sell);
    if (buy && sell) return { buy, sell };
  }
  return null;
}

/** Lấy thống kê nhanh cho UI. */
export function getQuickStats(): {
  current: GoldPricePoint | null;
  todayChange: number | null;
  todayChangePct: number | null;
  monthHigh: number | null;
  monthLow: number | null;
} {
  const days = getStoragePoints('perDay');
  const current = days[days.length - 1] || getStoragePoints('per30min').slice(-1)[0] || null;

  const todayKey = formatDate(Date.now());
  // Thay đổi hôm nay = current.buy - giá đầu ngày hôm nay (per30min)
  const todays30 = getStoragePoints('per30min').filter(p => formatDate(p.timestamp) === todayKey);
  const todayOpen = todays30[0]?.buyPrice ?? null;
  const todayChange = current && todayOpen ? current.buyPrice - todayOpen : null;
  const todayChangePct = todayChange != null && todayOpen ? (todayChange / todayOpen) * 100 : null;

  // Cao/thấp tháng này
  const monthly = getMonthlyPoints();
  const cur = monthly[monthly.length - 1];
  return {
    current,
    todayChange,
    todayChangePct,
    monthHigh: cur?.highBuy ?? null,
    monthLow: cur?.lowBuy ?? null,
  };
}