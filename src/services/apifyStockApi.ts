/**
 * Apify Stock API Service
 * 使用 Apify 抓取东方财富/新浪财经的真实股票数据
 *
 * 使用方法:
 * 1. 在 .env 文件中设置 APIFY_TOKEN
 * 2. 替换 stockApi.ts 中的模拟数据调用
 */

import { Stock, Candle, TimeFrame, Sector, News } from '../types';
import { ApifyClient } from 'apify-client';

// Apify Token - 从环境变量获取
const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN || '';

/**
 * Apify 股票数据服务
 * 抓取东方财富、新浪财经等真实数据源
 */
export class ApifyStockApi {
  private client: ApifyClient;

  constructor() {
    this.client = new ApifyClient({ token: APIFY_TOKEN });
  }

  /**
   * 获取股票实时行情
   * 抓取东方财富股票详情页
   */
  async getStock(symbol: string): Promise<Stock | null> {
    try {
      // 使用 website-content-crawler 抓取东方财富
      const input = {
        startUrls: [{ url: `https://quote.eastmoney.com/${symbol}.html` }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return null;

      const pageData = items[0];

      // 从抓取的内容中解析股票数据
      // 注意：实际使用时需要根据页面结构调整解析逻辑
      return this.parseStockFromContent(symbol, pageData);
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
      return null;
    }
  }

  /**
   * 获取K线历史数据
   * 通过东方财富 API 获取
   */
  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    try {
      // 时间框架映射
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

      // 构建东方财富K线数据URL
      const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${this.getSecid(symbol)}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${periodMap[timeFrame]}&fqt=0&end=20500101&lmt=120`;

      // 使用自定义脚本抓取
      const { defaultDatasetId } = await this.client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'none',
      });

      const { items } = await this.client.dataset(defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      // 解析K线数据
      return this.parseKlineData(items[0]);
    } catch (error) {
      console.error('Failed to fetch candles:', error);
      return [];
    }
  }

  /**
   * 获取热门板块数据
   * 抓取东方财富板块排行
   */
  async getHotSectors(): Promise<Sector[]> {
    try {
      const url = 'https://quote.eastmoney.com/center/gridlist.html#hs_a_board';

      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseSectorsFromContent(items[0]);
    } catch (error) {
      console.error('Failed to fetch hot sectors:', error);
      return [];
    }
  }

  /**
   * 搜索股票
   * 抓取东方财富搜索结果
   */
  async searchStocks(query: string): Promise<Stock[]> {
    try {
      const url = `https://search.eastmoney.com/web?qw=${encodeURIComponent(query)}`;

      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseSearchResults(items[0]);
    } catch (error) {
      console.error('Failed to search stocks:', error);
      return [];
    }
  }

  /**
   * 获取新闻资讯
   * 抓取东方财富股吧/新闻
   */
  async getNews(symbols?: string[]): Promise<News[]> {
    try {
      const url = symbols && symbols.length > 0
        ? `https://so.eastmoney.com/web/s?keyword=${symbols[0]}`
        : 'https://finance.eastmoney.com/a/cywjh.html';

      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseNewsFromContent(items[0], symbols);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return [];
    }
  }

  /**
   * 批量获取股票数据
   */
  async getWatchlistData(symbols: string[]): Promise<Stock[]> {
    const promises = symbols.map(symbol => this.getStock(symbol));
    const results = await Promise.all(promises);
    return results.filter((stock): stock is Stock => stock !== null);
  }

  // ============ 私有辅助方法 ============

  /**
   * 获取证券ID (东方财富格式)
   */
  private getSecid(symbol: string): string {
    // 上海证券交易所
    if (symbol.startsWith('6')) return `1.${symbol}`;
    // 深圳证券交易所
    if (symbol.startsWith('0') || symbol.startsWith('3')) return `0.${symbol}`;
    // 北京证券交易所
    if (symbol.startsWith('8') || symbol.startsWith('4')) return `0.${symbol}`;
    return `0.${symbol}`;
  }

  /**
   * 解析股票数据
   */
  private parseStockFromContent(symbol: string, data: any): Stock {
    // 这里需要根据实际抓取的内容结构调整
    // 示例实现，实际需要根据页面DOM结构编写解析逻辑
    const text = data.text || '';

    return {
      symbol,
      name: this.extractName(text) || symbol,
      price: this.extractPrice(text) || 0,
      change: this.extractChange(text) || 0,
      changePercent: this.extractChangePercent(text) || 0,
      volume: this.extractVolume(text) || 0,
      turnover: 0,
    };
  }

  /**
   * 解析K线数据
   */
  private parseKlineData(data: any): Candle[] {
    try {
      // 东方财富K线数据格式：日期,开盘,收盘,最低,最高,成交量
      const text = data.text || '';
      const jsonMatch = text.match(/"data":\{[^}]+"klines":\[([^\]]+)\]/);

      if (!jsonMatch) return [];

      const klines = JSON.parse(`[${jsonMatch[1]}]`);

      return klines.map((line: string) => {
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
    } catch {
      return [];
    }
  }

  /**
   * 解析板块数据
   */
  private parseSectorsFromContent(_data: any): Sector[] {
    // 示例实现，实际需要根据页面结构调整
    return [];
  }

  /**
   * 解析搜索结果
   */
  private parseSearchResults(_data: any): Stock[] {
    // 示例实现，实际需要根据页面结构调整
    return [];
  }

  /**
   * 解析新闻数据
   */
  private parseNewsFromContent(_data: any, _symbols?: string[]): News[] {
    // 示例实现，实际需要根据页面结构调整
    return [];
  }

  // ============ 文本提取辅助方法 ============

  private extractName(text: string): string | null {
    const match = text.match(/股票名称[：:]\s*([^\s]+)/);
    return match ? match[1] : null;
  }

  private extractPrice(text: string): number | null {
    const match = text.match(/最新价[：:]\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  }

  private extractChange(text: string): number | null {
    const match = text.match(/涨跌额[：:]\s*([\d.-]+)/);
    return match ? parseFloat(match[1]) : null;
  }

  private extractChangePercent(text: string): number | null {
    const match = text.match(/涨跌幅[：:]\s*([\d.-]+)%/);
    return match ? parseFloat(match[1]) : null;
  }

  private extractVolume(text: string): number | null {
    const match = text.match(/成交量[：:]\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : null;
  }
}

// 导出单例
export const apifyStockApi = new ApifyStockApi();
