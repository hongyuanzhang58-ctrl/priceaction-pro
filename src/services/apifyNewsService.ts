/**
 * Apify News Service
 * 使用 Apify 抓取股票相关新闻
 */

import { News } from '../types';
import { ApifyClient } from 'apify-client';

const APIFY_TOKEN = import.meta.env.VITE_APIFY_TOKEN || '';

/**
 * 新闻来源配置
 */
const NEWS_SOURCES = {
  // 东方财富
  eastmoney: {
    name: '东方财富',
    baseUrl: 'https://finance.eastmoney.com',
    listUrl: 'https://finance.eastmoney.com/a/cywjh.html',
  },
  // 新浪财经
  sina: {
    name: '新浪财经',
    baseUrl: 'https://finance.sina.com.cn',
    listUrl: 'https://finance.sina.com.cn/stock/',
  },
  // 雪球
  xueqiu: {
    name: '雪球',
    baseUrl: 'https://xueqiu.com',
    listUrl: 'https://xueqiu.com/hq',
  },
};

export class ApifyNewsService {
  private client: ApifyClient;

  constructor() {
    this.client = new ApifyClient({ token: APIFY_TOKEN });
  }

  /**
   * 获取股票相关新闻
   * @param symbol 股票代码
   * @param limit 新闻数量限制
   */
  async getNewsByStock(symbol: string, limit: number = 10): Promise<News[]> {
    const url = `https://so.eastmoney.com/web/s?keyword=${symbol}`;
    return this.fetchNewsFromUrl(url, [symbol], limit);
  }

  /**
   * 获取板块相关新闻
   * @param sectorCode 板块代码
   * @param limit 新闻数量限制
   */
  async getNewsBySector(sectorCode: string, limit: number = 10): Promise<News[]> {
    const url = `https://quote.eastmoney.com/center/gridlist.html#${sectorCode}_a_board`;
    return this.fetchNewsFromUrl(url, [], limit, sectorCode);
  }

  /**
   * 获取最新财经新闻
   * @param limit 新闻数量限制
   */
  async getLatestNews(limit: number = 20): Promise<News[]> {
    const url = NEWS_SOURCES.eastmoney.listUrl;
    return this.fetchNewsFromUrl(url, [], limit);
  }

  /**
   * 获取热门新闻
   */
  async getHotNews(_limit: number = 10): Promise<News[]> {
    // 抓取雪球热门讨论
    const url = 'https://xueqiu.com/hq';

    try {
      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 2,
        maxCrawlDepth: 1,
        htmlTransformer: 'extractus',
        linkSelector: 'a[href*="/"]',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseXueqiuHotNews(items);
    } catch (error) {
      console.error('Failed to fetch hot news:', error);
      return [];
    }
  }

  /**
   * 搜索新闻
   * @param keyword 搜索关键词
   * @param limit 结果数量限制
   */
  async searchNews(keyword: string, limit: number = 10): Promise<News[]> {
    const url = `https://so.eastmoney.com/web/s?keyword=${encodeURIComponent(keyword)}`;
    return this.fetchNewsFromUrl(url, [], limit);
  }

  /**
   * 获取个股公告
   * @param symbol 股票代码
   */
  async getAnnouncements(symbol: string): Promise<News[]> {
    const url = `http://data.eastmoney.com/notices/stock/${symbol}.html`;

    try {
      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseAnnouncements(items[0], symbol);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      return [];
    }
  }

  /**
   * 获取研报
   * @param symbol 股票代码
   */
  async getResearchReports(symbol: string): Promise<News[]> {
    const url = `http://data.eastmoney.com/report/stock.jshtml?code=${symbol}`;

    try {
      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseResearchReports(items[0], symbol);
    } catch (error) {
      console.error('Failed to fetch research reports:', error);
      return [];
    }
  }

  // ============ 私有方法 ============

