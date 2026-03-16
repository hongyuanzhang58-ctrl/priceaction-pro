/**
 * Real Stock Data API Service
 * 多数据源股票API服务，支持新浪财经、腾讯财经、东方财富、Apify
 * 自动降级、负载均衡、缓存机制
 * 注意：无模拟数据兜底，全部使用真实数据
 */

import { Stock, Candle, TimeFrame, Sector, News } from '../types';
import { ApifyClient } from 'apify-client';
import { LocalListDataSource } from './localListDataSource';

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN || '';

// ==================== 配置 ====================

const CACHE_CONFIG = {
  stockTTL: 30 * 1000,      // 股票数据缓存30秒
  candleTTL: 60 * 1000,     // K线数据缓存1分钟
  sectorTTL: 5 * 60 * 1000, // 板块数据缓存5分钟
  newsTTL: 5 * 60 * 1000,   // 新闻缓存5分钟
  maxCacheSize: 200,        // 最大缓存条目数
};

const RATE_LIMIT = {
  minRequestInterval: 500,  // 最小请求间隔500ms（避免被限流）
  maxRetries: 2,            // 最大重试次数
};

// ==================== 缓存实现 ====================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const ttl = this.getTTL(key);
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T): void {
    if (this.cache.size >= CACHE_CONFIG.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  private getTTL(key: string): number {
    if (key.includes('candle')) return CACHE_CONFIG.candleTTL;
    if (key.includes('sector')) return CACHE_CONFIG.sectorTTL;
    if (key.includes('news')) return CACHE_CONFIG.newsTTL;
    return CACHE_CONFIG.stockTTL;
  }
}

// ==================== 请求队列 ====================

class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await this.executeWithRateLimit(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) await request();
    }

    this.processing = false;
  }

  private async executeWithRateLimit<T>(request: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT.minRequestInterval) {
      await this.sleep(RATE_LIMIT.minRequestInterval - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    return request();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 数据源抽象类 ====================

abstract class DataSource {
  abstract name: string;
  abstract priority: number;
  abstract enabled: boolean;

  abstract getStock(symbol: string): Promise<Stock | null>;
  abstract getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]>;
  abstract searchStocks(query: string): Promise<Stock[]>;

  // 可选方法
  async getHotSectors(): Promise<Sector[]> { return []; }
  async getNews(_symbols?: string[]): Promise<News[]> { return []; }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.getStock('000001');
      return result !== null;
    } catch {
      return false;
    }
  }
}

// ==================== 新浪财经数据源 ====================

class SinaDataSource extends DataSource {
  name = '新浪财经';
  priority = 2;  // 行情API很好，但搜索API可能有CORS问题
  enabled = true;

