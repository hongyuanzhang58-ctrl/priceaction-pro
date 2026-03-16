import { Stock, Candle, TimeFrame, Sector, News } from '../types';

// 模拟股票数据 - A股热门股票
const mockStocks: Stock[] = [
  { symbol: '600519', name: '贵州茅台', price: 1856.00, change: 42.30, changePercent: 2.33, volume: 3250000, turnover: 6030000000 },
  { symbol: '000001', name: '平安银行', price: 12.50, change: -0.10, changePercent: -0.79, volume: 156000000, turnover: 1950000000 },
  { symbol: '300750', name: '宁德时代', price: 215.00, change: 10.68, changePercent: 5.23, volume: 28900000, turnover: 6210000000 },
  { symbol: '601318', name: '中国平安', price: 48.20, change: 0.53, changePercent: 1.11, volume: 89000000, turnover: 4280000000 },
  { symbol: '000858', name: '五粮液', price: 156.80, change: 3.15, changePercent: 2.05, volume: 18500000, turnover: 2900000000 },
  { symbol: '002594', name: '比亚迪', price: 268.50, change: 8.72, changePercent: 3.36, volume: 12500000, turnover: 3360000000 },
  { symbol: '002475', name: '立讯精密', price: 32.15, change: -0.45, changePercent: -1.38, volume: 45000000, turnover: 1447000000 },
  { symbol: '600036', name: '招商银行', price: 35.80, change: 0.42, changePercent: 1.19, volume: 68000000, turnover: 2434000000 },
  { symbol: '000333', name: '美的集团', price: 68.50, change: 1.35, changePercent: 2.01, volume: 32000000, turnover: 2192000000 },
  { symbol: '603259', name: '药明康德', price: 72.30, change: -1.82, changePercent: -2.46, volume: 28500000, turnover: 2061000000 },
  // 即将爆发板块推荐股票
  { symbol: '600760', name: '中航沈飞', price: 45.80, change: 1.25, changePercent: 2.81, volume: 18500000, turnover: 847000000 },
  { symbol: '600893', name: '航发动力', price: 38.60, change: 0.85, changePercent: 2.25, volume: 12500000, turnover: 482000000 },
  { symbol: '002142', name: '宁波银行', price: 24.50, change: 0.32, changePercent: 1.32, volume: 22000000, turnover: 539000000 },
];

// 生成模拟K线数据
function generateCandles(basePrice: number, count: number, volatility: number = 0.02): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = basePrice;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.48) * volatility * currentPrice;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * currentPrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * currentPrice * 0.5;
    const volume = Math.floor(Math.random() * 10000000 + 1000000);

    candles.push({
      time: Math.floor((now - i * dayMs) / 1000),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

// API 服务类
export class StockApi {
  // baseUrl保留用于未来扩展真实API

  // 搜索股票
  async searchStocks(query: string): Promise<Stock[]> {
    // 模拟搜索
    await this.delay(300);
    const lowerQuery = query.toLowerCase();
    return mockStocks.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(lowerQuery) ||
        stock.name.toLowerCase().includes(lowerQuery)
    );
  }

  // 获取股票详情
  async getStock(symbol: string): Promise<Stock | null> {
    await this.delay(200);
    return mockStocks.find((s) => s.symbol === symbol) || null;
  }

  // 获取K线数据
  async getCandles(symbol: string, timeFrame: TimeFrame): Promise<Candle[]> {
    await this.delay(500);
    const stock = mockStocks.find((s) => s.symbol === symbol);
    if (!stock) return [];

    // 根据股票生成不同波动率的K线
    const volatility = symbol === '600519' ? 0.015 : symbol === '300750' ? 0.03 : 0.02;
    const count = timeFrame === '1d' ? 100 : timeFrame === '1w' ? 52 : timeFrame === '1M' ? 24 : 200;

    return generateCandles(stock.price, count, volatility);
  }

  // 获取自选股批量数据
  async getWatchlistData(symbols: string[]): Promise<Stock[]> {
    await this.delay(300);
    return mockStocks.filter((s) => symbols.includes(s.symbol));
  }

  // 获取热门板块
  async getHotSectors(): Promise<Sector[]> {
    await this.delay(400);
    return [
      {
        code: 'AI',
        name: 'AI人工智能',
        heatIndex: 98.5,
        change: 3.25,
        changePercent: 3.25,
        leadingStocks: mockStocks.slice(0, 3),
        pattern: '日线突破前高',
      },
      {
        code: 'NEV',
        name: '新能源汽车',
        heatIndex: 85.2,
        change: 2.18,
        changePercent: 2.18,
        leadingStocks: [mockStocks[2], mockStocks[5]],
        pattern: '周线上升趋势中',
      },
      {
        code: 'SEMI',
        name: '半导体',
        heatIndex: 76.8,
        change: 1.56,
        changePercent: 1.56,
        leadingStocks: mockStocks.slice(3, 5),
        pattern: '60分钟回调支撑位',
      },
      {
        code: 'PHARMA',
        name: '医药生物',
        heatIndex: 65.3,
        change: -0.85,
        changePercent: -0.85,
        leadingStocks: [mockStocks[9]],
        pattern: '日线筑底形态',
      },
      {
        code: 'CONSUMER',
        name: '消费电子',
        heatIndex: 58.1,
        change: 0.42,
        changePercent: 0.42,
        leadingStocks: [mockStocks[6]],
        pattern: '震荡区间上沿',
      },
    ];
  }

  // 获取新闻
  async getNews(_symbols?: string[]): Promise<News[]> {
    await this.delay(300);
    return [
      {
        id: '1',
        title: 'OpenAI发布GPT-5，AI板块迎来新机遇',
        summary: 'OpenAI最新发布的GPT-5在多模态能力上有重大突破，预计将推动AI产业链发展。',
        source: '财经早报',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        relatedStocks: ['300750'],
        relatedSectors: ['AI'],
        sentiment: 'positive',
      },
      {
        id: '2',
        title: '国家支持人工智能发展政策出台',
        summary: '国务院印发《关于促进人工智能高质量发展的指导意见》，明确支持AI芯片、算法等核心技术攻关。',
        source: '新华社',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        relatedStocks: ['002475'],
        relatedSectors: ['AI', 'SEMI'],
        sentiment: 'positive',
      },
      {
        id: '3',
        title: '半导体国产替代加速推进',
        summary: '多家半导体企业发布国产化替代方案，产业链自主可控进程加快。',
        source: '科技日报',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        relatedStocks: [],
        relatedSectors: ['SEMI'],
        sentiment: 'positive',
      },
      {
        id: '4',
        title: '新能源汽车销量创新高',
        summary: '比亚迪、蔚来等新能源车企月度销量创历史新高，行业景气度持续提升。',
        source: '汽车之家',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        relatedStocks: ['002594'],
        relatedSectors: ['NEV'],
        sentiment: 'positive',
      },
    ];
  }

  // 获取所有股票列表
  async getAllStocks(): Promise<Stock[]> {
    await this.delay(200);
    return mockStocks;
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例
export const stockApi = new StockApi();