  private async fetchNewsFromUrl(
    url: string,
    relatedStocks: string[] = [],
    limit: number = 10,
    sectorCode?: string
  ): Promise<News[]> {
    try {
      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return [];

      return this.parseEastmoneyNews(items[0], relatedStocks, limit, sectorCode);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return [];
    }
  }

  /**
   * 解析东方财富新闻
   */
  private parseEastmoneyNews(data: any, relatedStocks: string[], limit: number, sectorCode?: string): News[] {
    const text = data.text || '';
    const news: News[] = [];

    // 简单的新闻解析逻辑
    // 实际使用时需要根据页面结构调整
    const lines = text.split('\n').filter((line: string) => line.trim());

    for (let i = 0; i < Math.min(lines.length, limit); i++) {
      const line = lines[i];

      // 提取标题（假设标题包含"："或者超过10个字符）
      if (line.length > 10 && (line.includes('：') || line.includes('?'))) {
        news.push({
          id: `news_${Date.now()}_${i}`,
          title: line.substring(0, 50),
          summary: line.substring(0, 100),
          source: NEWS_SOURCES.eastmoney.name,
          publishedAt: new Date().toISOString(),
          relatedStocks,
          relatedSectors: sectorCode ? [sectorCode] : [],
          sentiment: this.analyzeSentiment(line),
        });
      }
    }

    return news;
  }

  /**
   * 解析雪球热门讨论
   */
  private parseXueqiuHotNews(items: any[]): News[] {
    const news: News[] = [];

    for (const item of items.slice(0, 10)) {
      const text = item.text || '';
      const titleMatch = text.match(/【(.+?)】/);

      if (titleMatch) {
        news.push({
          id: `xueqiu_${Date.now()}_${news.length}`,
          title: titleMatch[1],
          summary: text.substring(0, 200),
          source: NEWS_SOURCES.xueqiu.name,
          publishedAt: new Date().toISOString(),
          relatedStocks: this.extractStockSymbols(text),
          relatedSectors: [],
          sentiment: this.analyzeSentiment(text),
        });
      }
    }

    return news;
  }

  /**
   * 解析公告
   */
  private parseAnnouncements(data: any, symbol: string): News[] {
    const text = data.text || '';
    const news: News[] = [];

    // 解析公告列表
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('公告') || line.includes('通知')) {
        news.push({
          id: `announcement_${Date.now()}_${news.length}`,
          title: line.substring(0, 60),
          summary: line,
          source: '公司公告',
          publishedAt: new Date().toISOString(),
          relatedStocks: [symbol],
          relatedSectors: [],
          sentiment: 'neutral',
        });
      }
    }

    return news;
  }

  /**
   * 解析研报
   */
  private parseResearchReports(data: any, symbol: string): News[] {
    const text = data.text || '';
    const news: News[] = [];

    // 解析研报列表
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('研报') || line.includes('评级')) {
        news.push({
          id: `report_${Date.now()}_${news.length}`,
          title: line.substring(0, 60),
          summary: line,
          source: '机构研报',
          publishedAt: new Date().toISOString(),
          relatedStocks: [symbol],
          relatedSectors: [],
          sentiment: this.analyzeSentiment(line),
        });
      }
    }

    return news;
  }

  /**
   * 从文本中提取股票代码
   */
  private extractStockSymbols(text: string): string[] {
    const matches = text.match(/\d{6}/g);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * 简单的情感分析
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['涨', '利好', '突破', '增长', '盈利', '买入', '推荐'];
    const negativeWords = ['跌', '利空', '下跌', '亏损', '卖出', '减持', '风险'];

    let positive = 0;
    let negative = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) positive++;
    }

    for (const word of negativeWords) {
      if (text.includes(word)) negative++;
    }

    if (positive > negative) return 'positive';
    if (negative > positive) return 'negative';
    return 'neutral';
  }
}

// 导出单例
export const apifyNewsService = new ApifyNewsService();