  async getStock(symbol: string): Promise<Stock | null> {
    const sinaCode = this.toSinaCode(symbol);
    const url = `https://hq.sinajs.cn/list=${sinaCode}`;

    try {
      const response = await fetch(url, {
        headers: { 'Referer': 'https://finance.sina.com.cn' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      return this.parseStockData(text, symbol);
    } catch (error) {
      console.warn(`[${this.name}] 获取股票${symbol}失败:`, error);
      return null;
    }
  }

  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    const sinaCode = this.toSinaCode(symbol);

    try {
      if (timeFrame === '1d' || timeFrame === '1w' || timeFrame === '1M') {
        return await this.getDailyKline(sinaCode, timeFrame);
      }
      return await this.getMinuteKline(sinaCode, timeFrame);
    } catch (error) {
      console.warn(`[${this.name}] 获取K线${symbol}失败:`, error);
      return [];
    }
  }

  // 搜索股票 - 新浪搜索API返回JSONP格式，浏览器CORS限制无法直接使用
  async searchStocks(_query: string): Promise<Stock[]> {
    return [];
  }

  private async getDailyKline(sinaCode: string, _timeFrame: TimeFrame): Promise<Candle[]> {
    const url = `https://stock.finance.sina.com.cn/stock/api/jsonp_v2.php/var=_kline/StockService.getStockMinuteLine?symbol=${sinaCode}`;

    try {
      const response = await fetch(url, {
        headers: { 'Referer': 'https://finance.sina.com.cn' },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      return this.parseDailyKlineData(text);
    } catch (error) {
      throw error;
    }
  }

  private async getMinuteKline(sinaCode: string, timeFrame: TimeFrame): Promise<Candle[]> {
    const scale = this.timeFrameToScale(timeFrame);
    const url = `https://quotes.sina.cn/cn/api/quotes.php?symbol=${sinaCode}&scale=${scale}&ma=5&datalen=240`;

    const response = await fetch(url, {
      headers: { 'Referer': 'https://finance.sina.com.cn' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return this.parseKlineData(data);
  }

  private parseDailyKlineData(text: string): Candle[] {
    const match = text.match(/var _kline=\[([^\]]*)\]/);
    if (!match) return [];

    try {
      const data = JSON.parse(`[${match[1]}]`);

      return data.map((item: any) => ({
        time: item.d,
        open: parseFloat(item.o),
        high: parseFloat(item.h),
        low: parseFloat(item.l),
        close: parseFloat(item.c),
        volume: parseFloat(item.v),
      }));
    } catch {
      return [];
    }
  }

  private toSinaCode(symbol: string): string {
    if (symbol.startsWith('6') || symbol.startsWith('5')) return `sh${symbol}`;
    if (symbol.startsWith('0') || symbol.startsWith('2') || symbol.startsWith('3')) return `sz${symbol}`;
    if (symbol.startsWith('8') || symbol.startsWith('4')) return `bj${symbol}`;
    return symbol;
  }

  private timeFrameToScale(tf: TimeFrame): number {
    const scaleMap: Record<TimeFrame, number> = {
      '1m': 1, '5m': 5, '15m': 15, '30m': 30, '60m': 60,
      '1d': 240, '1w': 1680, '1M': 7200,
    };
    return scaleMap[tf] || 240;
  }

  private parseStockData(text: string, symbol: string): Stock | null {
    const match = text.match(/var hq_str_\w+="([^"]*)"/);
    if (!match) return null;

    const parts = match[1].split(',');
    if (parts.length < 5) return null;

    const name = parts[0];
    const close = parseFloat(parts[2]);
    const volume = parseFloat(parts[8]);
    const turnover = parseFloat(parts[9]);
    const prevClose = parseFloat(parts[2]) - parseFloat(parts[3]);
    const change = parseFloat(parts[3]);
    const changePercent = (change / prevClose) * 100;

    return {
      symbol,
      name,
      price: close,
      change,
      changePercent: Number(changePercent.toFixed(2)),
      volume,
      turnover,
    };
  }

  private parseKlineData(data: any): Candle[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: any) => ({
      time: item.day,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume),
    }));
  }
}

// ==================== 腾讯财经数据源 ====================

class TencentDataSource extends DataSource {
  name = '腾讯财经';
  priority = 3;  // 搜索API可能有CORS问题
  enabled = true;

  async getStock(symbol: string): Promise<Stock | null> {
    const tencentCode = this.toTencentCode(symbol);
    const url = `https://qt.gtimg.cn/q=${tencentCode}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      return this.parseStockData(text, symbol);
    } catch (error) {
      console.warn(`[${this.name}] 获取股票${symbol}失败:`, error);
      return null;
    }
  }

  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    const tencentCode = this.toTencentCode(symbol);
    const { period, startDate, endDate } = this.getDateParams(timeFrame);

    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tencentCode},${period},${startDate},${endDate},500,qfq`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      return this.parseKlineData(data, tencentCode, period);
    } catch (error) {
      console.warn(`[${this.name}] 获取K线${symbol}失败:`, error);
      return [];
    }
  }

  // 搜索股票 - 腾讯搜索API返回JSONP格式，浏览器CORS限制无法直接使用
  async searchStocks(_query: string): Promise<Stock[]> {
    return [];
  }

  private toTencentCode(symbol: string): string {
    if (symbol.startsWith('6') || symbol.startsWith('5')) return `sh${symbol}`;
    if (symbol.startsWith('0') || symbol.startsWith('2') || symbol.startsWith('3')) return `sz${symbol}`;
    if (symbol.startsWith('8') || symbol.startsWith('4')) return `bj${symbol}`;
    return symbol;
  }

  private getDateParams(tf: TimeFrame): { period: string; startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    const startDate = new Date();

    switch (tf) {
      case '1m':
      case '5m':
      case '15m':
      case '30m':
      case '60m':
        startDate.setDate(now.getDate() - 7);
        return { period: 'm', startDate: startDate.toISOString().split('T')[0], endDate };
      case '1d':
        startDate.setFullYear(now.getFullYear() - 2);
        return { period: 'day', startDate: startDate.toISOString().split('T')[0], endDate };
      case '1w':
        startDate.setFullYear(now.getFullYear() - 5);
        return { period: 'week', startDate: startDate.toISOString().split('T')[0], endDate };
      case '1M':
        startDate.setFullYear(now.getFullYear() - 10);
        return { period: 'month', startDate: startDate.toISOString().split('T')[0], endDate };
      default:
        return { period: 'day', startDate: startDate.toISOString().split('T')[0], endDate };
    }
  }

  private parseStockData(text: string, symbol: string): Stock | null {
    const match = text.match(/v_\w+="([^"]*)"/);
    if (!match) return null;

    const parts = match[1].split('~');
    if (parts.length < 10) return null;

    const name = parts[1];
    const price = parseFloat(parts[3]);
    const prevClose = parseFloat(parts[4]);
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    const volume = parseFloat(parts[6]);
    const turnover = parseFloat(parts[7]);

    return {
      symbol,
      name,
      price,
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume,
      turnover,
    };
  }

