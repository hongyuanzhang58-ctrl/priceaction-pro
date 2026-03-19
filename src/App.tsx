import { useState, useEffect } from 'react';
import { MainLayout } from './components/layout';
import { CandlestickChart, TimeFrameSelector } from './components/charts';
import { TrendAnalysis } from './components/analysis';
import { Watchlist } from './components/watchlist';
import { HotSectors } from './components/hotspots';
import { ApifyTestPanel } from './components/apify';
import { useStockData, usePriceAction, useWatchlist, useSearch } from './hooks/useStockData';
import { useStockStore } from './store/stockStore';
import { realStockApi } from './services/realStockApi';
import { Sector, News, Stock, TimeFrame, PatternResult } from './types';

function App() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [highlightedPattern, setHighlightedPattern] = useState<PatternResult | null>(null);
  const { timeFrame, setTimeFrame, setCurrentStock, setCandles } = useStockStore();
  const { watchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { searchResults, searchLoading, search } = useSearch();

  // 当前选中的股票
  const selectedSymbol = useStockStore((state) => state.currentStock?.symbol) || '600519';
  const { stock, candles, isLoading } = useStockData(selectedSymbol);
  const analysis = usePriceAction();

  // 加载热点数据
  useEffect(() => {
    const loadHotData = async () => {
      const [sectorsData, newsData] = await Promise.all([
        realStockApi.getHotSectors(),
        realStockApi.getNews(),
      ]);
      setSectors(sectorsData);
      setNews(newsData);
    };
    loadHotData();
  }, []);

  // 处理股票选择
  const handleSelectStock = async (symbol: string) => {
    const stockData = await realStockApi.getStock(symbol);
    if (stockData) {
      setCurrentStock(stockData);
      const candleData = await realStockApi.getCandles(symbol, timeFrame);
      setCandles(candleData);
      setHighlightedPattern(null); // 清除高亮
      setActiveTab('analysis');
    }
  };

  // 处理时间框架变化
  const handleTimeFrameChange = async (tf: TimeFrame) => {
    setTimeFrame(tf);
    setHighlightedPattern(null); // 清除高亮
    if (selectedSymbol) {
      const candleData = await realStockApi.getCandles(selectedSymbol, tf);
      setCandles(candleData);
    }
  };

  // 处理板块选择
  const handleSelectSector = (sector: Sector) => {
    console.log('Selected sector:', sector);
  };

  // 处理形态点击高亮
  const handlePatternClick = (pattern: PatternResult) => {
    setHighlightedPattern(pattern);
  };

  // 清除形态高亮
  const handlePatternHighlightClear = () => {
    setHighlightedPattern(null);
  };

  // 渲染不同页面内容
  const renderContent = () => {
    switch (activeTab) {
      case 'analysis':
        return (
          <AnalysisPage
            stock={stock}
            candles={candles}
            isLoading={isLoading}
            timeFrame={timeFrame}
            onTimeFrameChange={handleTimeFrameChange}
            analysis={analysis}
            onAddToWatchlist={() => stock && addToWatchlist(stock)}
            highlightedPattern={highlightedPattern}
            onPatternClick={handlePatternClick}
            onPatternHighlightClear={handlePatternHighlightClear}
          />
        );
      case 'watchlist':
        return (
          <Watchlist
            items={watchlist}
            onSelect={handleSelectStock}
            onRemove={removeFromWatchlist}
          />
        );
      case 'hotspots':
        return (
          <HotSectors
            sectors={sectors}
            news={news}
            onSelectSector={handleSelectSector}
            onSelectStock={handleSelectStock}
          />
        );
      case 'plans':
        return <ComingSoon title="交易计划" description="创建和管理您的交易计划" />;
      case 'history':
        return <ComingSoon title="历史复盘" description="回顾历史交易，优化策略" />;
      case 'settings':
        return <ComingSoon title="设置" description="个性化您的应用配置" />;
      case 'apify-test':
        return <ApifyTestPanel />;
      default:
        return null;
    }
  };

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      watchlistCount={watchlist.length}
      searchResults={searchResults}
      searchLoading={searchLoading}
      onSearch={search}
      onSelectStock={handleSelectStock}
    >
      {renderContent()}
    </MainLayout>
  );
}

