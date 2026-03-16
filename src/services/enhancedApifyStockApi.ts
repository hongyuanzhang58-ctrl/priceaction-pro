/**
 * Enhanced Apify Stock API Service
 * 带缓存、错误处理和降级机制的增强版股票数据服务
 */

import { Stock, Candle, TimeFrame, Sector, News } from '../types';
import { ApifyClient } from 'apify-client';

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN || '';

// 缓存配置
const CACHE_CONFIG = {
  stockTTL: 30 * 1000,      // 股票数据缓存30秒
  candleTTL: 60 * 1000,     // K线数据缓存1分钟
  newsTTL: 5 * 60 * 1000,   // 新闻缓存5分钟
  maxCacheSize: 100,        // 最大缓存条目数
};

// 请求限流配置
const RATE_LIMIT = {
  requestsPerMinute: 10,
  minRequestInterval: 6000, // 最小请求间隔6秒
};

// 缓存条目类型
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// 内存缓存
class DataCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查过期
    const ttl = this.getTTL(key);
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T): void {
    // 限制缓存大小
    if (this.cache.size >= CACHE_CONFIG.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  private getTTL(key: string): number {
    if (key.includes('candle')) return CACHE_CONFIG.candleTTL;
    if (key.includes('news')) return CACHE_CONFIG.newsTTL;
    return CACHE_CONFIG.stockTTL;
  }
}

// 请求队列管理
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
      if (request) {
        await request();
      }
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

/**
 * 增强版Apify股票API服务
 */
export class EnhancedApifyStockApi {
  private client: ApifyClient;
  private cache: DataCache;
  private queue: RequestQueue;
  private fallbackMode = false;

  constructor() {
    this.client = new ApifyClient({ token: APIFY_TOKEN });
    this.cache = new DataCache();
    this.queue = new RequestQueue();
  }

  /**
   * 获取股票实时行情
   * 优先从缓存获取，失败时回退到模拟数据
   */
  async getStock(symbol: string): Promise<Stock | null> {
    const cacheKey = `stock_${symbol}`;
    const cached = this.cache.get<Stock>(cacheKey);
    if (cached) return cached;

    try {
      const stock = await this.queue.add(() => this.fetchStockFromApify(symbol));
      if (stock) {
        this.cache.set(cacheKey, stock);
        return stock;
      }
    } catch (error) {
      console.warn('Apify fetch failed, using fallback data:', error);
    }

    // 回退到模拟数据
    return this.getFallbackStock(symbol);
  }

  /**
   * 获取K线历史数据
   */
  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    const cacheKey = `candles_${symbol}_${timeFrame}`;
    const cached = this.cache.get<Candle[]>(cacheKey);
    if (cached) return cached;

    try {
      const candles = await this.queue.add(() => this.fetchCandlesFromApify(symbol, timeFrame));
      if (candles && candles.length > 0) {
        this.cache.set(cacheKey, candles);
        return candles;
      }
    } catch (error) {
      console.warn('Apify candle fetch failed:', error);
    }

    // 回退到模拟数据
    return this.getFallbackCandles(symbol, timeFrame);
  }

  /**
   * 获取热门板块数据
   */
  async getHotSectors(): Promise<Sector[]> {
    const cacheKey = 'hot_sectors';
    const cached = this.cache.get<Sector[]>(cacheKey);
    if (cached) return cached;

    try {
      const sectors = await this.queue.add(() => this.fetchSectorsFromApify());
      if (sectors && sectors.length > 0) {
        this.cache.set(cacheKey, sectors);
        return sectors;
      }
    } catch (error) {
      console.warn('Apify sectors fetch failed:', error);
    }

    return this.getFallbackSectors();
  }

  /**
   * 搜索股票
   */
  async searchStocks(query: string): Promise<Stock[]> {
    if (!query.trim()) return [];

    try {
      return await this.queue.add(() => this.fetchSearchResults(query));
    } catch (error) {
      console.warn('Apify search failed:', error);
      return [];
    }
  }

  /**
   * 获取新闻资讯
   */
  async getNews(symbols?: string[]): Promise<News[]> {
    const cacheKey = `news_${symbols?.join(',') || 'latest'}`;
    const cached = this.cache.get<News[]>(cacheKey);
    if (cached) return cached;

    try {
      const news = await this.queue.add(() => this.fetchNewsFromApify(symbols));
      if (news && news.length > 0) {
        this.cache.set(cacheKey, news);
        return news;
      }
    } catch (error) {
      console.warn('Apify news fetch failed:', error);
    }

    return this.getFallbackNews(symbols);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 检查是否在降级模式
   */
  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  // ============ 私有方法：Apify 数据获取 ============

  private async fetchStockFromApify(symbol: string): Promise<Stock | null> {
    if (!APIFY_TOKEN) {
      this.fallbackMode = true;
      return null;
    }

    try {
      // 使用东方财富API获取实时数据
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

      if (!items || items.length === 0) {
        return null;
      }

      const data = items[0];
      return this.parseStockData(data, symbol);
    } catch (error) {
      console.error('Apify fetch error:', error);
      this.fallbackMode = true;
      return null;
    }
  }

  private async fetchCandlesFromApify(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    if (!APIFY_TOKEN) return [];

    const periodMap: Record<TimeFrame, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '60m': '60',
      '1d': '101',
      '1w': '102',
      '1M': '103',
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
      console.error('Failed to fetch candles:', error);
      return [];
    }
  }

  private async fetchSectorsFromApify(): Promise<Sector[]> {
    if (!APIFY_TOKEN) return [];

    try {
      // 东方财富板块排行API
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
      console.error('Failed to fetch sectors:', error);
      return [];
    }
  }

  private async fetchSearchResults(query: string): Promise<Stock[]> {
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
      console.error('Failed to search:', error);
      return [];
    }
  }

  private async fetchNewsFromApify(symbols?: string[]): Promise<News[]> {
    if (!APIFY_TOKEN) return [];

    try {
      const url = symbols && symbols.length > 0
        ? `https://searchapi.eastmoney.com/api/suggest/get?input=${symbols[0]}&type=25&count=10`
        : 'https://push2.eastmoney.com/api/qt/stock/get?secid=90.BK0473&fields=f128,f140'; // 财经要闻

      const { defaultDatasetId } = await this.client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
        pageLoadTimeoutSecs: 10,
      });

      const { items } = await this.client.dataset(defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseNewsData(items[0], symbols);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return [];
    }
  }

  // ============ 私有方法：数据解析 ============

  private parseStockData(data: any, symbol: string): Stock | null {
    try {
      const text = data.text || data.body || '';

      // 尝试解析JSON响应
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
        marketCap: (d.f20 || 0) / 100000000,
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
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        turnover: 0,
      }));
    } catch (error) {
      console.error('Failed to parse search data:', error);
      return [];
    }
  }

  private parseNewsData(data: any, symbols?: string[]): News[] {
    try {
      const text = data.text || data.body || '';
      const news: News[] = [];

      // 简单的新闻解析
      const lines = text.split('\n').filter((line: string) => line.trim().length > 10);

      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        news.push({
          id: `news_${Date.now()}_${i}`,
          title: lines[i].substring(0, 50),
          summary: lines[i].substring(0, 150),
          source: '东方财富',
          publishedAt: new Date().toISOString(),
          relatedStocks: symbols || [],
          relatedSectors: [],
          sentiment: 'neutral',
        });
      }

      return news;
    } catch (error) {
      console.error('Failed to parse news data:', error);
      return [];
    }
  }

  // ============ 私有方法：降级模拟数据 ============

  private getFallbackStock(symbol: string): Stock {
    // 使用确定性随机生成模拟数据
    const seed = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const basePrice = 10 + (seed % 90);
    const change = (seed % 200 - 100) / 10;

    return {
      symbol,
      name: `股票${symbol}`,
      price: basePrice,
      change,
      changePercent: (change / basePrice) * 100,
      volume: Math.floor(1000000 + (seed % 9000000)),
      turnover: Math.floor(10000000 + (seed % 90000000)),
    };
  }

  private getFallbackCandles(symbol: string, timeFrame: TimeFrame): Candle[] {
    const seed = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const basePrice = 10 + (seed % 90);
    const candles: Candle[] = [];

    let currentPrice = basePrice;
    const now = new Date();

    for (let i = 100; i >= 0; i--) {
      const date = new Date(now);

      // 根据时间框架调整日期
      switch (timeFrame) {
        case '1m':
          date.setMinutes(date.getMinutes() - i);
          break;
        case '5m':
          date.setMinutes(date.getMinutes() - i * 5);
          break;
        case '15m':
          date.setMinutes(date.getMinutes() - i * 15);
          break;
        case '30m':
          date.setMinutes(date.getMinutes() - i * 30);
          break;
        case '60m':
          date.setHours(date.getHours() - i);
          break;
        case '1d':
          date.setDate(date.getDate() - i);
          break;
        case '1w':
          date.setDate(date.getDate() - i * 7);
          break;
        case '1M':
          date.setMonth(date.getMonth() - i);
          break;
      }

      const change = (Math.random() - 0.5) * 2;
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) + Math.random();
      const low = Math.min(open, close) - Math.random();
      const volume = Math.floor(1000000 + Math.random() * 9000000);

      candles.push({
        time: timeFrame === '1d' || timeFrame === '1w' || timeFrame === '1M'
          ? date.toISOString().split('T')[0]
          : date.getTime() / 1000,
        open,
        high,
        low,
        close,
        volume,
      });

      currentPrice = close;
    }

    return candles;
  }

  private getFallbackSectors(): Sector[] {
    return [
      { code: 'BK0473', name: '证券', heatIndex: 85, change: 2.5, changePercent: 2.5, leadingStocks: [] },
      { code: 'BK0474', name: '银行', heatIndex: 72, change: 1.2, changePercent: 1.2, leadingStocks: [] },
      { code: 'BK0475', name: '保险', heatIndex: 68, change: 0.8, changePercent: 0.8, leadingStocks: [] },
      { code: 'BK0476', name: '房地产', heatIndex: 55, change: -0.5, changePercent: -0.5, leadingStocks: [] },
      { code: 'BK0477', name: '医药制造', heatIndex: 78, change: 1.8, changePercent: 1.8, leadingStocks: [] },
    ];
  }

  private getFallbackNews(symbols?: string[]): News[] {
    const news: News[] = [
      {
        id: `news_${Date.now()}_1`,
        title: '市场动态：A股震荡整理',
        summary: '今日A股市场呈现震荡整理态势，各板块轮动明显...',
        source: '模拟数据',
        publishedAt: new Date().toISOString(),
        relatedStocks: symbols || [],
        relatedSectors: [],
        sentiment: 'neutral',
      },
      {
        id: `news_${Date.now()}_2`,
        title: '行业分析：新能源板块持续走强',
        summary: '新能源板块近期表现强势，多家龙头企业业绩超预期...',
        source: '模拟数据',
        publishedAt: new Date().toISOString(),
        relatedStocks: symbols || [],
        relatedSectors: [],
        sentiment: 'positive',
      },
    ];

    return news;
  }

  // ============ 私有方法：工具方法 ============

  private getSecid(symbol: string): string {
    if (symbol.startsWith('6')) return `1.${symbol}`;
    if (symbol.startsWith('0') || symbol.startsWith('3')) return `0.${symbol}`;
    if (symbol.startsWith('8') || symbol.startsWith('4')) return `0.${symbol}`;
    return `0.${symbol}`;
  }
}

// 导出单例
export const enhancedApifyStockApi = new EnhancedApifyStockApi();

// 兼容旧API的导出
export const apifyStockApi = enhancedApifyStockApi;