  private parseKlineData(data: any, code: string, period: string): Candle[] {
    const key = code;
    const listKey = period === 'm' ? 'm' : period;

    if (!data.data || !data.data[key] || !data.data[key][listKey]) return [];

    return data.data[key][listKey].map((item: any) => ({
      time: item[0],
      open: parseFloat(item[1]),
      close: parseFloat(item[2]),
      low: parseFloat(item[3]),
      high: parseFloat(item[4]),
      volume: parseFloat(item[5]),
    }));
  }
}

// ==================== 东方财富数据源 ====================

class EastMoneyDataSource extends DataSource {
  name = '东方财富';
  priority = 1;  // 提升为最高优先级，搜索API最可靠
  enabled = true;

  async getStock(symbol: string): Promise<Stock | null> {
    const secid = this.getSecid(symbol);
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      return this.parseStockData(data, symbol);
    } catch (error) {
      console.warn(`[${this.name}] 获取股票${symbol}失败:`, error);
      return null;
    }
  }

  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    const secid = this.getSecid(symbol);
    const periodMap: Record<TimeFrame, string> = {
      '1m': '1', '5m': '5', '15m': '15', '30m': '30', '60m': '60',
      '1d': '101', '1w': '102', '1M': '103',
    };

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${periodMap[timeFrame]}&fqt=0&end=20500101&lmt=200`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      return this.parseKlineData(data);
    } catch (error) {
      console.warn(`[${this.name}] 获取K线${symbol}失败:`, error);
      return [];
    }
  }

  // 搜索股票 - 由于浏览器CORS限制，使用直接代码查询方式
  async searchStocks(query: string): Promise<Stock[]> {
    if (!query.trim()) return [];

    const trimmedQuery = query.trim();

    // 如果输入是6位数字，直接作为股票代码查询
    if (/^\d{6}$/.test(trimmedQuery)) {
      const stock = await this.getStock(trimmedQuery);
      return stock ? [stock] : [];
    }

    // 如果输入是名称，尝试一些常见股票（硬编码列表用于演示）
    // 实际生产环境应该使用后端代理服务器来调用搜索API
    const commonStocks: Record<string, string> = {
      '茅台': '600519',
      '平安': '000001',
      '宁德时代': '300750',
      '中国平安': '601318',
      '五粮液': '000858',
      '比亚迪': '002594',
      '招商银行': '600036',
      '美的': '000333',
      '药明康德': '603259',
      '立讯精密': '002475',
      '中信证券': '600030',
      '东方财富': '300059',
      '兴业银行': '601166',
      '工商银行': '601398',
      '建设银行': '601939',
      '农业银行': '601288',
      '中国银行': '601988',
    };

    const symbol = commonStocks[trimmedQuery];
    if (symbol) {
      const stock = await this.getStock(symbol);
      return stock ? [stock] : [];
    }

    // 尝试模糊匹配
    const matches: string[] = [];
    for (const [name, code] of Object.entries(commonStocks)) {
      if (name.includes(trimmedQuery)) {
        matches.push(code);
      }
    }

    const results: Stock[] = [];
    for (const code of matches.slice(0, 5)) {
      const stock = await this.getStock(code);
      if (stock) results.push(stock);
    }

    return results;
  }

  async getHotSectors(): Promise<Sector[]> {
    const url = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f20&fs=m:90+t:2+f:!50&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222';

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      return this.parseSectorData(data);
    } catch (error) {
      console.warn(`[${this.name}] 获取板块失败:`, error);
      return [];
    }
  }

  private getSecid(symbol: string): string {
    if (symbol.startsWith('6')) return `1.${symbol}`;
    if (symbol.startsWith('0') || symbol.startsWith('3')) return `0.${symbol}`;
    if (symbol.startsWith('8') || symbol.startsWith('4')) return `0.${symbol}`;
    return `0.${symbol}`;
  }

  private parseStockData(data: any, symbol: string): Stock | null {
    if (!data.data) return null;

    const d = data.data;
    return {
      symbol: d.f57 || symbol,
      name: d.f58 || symbol,
      price: (d.f43 || 0) / 100,
      change: (d.f170 || 0) / 100,
      changePercent: (d.f170 || 0) / 100,
      volume: (d.f47 || 0) / 100,
      turnover: (d.f48 || 0) / 10000,
    };
  }

  private parseKlineData(data: any): Candle[] {
    if (!data.data || !data.data.klines) return [];

    return data.data.klines.map((line: string) => {
      const parts = line.split(',');
      return {
        time: parts[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        low: parseFloat(parts[4]),
        high: parseFloat(parts[3]),
        volume: parseFloat(parts[5]),
      };
    });
  }

  private parseSectorData(data: any): Sector[] {
    if (!data.data || !data.data.diff) return [];

    return data.data.diff.map((item: any, index: number) => ({
      code: item.f12 || `sector_${index}`,
      name: item.f14 || '未知板块',
      heatIndex: Math.min(100, Math.abs(item.f3 || 0)),
      change: (item.f4 || 0) / 100,
      changePercent: (item.f3 || 0) / 100,
      leadingStocks: [],
    }));
  }
}

// ==================== Apify数据源 ====================

class ApifyDataSource extends DataSource {
  name = 'Apify';
  priority = 2;  // 可靠的备用源
  enabled = !!APIFY_TOKEN;
  private client: ApifyClient;

  constructor() {
    super();
    this.client = new ApifyClient({ token: APIFY_TOKEN });
  }

  async getStock(symbol: string): Promise<Stock | null> {
    if (!APIFY_TOKEN) return null;

    try {
      const secid = this.getSecid(symbol);
      const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170`;

      const { defaultDatasetId } = await this.client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'none',
        pageLoadTimeoutSecs: 10,
      });

      const { items } = await this.client.dataset(defaultDatasetId).listItems();
      if (!items || items.length === 0) return null;

      return this.parseStockData(items[0], symbol);
    } catch (error) {
      console.warn(`[${this.name}] 获取股票${symbol}失败:`, error);
      return null;
    }
  }

  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    if (!APIFY_TOKEN) return [];

    const periodMap: Record<TimeFrame, string> = {
      '1m': '1', '5m': '5', '15m': '15', '30m': '30', '60m': '60',
      '1d': '101', '1w': '102', '1M': '103',
    };

    try {
      const secid = this.getSecid(symbol);
      const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${periodMap[timeFrame]}&fqt=0&end=20500101&lmt=200`;

      const { defaultDatasetId } = await this.client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'none',
        pageLoadTimeoutSecs: 10,
      });

      const { items } = await this.client.dataset(defaultDatasetId).listItems();
      if (!items || items.length === 0) return [];

      return this.parseKlineData(items[0]);
    } catch (error) {
      console.warn(`[${this.name}] 获取K线${symbol}失败:`, error);
      return [];
    }
  }

  async searchStocks(query: string): Promise<Stock[]> {
    if (!APIFY_TOKEN) return [];

    try {
      const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(query)}&type=14&count=10`;

      const { defaultDatasetId } = await this.client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'none',
        pageLoadTimeoutSecs: 10,
      });

      const { items } = await this.client.dataset(defaultDatasetId).listItems();
      if (!items || items.length === 0) return [];

      return this.parseSearchData(items[0]);
    } catch (error) {
      console.warn(`[${this.name}] 搜索失败:`, error);
      return [];
    }
  }

  async getHotSectors(): Promise<Sector[]> {
    if (!APIFY_TOKEN) return [];

    try {
      const url = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f20&fs=m:90+t:2+f:!50&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222';

      const { defaultDatasetId } = await this.client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'none',
        pageLoadTimeoutSecs: 10,
      });

      const { items } = await this.client.dataset(defaultDatasetId).listItems();
      if (!items || items.length === 0) return [];

      return this.parseSectorData(items[0]);
    } catch (error) {
      console.warn(`[${this.name}] 获取板块失败:`, error);
      return [];
    }
  }

  private getSecid(symbol: string): string {
    if (symbol.startsWith('6')) return `1.${symbol}`;
    if (symbol.startsWith('0') || symbol.startsWith('3')) return `0.${symbol}`;
    if (symbol.startsWith('8') || symbol.startsWith('4')) return `0.${symbol}`;
    return `0.${symbol}`;
  }

  private parseStockData(data: any, symbol: string): Stock | null {
    try {
      const text = data.text || data.body || '';
      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) return null;

      const json = JSON.parse(jsonMatch[0]);
      if (!json.data) return null;

      const d = json.data;
      return {
        symbol: d.f57 || symbol,
        name: d.f58 || symbol,
        price: (d.f43 || 0) / 100,
        change: (d.f170 || 0) / 100,
        changePercent: (d.f170 || 0) / 100,
        volume: (d.f47 || 0) / 100,
        turnover: (d.f48 || 0) / 10000,
      };
    } catch (error) {
      console.error('Failed to parse stock data:', error);
      return null;
    }
  }

  private parseKlineData(data: any): Candle[] {
    try {
      const text = data.text || data.body || '';
      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) return [];

      const json = JSON.parse(jsonMatch[0]);
      if (!json.data || !json.data.klines) return [];

      return json.data.klines.map((line: string) => {
        const parts = line.split(',');
        return {
          time: parts[0],
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          low: parseFloat(parts[4]),
          high: parseFloat(parts[3]),
          volume: parseFloat(parts[5]),
        };
      });
    } catch (error) {
      console.error('Failed to parse kline data:', error);
      return [];
    }
  }

  private parseSearchData(data: any): Stock[] {
    try {
      const text = data.text || data.body || '';
      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) return [];

      const json = JSON.parse(jsonMatch[0]);
      if (!json.QuotationCodeTable || !json.QuotationCodeTable.Data) return [];

      return json.QuotationCodeTable.Data.map((item: any) => ({
        symbol: item.Code,
        name: item.Name,
        price: 0, change: 0, changePercent: 0, volume: 0, turnover: 0,
      }));
    } catch (error) {
      console.error('Failed to parse search data:', error);
      return [];
    }
  }

  private parseSectorData(data: any): Sector[] {
    try {
      const text = data.text || data.body || '';
      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) return [];

      const json = JSON.parse(jsonMatch[0]);
      if (!json.data || !json.data.diff) return [];

      return json.data.diff.map((item: any, index: number) => ({
        code: item.f12 || `sector_${index}`,
        name: item.f14 || '未知板块',
        heatIndex: Math.min(100, Math.abs(item.f3 || 0)),
        change: (item.f4 || 0) / 100,
        changePercent: (item.f3 || 0) / 100,
        leadingStocks: [],
      }));
    } catch (error) {
      console.error('Failed to parse sector data:', error);
      return [];
    }
  }
}

