/**
 * Apify Web Fetcher Utility
 * 底层抓取工具封装
 */

import { ApifyClient } from 'apify-client';

export interface FetchOptions {
  maxPages?: number;
  maxDepth?: number;
  waitForSelector?: string;
  extractLinks?: boolean;
  extractImages?: boolean;
  extractTables?: boolean;
  timeout?: number;
}

export interface FetchResult {
  url: string;
  title: string;
  content: string;
  html?: string;
  links?: { text: string; href: string }[];
  images?: { src: string; alt: string }[];
  tables?: any[][];
  timestamp: string;
}

/**
 * Web Fetcher 类
 * 封装 Apify 抓取功能
 */
export class WebFetcher {
  private client: ApifyClient;

  constructor(token: string) {
    this.client = new ApifyClient({ token });
  }

  /**
   * 抓取单个页面
   */
  async fetchPage(url: string, options: FetchOptions = {}): Promise<FetchResult | null> {
    const {
      maxPages = 1,
      maxDepth = 0,
      waitForSelector,
      extractLinks = false,
      extractImages = false,
      extractTables = false,
    } = options;

    try {
      const input: any = {
        startUrls: [{ url }],
        maxCrawlPages: maxPages,
        maxCrawlDepth: maxDepth,
        htmlTransformer: 'extractus',
      };

      if (waitForSelector) {
        input.waitForSelector = waitForSelector;
      }

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return null;

      const item = items[0] as any;

      const result: FetchResult = {
        url: String(item.url || ''),
        title: String(item.title || ''),
        content: String(item.text || item.markdown || ''),
        html: item.html ? String(item.html) : undefined,
        timestamp: new Date().toISOString(),
      };

      // 提取链接
      if (extractLinks && item.links && Array.isArray(item.links)) {
        result.links = item.links as { text: string; href: string }[];
      }

      // 提取图片
      if (extractImages && item.html) {
        result.images = this.extractImages(String(item.html));
      }

      // 提取表格
      if (extractTables && item.html) {
        result.tables = this.extractTables(String(item.html));
      }

      return result;
    } catch (error) {
      console.error('Fetch failed:', error);
      return null;
    }
  }

  /**
   * 批量抓取多个页面
   */
  async fetchMultiple(urls: string[], options: FetchOptions = {}): Promise<FetchResult[]> {
    const promises = urls.map(url => this.fetchPage(url, options));
    const results = await Promise.all(promises);
    return results.filter((r): r is FetchResult => r !== null);
  }

  /**
   * 抓取动态内容（需要等待JS渲染）
   */
  async fetchDynamic(url: string, waitForSelector: string, timeout: number = 10000): Promise<FetchResult | null> {
    return this.fetchPage(url, {
      waitForSelector,
      timeout,
    });
  }

  /**
   * 抓取API数据（JSON）
   */
  async fetchApi<T = any>(url: string): Promise<T | null> {
    try {
      const input = {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        maxCrawlDepth: 0,
        htmlTransformer: 'none',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) return null;

      const text = String(items[0].text || items[0].html || '');

      // 尝试解析JSON
      try {
        return JSON.parse(text) as T;
      } catch {
        // 如果不是纯JSON，尝试从文本中提取JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as T;
        }
        return null;
      }
    } catch (error) {
      console.error('API fetch failed:', error);
      return null;
    }
  }

  /**
   * 搜索并抓取
   */
  async searchAndFetch(searchUrl: string, resultSelector: string): Promise<FetchResult[]> {
    try {
      const input = {
        startUrls: [{ url: searchUrl }],
        maxCrawlPages: 1,
        maxCrawlDepth: 1,
        linkSelector: resultSelector,
        htmlTransformer: 'extractus',
      };

      const run = await this.client.actor('apify/website-content-crawler').call(input);
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      return items.map((item: any) => ({
        url: item.url,
        title: item.title || '',
        content: item.text || item.markdown || '',
        html: item.html,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Search fetch failed:', error);
      return [];
    }
  }

  // ============ 私有方法 ============

  private extractImages(html?: string): { src: string; alt: string }[] {
    if (!html) return [];

    const images: { src: string; alt: string }[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      images.push({
        src: match[1],
        alt: match[2] || '',
      });
    }

    return images;
  }

  private extractTables(html?: string): any[][] {
    if (!html) return [];

    // 简单的表格提取
    const tables: any[][] = [];
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[0];
      const rows: any[] = [];

      const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      let rowMatch;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const cells: string[] = [];
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowMatch[0])) !== null) {
          cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }

        if (cells.length > 0) {
          rows.push(cells);
        }
      }

      if (rows.length > 0) {
        tables.push(rows);
      }
    }

    return tables;
  }
}

/**
 * 创建默认实例
 */
export function createWebFetcher(token?: string): WebFetcher {
  const apiToken = token || import.meta.env.VITE_APIFY_TOKEN || '';
  return new WebFetcher(apiToken);
}
