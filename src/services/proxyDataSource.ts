import { Stock, Candle, TimeFrame, Sector, News } from '../types';

// 代理服务器地址（生产环境）
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

console.log('[ProxyDataSource] 初始化, PROXY_URL:', PROXY_URL);

/**
 * 代理服务器数据源
 * 通过自建代理解决CORS问题
 */
export class ProxyDataSource {
  name = '代理服务器';
  priority = 0;  // 最高优先级
  enabled = true; // 始终启用，实际请求时处理错误

  async searchStocks(query: string): Promise<Stock[]> {
    console.log('[Proxy] 开始搜索:', query, 'PROXY_URL:', PROXY_URL);

    if (!this.enabled) {
      console.log('[Proxy] 数据源未启用');
      return [];
    }

    try {
      const url = `${PROXY_URL}/api/search?query=${encodeURIComponent(query)}`;
      console.log('[Proxy] 请求URL:', url);

      const response = await fetch(url);
      console.log('[Proxy] 响应状态:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[Proxy] 搜索返回数据:', data);

      // 如果返回结果，获取完整行情数据
      if (Array.isArray(data) && data.length > 0) {
        const fullResults: Stock[] = [];
        for (const stock of data.slice(0, 5)) { // 限制前5个
          try {
            const fullStock = await this.getStock(stock.symbol);
            if (fullStock) {
              fullResults.push(fullStock);
            } else {
              // 使用搜索结果的基本信息
              fullResults.push({
                symbol: stock.symbol,
                name: stock.name,
                price: 0,
                change: 0,
                changePercent: 0,
                volume: 0,
                turnover: 0
              });
            }
          } catch {
            fullResults.push({
              symbol: stock.symbol,
              name: stock.name,
              price: 0,
              change: 0,
              changePercent: 0,
              volume: 0,
              turnover: 0
            });
          }
        }
        console.log('[Proxy] 搜索结果:', fullResults);
        return fullResults;
      }

      return data;
    } catch (error) {
      console.error('[Proxy] 搜索失败:', error);
      return [];
    }
  }

  async getStock(symbol: string): Promise<Stock | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${PROXY_URL}/api/stock/${symbol}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return await response.json();
    } catch (error) {
      console.warn('[Proxy] 获取行情失败:', error);
      return null;
    }
  }

  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${PROXY_URL}/api/candles/${symbol}?timeFrame=${timeFrame}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return await response.json();
    } catch (error) {
      console.warn('[Proxy] 获取K线失败:', error);
      return [];
    }
  }

  async getHotSectors(): Promise<Sector[]> {
    if (!this.enabled) return [];

    try {
      const response = await fetch(`${PROXY_URL}/api/sectors`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return await response.json();
    } catch (error) {
      console.warn('[Proxy] 获取板块失败:', error);
      return [];
    }
  }

  async getNews(): Promise<News[]> {
    return [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${PROXY_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const proxyDataSource = new ProxyDataSource();