// ==================== 多数据源管理器 ====================

class MultiSourceManager {
  private sources: DataSource[] = [];
  private cache: DataCache;
  private queue: RequestQueue;
  private sourceStatus: Map<string, { healthy: boolean; lastCheck: number }> = new Map();

  constructor() {
    this.cache = new DataCache();
    this.queue = new RequestQueue();

    // 注册数据源（按优先级排序）
    // 注意：无模拟数据兜底，全部使用真实数据
    this.sources = [
      new LocalListDataSource(),  // 本地股票列表（最高优先级，解决搜索问题）
      new SinaDataSource(),
      new TencentDataSource(),
      new EastMoneyDataSource(),
      new ApifyDataSource(),
    ].sort((a, b) => a.priority - b.priority);

    // 初始化状态
    this.sources.forEach(s => this.sourceStatus.set(s.name, { healthy: true, lastCheck: 0 }));
  }

  // 获取第一个可用的数据源
  private async getAvailableSource<T>(
    operation: (source: DataSource) => Promise<T>,
    validateResult: (result: T) => boolean
  ): Promise<{ result: T; source: DataSource } | null> {
    for (const source of this.sources) {
      if (!source.enabled) continue;

      try {
        const result = await this.queue.add(() => operation(source));
        if (validateResult(result)) {
          this.updateSourceStatus(source.name, true);
          return { result, source };
        }
      } catch (error) {
        console.warn(`[${source.name}] 操作失败:`, error);
        this.updateSourceStatus(source.name, false);
      }
    }

    // 没有可用数据源时返回null（无兜底）
    console.error('[MultiSource] 所有数据源均不可用');
    return null;
  }

