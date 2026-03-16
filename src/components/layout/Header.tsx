import { ReactNode, useState, useRef, useEffect } from 'react';
import type { Stock } from '../../types';

interface HeaderProps {
  children?: ReactNode;
  searchResults?: Stock[];
  onSearch?: (query: string) => void;
  onSelectStock?: (symbol: string) => void;
}

export function Header({ searchResults = [], onSearch, onSelectStock }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
    setShowDropdown(value.length > 0);
  };

  const handleSelectStock = (stock: Stock) => {
    setQuery('');
    setShowDropdown(false);
    onSelectStock?.(stock.symbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      // 回车选择第一个结果
      handleSelectStock(searchResults[0]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-xl">📈</span>
        <span className="font-bold text-lg text-gray-900">PriceAction Pro</span>
      </div>

      {/* 搜索框 */}
      <div className="flex-1 max-w-md mx-4 relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索股票代码或名称..."
            value={query}
            className="w-full h-9 pl-10 pr-4 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length > 0 && setShowDropdown(true)}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 搜索结果下拉列表 */}
        {showDropdown && searchResults.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
          >
            {searchResults.map((stock) => (
              <div
                key={stock.symbol}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                onClick={() => handleSelectStock(stock)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{stock.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{stock.symbol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-900">¥{stock.price.toFixed(2)}</span>
                  <span
                    className={`text-xs ${
                      stock.changePercent >= 0 ? 'text-black' : 'text-gray-500'
                    }`}
                  >
                    {stock.changePercent >= 0 ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 无搜索结果提示 */}
        {showDropdown && query.length > 0 && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-gray-500">
            未找到匹配的股票
          </div>
        )}
      </div>

      {/* 右侧操作 */}
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full"></span>
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer">
          U
        </div>
      </div>
    </header>
  );
}
