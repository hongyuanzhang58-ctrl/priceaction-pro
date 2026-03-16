import { Stock } from '../types';

/**
 * 本地股票列表数据源
 * 从 GitHub Actions 每日抓取的 stocks.json 加载
 */
export class LocalListDataSource {
  name = '本地股票列表';
  priority = 0; // 最高优先级
  enabled = true;
  private stocks: Array<{ symbol: string; name: string }> = [];
  private symbolMap: Record<string, string> = {};
  private loaded = false;

  async loadStockList(): Promise<void> {
    if (this.loaded) return;

    try {
      const response = await fetch('/stocks.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.stocks = data.stocks || [];
      this.symbolMap = data.symbolMap || {};
      this.loaded = true;

      console.log(`[LocalList] 加载了 ${this.stocks.length} 只股票`);
    } catch (error) {
      console.error('[LocalList] 加载股票列表失败:', error);
      this.stocks = [];
      this.symbolMap = {};
    }
  }

  async searchStocks(query: string): Promise<Stock[]> {
    await this.loadStockList();

    if (!query.trim()) return [];

    const trimmedQuery = query.trim().toLowerCase();
    const results: Stock[] = [];

    // 1. 精确匹配代码（6位数字）
    if (/^\d{6}$/.test(trimmedQuery)) {
      const name = this.symbolMap[trimmedQuery];
      if (name) {
        results.push({
          symbol: trimmedQuery,
          name: name,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          turnover: 0
        });
      }
      return results;
    }

    // 2. 模糊匹配名称或代码
    for (const stock of this.stocks) {
      if (
        stock.name.toLowerCase().includes(trimmedQuery) ||
        stock.symbol.includes(trimmedQuery)
      ) {
        results.push({
          symbol: stock.symbol,
          name: stock.name,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          turnover: 0
        });

        if (results.length >= 10) break; // 限制返回数量
      }
    }

    return results;
  }

  async getStock(symbol: string): Promise<Stock | null> {
    await this.loadStockList();

    const name = this.symbolMap[symbol];
    if (!name) return null;

    return {
      symbol,
      name,
      price: 0,
      change: 0,
      changePercent: 0,
      volume: 0,
      turnover: 0
    };
  }

  // 以下方法返回空，价格数据通过其他数据源获取
  async getCandles(): Promise<[]> {
    return [];
  }

  async getHotSectors(): Promise<[]> {
    return [];
  }

  async getNews(): Promise<[]> {
    return [];
  }

  async healthCheck(): Promise<boolean> {
    await this.loadStockList();
    return this.stocks.length > 0;
  }
}

export const localListDataSource = new LocalListDataSource();
