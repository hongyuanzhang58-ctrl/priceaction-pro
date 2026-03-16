import { WatchlistItem } from '../../types';
import { formatPrice, formatChange } from '../../utils/priceAction';

interface WatchlistProps {
  items: WatchlistItem[];
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export function Watchlist({ items, onSelect, onRemove }: WatchlistProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">⭐</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无自选股</h3>
        <p className="text-gray-500 text-sm">搜索股票并添加到自选股列表</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">⭐ 我的自选股</h2>
        <span className="text-sm text-gray-500">{items.length} 只股票</span>
      </div>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="text-sm text-gray-500">
            <th className="px-4 py-3 text-left font-medium">股票代码</th>
            <th className="px-4 py-3 text-left font-medium">名称</th>
            <th className="px-4 py-3 text-right font-medium">现价</th>
            <th className="px-4 py-3 text-right font-medium">涨跌</th>
            <th className="px-4 py-3 text-center font-medium">信号强度</th>
            <th className="px-4 py-3 text-center font-medium">操作建议</th>
            <th className="px-4 py-3 text-center font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <WatchlistRow
              key={item.symbol}
              item={item}
              onSelect={() => onSelect(item.symbol)}
              onRemove={() => onRemove(item.symbol)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface WatchlistRowProps {
  item: WatchlistItem;
  onSelect: () => void;
  onRemove: () => void;
}

function WatchlistRow({ item, onSelect, onRemove }: WatchlistRowProps) {
  const isUp = item.changePercent >= 0;

  const recommendationColors = {
    buy: 'bg-black text-white',
    sell: 'bg-gray-200 text-gray-800',
    hold: 'bg-gray-100 text-gray-700',
  };

  const recommendationLabels = {
    buy: '买入',
    sell: '卖出',
    hold: '观望',
  };

  return (
    <tr className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={onSelect}>
      <td className="px-4 py-3">
        <span className="font-mono font-medium text-gray-900">{item.symbol}</span>
      </td>
      <td className="px-4 py-3 text-gray-700">{item.name}</td>
      <td className="px-4 py-3 text-right font-medium text-gray-900">{formatPrice(item.price)}</td>
      <td className={`px-4 py-3 text-right font-medium ${isUp ? 'text-black' : 'text-gray-500'}`}>
        {formatChange(item.changePercent)}
      </td>
      <td className="px-4 py-3 text-center">
        <SignalStrength strength={item.signalStrength} />
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${recommendationColors[item.recommendation]}`}>
          {recommendationLabels[item.recommendation]}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function SignalStrength({ strength }: { strength: number }) {
  return (
    <div className="flex justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <span
          key={level}
          className={`w-2 h-2 rounded-full ${
            level <= strength ? 'bg-yellow-400' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}