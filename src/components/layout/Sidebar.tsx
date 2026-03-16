// Nav item type definition

type NavItem = {
  icon: string;
  label: string;
  id: string;
};

const navItems: NavItem[] = [
  { icon: '📊', label: '分析面板', id: 'analysis' },
  { icon: '⭐', label: '自选股', id: 'watchlist' },
  { icon: '🔥', label: '热点板块', id: 'hotspots' },
  { icon: '📋', label: '交易计划', id: 'plans' },
  { icon: '📈', label: '历史复盘', id: 'history' },
  { icon: '⚙️', label: '设置', id: 'settings' },
];

const devNavItems: NavItem[] = [
  { icon: '🧪', label: 'API测试', id: 'apify-test' },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  watchlistCount?: number;
}

export function Sidebar({ activeTab, onTabChange, watchlistCount = 0 }: SidebarProps) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      {/* 导航菜单 */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.id === 'watchlist' && watchlistCount > 0 && (
                  <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {watchlistCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* 开发工具 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="px-3 mb-2 text-xs text-gray-400 uppercase">开发工具</div>
          <ul className="space-y-1 px-2">
            {devNavItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 自选股快捷列表 */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">自选股</h3>
        <QuickWatchlist />
      </div>
    </aside>
  );
}

function QuickWatchlist() {
  // 模拟数据
  const stocks = [
    { symbol: '600519', name: '贵州茅台', price: 1856, change: 2.33 },
    { symbol: '000001', name: '平安银行', price: 12.50, change: -0.79 },
    { symbol: '300750', name: '宁德时代', price: 215, change: 5.23 },
  ];

  return (
    <ul className="space-y-2">
      {stocks.map((stock) => (
        <li
          key={stock.symbol}
          className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors"
        >
          <div>
            <span className="text-gray-900 font-medium">{stock.symbol}</span>
            <span className="text-gray-500 ml-1 text-xs">{stock.name}</span>
          </div>
          <span className={stock.change >= 0 ? 'text-black' : 'text-gray-500'}>
            {stock.change >= 0 ? '+' : ''}{stock.change}%
          </span>
        </li>
      ))}
      <li>
        <button className="w-full text-sm text-primary-600 hover:text-primary-700 py-1.5 border border-dashed border-gray-300 rounded-lg hover:border-primary-300 transition-colors">
          + 添加股票
        </button>
      </li>
    </ul>
  );
}