  private updateSourceStatus(name: string, healthy: boolean): void {
    this.sourceStatus.set(name, { healthy, lastCheck: Date.now() });
  }

  // 获取股票数据
  async getStock(symbol: string): Promise<Stock | null> {
    const cacheKey = `stock_${symbol}`;
    const cached = this.cache.get<Stock>(cacheKey);
    if (cached) return cached;

    const response = await this.getAvailableSource(
      s => s.getStock(symbol),
      result => result !== null
    );

    if (response) {
      console.log(`[MultiSource] 股票${symbol} 从 ${response.source.name} 获取`);
      this.cache.set(cacheKey, response.result);
      return response.result;
    }

    return null;
  }

  // 获取K线数据
  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    const cacheKey = `candles_${symbol}_${timeFrame}`;
    const cached = this.cache.get<Candle[]>(cacheKey);
    if (cached) return cached;

    const response = await this.getAvailableSource(
      s => s.getCandles(symbol, timeFrame),
      result => result.length > 0
    );

    if (response) {
      console.log(`[MultiSource] K线${symbol} 从 ${response.source.name} 获取`);
      this.cache.set(cacheKey, response.result);
      return response.result;
    }

    return [];
  }

  // 搜索股票（优先使用本地股票列表）
  async searchStocks(query: string): Promise<Stock[]> {
    console.log('[MultiSource] 开始搜索:', query);
    if (!query.trim()) return [];

    const cacheKey = `search_${query}`;
    const cached = this.cache.get<Stock[]>(cacheKey);
    if (cached) {
      console.log('[MultiSource] 返回缓存结果:', cached);
      return cached;
    }

    // 优先尝试本地股票列表（快速、支持全市场搜索）
    const localSource = this.sources.find(s => s.name === '本地股票列表');
    if (localSource && localSource.enabled) {
      console.log('[MultiSource] 使用本地股票列表搜索');
      try {
        const stocks = await this.queue.add(() => localSource.searchStocks(query));
        console.log(`[MultiSource] 本地列表返回 ${stocks.length} 条结果`);
        if (stocks.length > 0) {
          // 获取完整行情数据（实时价格）
          const fullResults: Stock[] = [];
          for (const stock of stocks) {
            try {
              const fullStock = await this.getStock(stock.symbol);
              if (fullStock) {
                fullResults.push(fullStock);
              } else {
                fullResults.push(stock);
              }
            } catch {
              fullResults.push(stock);
            }
          }
          console.log('[MultiSource] 搜索结果:', fullResults);
          this.cache.set(cacheKey, fullResults);
          return fullResults;
        }
      } catch (error) {
        console.warn('[MultiSource] 本地列表搜索失败:', error);
      }
    }

    // 本地列表失败时，尝试其他数据源
    console.log('[MultiSource] 本地列表不可用，尝试其他数据源');
    const results: Stock[] = [];
    const seenSymbols = new Set<string>();

    for (const source of this.sources) {
      if (!source.enabled || source.name === '本地股票列表') continue;

      try {
        const stocks = await this.queue.add(() => source.searchStocks(query));
        for (const stock of stocks) {
          if (!seenSymbols.has(stock.symbol)) {
            seenSymbols.add(stock.symbol);
            results.push(stock);
          }
        }
        if (results.length >= 10) break;
      } catch (error) {
        console.warn(`[MultiSource] ${source.name} 搜索失败:`, error);
      }
    }

    // 获取完整行情
    const fullResults: Stock[] = [];
    for (const stock of results) {
      try {
        const fullStock = await this.getStock(stock.symbol);
        if (fullStock) {
          fullResults.push(fullStock);
        } else {
          fullResults.push(stock);
        }
      } catch {
        fullResults.push(stock);
      }
    }

    this.cache.set(cacheKey, fullResults);
    return fullResults;
  }

  // 获取热门板块
  async getHotSectors(): Promise<Sector[]> {
    const cacheKey = 'hot_sectors';
    const cached = this.cache.get<Sector[]>(cacheKey);
    if (cached) return cached;

    const response = await this.getAvailableSource(
      s => s.getHotSectors ? s.getHotSectors() : Promise.resolve([]),
      result => result.length > 0
    );

    if (response) {
      console.log(`[MultiSource] 板块数据 从 ${response.source.name} 获取`);
      this.cache.set(cacheKey, response.result);
      return response.result;
    }

    return [];
  }

  // 获取新闻
  async getNews(symbols?: string[]): Promise<News[]> {
    const cacheKey = `news_${symbols?.join(',') || 'latest'}`;
    const cached = this.cache.get<News[]>(cacheKey);
    if (cached) return cached;

    const response = await this.getAvailableSource(
      s => s.getNews ? s.getNews(symbols) : Promise.resolve([]),
      result => result.length > 0
    );

    if (response) {
      this.cache.set(cacheKey, response.result);
      return response.result;
    }

    return [];
  }

  // 批量获取股票（用于自选股）
  async getStocksBatch(symbols: string[]): Promise<Stock[]> {
    const results: Stock[] = [];

    for (const symbol of symbols) {
      const stock = await this.getStock(symbol);
      if (stock) results.push(stock);
    }

    return results;
  }

  // 获取数据源状态
  getSourceStatus(): { name: string; healthy: boolean; priority: number }[] {
    return this.sources.map(s => ({
      name: s.name,
      healthy: this.sourceStatus.get(s.name)?.healthy ?? true,
      priority: s.priority,
    }));
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
  }
}

// ==================== 导出 ====================

const multiSourceManager = new MultiSourceManager();

export class RealStockApi {
  async getStock(symbol: string): Promise<Stock | null> {
    return multiSourceManager.getStock(symbol);
  }

  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    return multiSourceManager.getCandles(symbol, timeFrame);
  }

  async searchStocks(query: string): Promise<Stock[]> {
    return multiSourceManager.searchStocks(query);
  }

  async getHotSectors(): Promise<Sector[]> {
    return multiSourceManager.getHotSectors();
  }

  async getNews(symbols?: string[]): Promise<News[]> {
    return multiSourceManager.getNews(symbols);
  }

  async getWatchlistData(symbols: string[]): Promise<Stock[]> {
    return multiSourceManager.getStocksBatch(symbols);
  }

  getDataSourceStatus() {
    return multiSourceManager.getSourceStatus();
  }

  clearCache(): void {
    multiSourceManager.clearCache();
  }
}

// 导出单例
export const realStockApi = new RealStockApi();

// 兼容旧API的导出
export const stockApi = realStockApi;

// 导出数据源类（用于测试和自定义）
export {
  SinaDataSource,
  TencentDataSource,
  EastMoneyDataSource,
  ApifyDataSource,
  MultiSourceManager,
};