// 分析面板页面
interface AnalysisPageProps {
  stock: Stock | null;
  candles: any[];
  isLoading: boolean;
  timeFrame: TimeFrame;
  onTimeFrameChange: (tf: TimeFrame) => void;
  analysis: any;
  onAddToWatchlist: () => void;
  highlightedPattern: PatternResult | null;
  onPatternClick: (pattern: PatternResult) => void;
  onPatternHighlightClear: () => void;
}

function AnalysisPage({
  stock,
  candles,
  isLoading,
  timeFrame,
  onTimeFrameChange,
  analysis,
  onAddToWatchlist,
  highlightedPattern,
  onPatternClick,
  onPatternHighlightClear,
}: AnalysisPageProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 左侧：图表区域 */}
      <div className="lg:col-span-2 space-y-4">
        {/* 股票信息头部 */}
        {stock && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{stock.name}</h1>
                  <span className="text-gray-500 font-mono">{stock.symbol}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-2xl font-bold text-gray-900">¥{stock.price.toFixed(2)}</span>
                  <span className={`text-lg font-medium ${
                    stock.changePercent >= 0 ? 'text-black' : 'text-gray-500'
                  }`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {analysis?.recommendation?.entryPrice && analysis.recommendation.action === 'buy' && (
                  <div className="text-sm">
                    <span className="text-gray-500">建议买入: </span>
                    <span className="font-medium text-black">
                      ¥{analysis.recommendation.entryPrice.min.toFixed(2)} - ¥{analysis.recommendation.entryPrice.max.toFixed(2)}
                    </span>
                  </div>
                )}
                <button
                  onClick={onAddToWatchlist}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                >
                  + 加入自选
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 时间框架选择器 */}
        <div className="flex items-center justify-between">
          <TimeFrameSelector
            activeTimeFrame={timeFrame}
            onTimeFrameChange={onTimeFrameChange}
          />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>成交量: {stock?.volume ? formatVolume(stock.volume) : '-'}</span>
            <span>|</span>
            <span>成交额: {stock?.turnover ? formatTurnover(stock.turnover) : '-'}</span>
          </div>
        </div>

        {/* K线图表 - 支持绘制和形态高亮 */}
        {candles.length > 0 && (
          <CandlestickChart
            data={candles}
            height={450}
            highlightedPattern={highlightedPattern}
            onPatternHighlightClear={onPatternHighlightClear}
          />
        )}

        {/* 多时间框架联动 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-sm text-gray-500 mb-2">周线走势</div>
            <div className="h-24 bg-gray-50 rounded flex items-center justify-center text-gray-400 text-xs">
              周线缩略图
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-sm text-gray-500 mb-2">日线走势</div>
            <div className="h-24 bg-gray-50 rounded flex items-center justify-center text-gray-400 text-xs">
              日线缩略图
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-sm text-gray-500 mb-2">60分钟走势</div>
            <div className="h-24 bg-gray-50 rounded flex items-center justify-center text-gray-400 text-xs">
              60分钟缩略图
            </div>
          </div>
        </div>
      </div>

      {/* 右侧：分析面板 */}
      <div className="lg:col-span-1">
        <TrendAnalysis
          analysis={analysis}
          onPatternClick={onPatternClick}
          highlightedPattern={highlightedPattern}
        />
      </div>
    </div>
  );
}

// 即将推出页面
function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-500">{description}</p>
        <p className="text-sm text-gray-400 mt-4">功能开发中，敬请期待...</p>
      </div>
    </div>
  );
}

// 格式化成交量
function formatVolume(volume: number): string {
  if (volume >= 100000000) {
    return `${(volume / 100000000).toFixed(2)}亿`;
  } else if (volume >= 10000) {
    return `${(volume / 10000).toFixed(2)}万`;
  }
  return volume.toString();
}

// 格式化成交额
function formatTurnover(turnover: number): string {
  if (turnover >= 100000000) {
    return `${(turnover / 100000000).toFixed(2)}亿`;
  } else if (turnover >= 10000) {
    return `${(turnover / 10000).toFixed(2)}万`;
  }
  return turnover.toString();
}

export default App;
