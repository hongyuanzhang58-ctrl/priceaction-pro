import { useState } from 'react';
import { Sector, News } from '../../types';

interface HotSectorsProps {
  sectors: Sector[];
  news: News[];
  onSelectSector: (sector: Sector) => void;
  onSelectStock: (symbol: string) => void;
}

// 即将爆发板块数据
const explodingSectors = [
  {
    name: '军工板块',
    score: 72,
    reasons: ['地缘政治紧张', '国防预算增长', '订单密集释放'],
    stocks: [
      { name: '中航沈飞', symbol: '600760', reason: '战斗机龙头，订单饱满' },
      { name: '航发动力', symbol: '600893', reason: '航空发动机核心资产' },
    ]
  },
  {
    name: '白酒板块',
    score: 68,
    reasons: ['中秋国庆旺季', '库存去化加速', '龙头提价预期'],
    stocks: [
      { name: '贵州茅台', symbol: '600519', reason: '高端白酒绝对龙头' },
      { name: '五粮液', symbol: '000858', reason: '次高端恢复性增长' },
    ]
  },
  {
    name: '银行板块',
    score: 61,
    reasons: ['息差企稳', '资产质量改善', '高股息吸引力'],
    stocks: [
      { name: '招商银行', symbol: '600036', reason: '零售银行标杆' },
      { name: '宁波银行', symbol: '002142', reason: '城商行成长性最佳' },
    ]
  },
];

export function HotSectors({ sectors, news, onSelectSector, onSelectStock }: HotSectorsProps) {
  const [selectedSector, setSelectedSector] = useState<Sector | null>(sectors[0] || null);

  const handleSectorClick = (sector: Sector) => {
    setSelectedSector(sector);
    onSelectSector(sector);
  };

  // 根据选中板块过滤相关新闻
  const relatedNews = selectedSector
    ? news.filter(item =>
        item.relatedSectors.some(s => s.includes(selectedSector.name)) ||
        selectedSector.leadingStocks.some(stock => item.relatedStocks.includes(stock.symbol))
      )
    : news.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 板块热度排行 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">🔥 实时热点板块</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          {/* 板块列表 */}
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-sm text-gray-500">
                  <th className="pb-3 text-left font-medium">排名</th>
                  <th className="pb-3 text-left font-medium">板块</th>
                  <th className="pb-3 text-right font-medium">热度</th>
                  <th className="pb-3 text-right font-medium">涨跌</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sectors.map((sector, index) => (
                  <tr
                    key={sector.code}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedSector?.code === sector.code ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSectorClick(sector)}
                  >
                    <td className="py-3 text-sm">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        index < 3 ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                      } font-medium text-xs`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-gray-900">{sector.name}</span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-red-500 rounded-full"
                            style={{ width: `${sector.heatIndex}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12">{sector.heatIndex}%</span>
                      </div>
                    </td>
                    <td className={`py-3 text-right text-sm font-medium ${
                      sector.changePercent >= 0 ? 'text-black' : 'text-gray-500'
                    }`}>
                      {sector.changePercent >= 0 ? '+' : ''}{sector.changePercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 板块详情 */}
          <div className="p-4 bg-gray-50">
            {selectedSector ? (
              <>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">{selectedSector.name}</h3>
                  <p className="text-sm text-gray-500">
                    板块热度 {selectedSector.heatIndex}% | {selectedSector.changePercent >= 0 ? '领涨' : '调整'}板块
                  </p>
                </div>

                {/* 板块走势图占位 */}
                <div className="h-32 bg-white rounded-lg border border-gray-200 mb-4 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">板块走势图</span>
                </div>

                {/* 龙头股推荐 */}
                <h4 className="text-sm font-medium text-gray-700 mb-3">龙头股推荐</h4>
                <div className="space-y-2">
                  {selectedSector.leadingStocks?.slice(0, 3).map((stock, index) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors"
                      onClick={() => onSelectStock(stock.symbol)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{stock.name}</span>
                        <span className="text-xs text-gray-500">{stock.symbol}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${
                          stock.changePercent >= 0 ? 'text-black' : 'text-gray-500'
                        }`}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2) ?? '0.00'}%
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          index === 0 ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index === 0 ? '买入' : '观望'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                请选择一个板块查看详情
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 即将爆发板块 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">⚡ 即将爆发板块预警</h3>
        <div className="space-y-4">
          {explodingSectors.map((item) => (
            <div key={item.name} className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900 text-lg">{item.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-yellow-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <span className="text-sm text-yellow-700 font-medium">{item.score}%</span>
                </div>
              </div>

              {/* 预测理由 */}
              <div className="mb-3">
                <h4 className="text-xs text-gray-500 mb-1">爆发理由：</h4>
                <div className="flex flex-wrap gap-2">
                  {item.reasons.map((reason, idx) => (
                    <span key={idx} className="text-xs bg-white px-2 py-1 rounded text-gray-700 border border-yellow-200">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {/* 推荐股票 */}
              <div>
                <h4 className="text-xs text-gray-500 mb-2">重点关注：</h4>
                <div className="grid grid-cols-2 gap-2">
                  {item.stocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-2 bg-white rounded border border-yellow-200 cursor-pointer hover:border-yellow-400"
                      onClick={() => onSelectStock(stock.symbol)}
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">{stock.name}</span>
                        <span className="text-xs text-gray-500 ml-1">{stock.symbol}</span>
                      </div>
                      <span className="text-xs text-gray-600 truncate max-w-[100px]" title={stock.reason}>
                        {stock.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 相关新闻 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">📰 相关热点新闻</h2>
          {selectedSector && (
            <span className="text-sm text-gray-500">
              与 {selectedSector.name} 相关
            </span>
          )}
        </div>
        <div className="divide-y divide-gray-100">
          {relatedNews.length > 0 ? (
            relatedNews.map((item) => (
              <NewsItem key={item.id} news={item} />
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">
              暂无相关新闻
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface NewsItemProps {
  news: News;
}

function NewsItem({ news }: NewsItemProps) {
  const timeAgo = getTimeAgo(news.publishedAt);

  const sentimentColors = {
    positive: 'bg-black text-white',
    negative: 'bg-gray-200 text-gray-800',
    neutral: 'bg-gray-100 text-gray-600',
  };

  const sentimentLabels = {
    positive: '📈',
    negative: '📉',
    neutral: '📊',
  };

  const handleClick = () => {
    // 如果有URL则跳转，否则在新闻详情页打开
    if (news.url) {
      window.open(news.url, '_blank');
    } else {
      // 可以在这里添加打开新闻详情的逻辑
      console.log('打开新闻详情:', news.id);
    }
  };

  return (
    <div
      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="text-gray-900 font-medium mb-1 line-clamp-1">{news.title}</h4>
          <p className="text-sm text-gray-500 line-clamp-2">{news.summary}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{news.source}</span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
            {news.relatedSectors.map((sector) => (
              <span key={sector} className="text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">
                {sector}
              </span>
            ))}
          </div>
        </div>
        <span className={`w-6 h-6 flex items-center justify-center rounded ${sentimentColors[news.sentiment]}`}>
          {sentimentLabels[news.sentiment]}
        </span>
      </div>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}天前`;
  if (diffHours > 0) return `${diffHours}小时前`;
  if (diffMins > 0) return `${diffMins}分钟前`;
  return '刚刚';
}
