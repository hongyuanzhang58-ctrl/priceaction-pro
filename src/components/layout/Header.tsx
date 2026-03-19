import { ReactNode, useState, useRef, useEffect, useMemo } from 'react';
import type { Stock } from '../../types';

interface HeaderProps {
  children?: ReactNode;
  searchResults?: Stock[];
  searchLoading?: boolean;
  onSearch?: (query: string) => void;
  onSelectStock?: (symbol: string) => void;
}

export function Header({ searchResults = [], searchLoading = false, onSearch, onSelectStock }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 只显示与当前搜索查询匹配的结果
  const filteredResults = useMemo(() => {
    if (!lastSearchedQuery) return [];
    // 如果搜索的是6位代码，只显示完全匹配的结果
    if (/^\d{6}$/.test(lastSearchedQuery)) {
      return searchResults.filter(s => s.symbol === lastSearchedQuery);
    }
    return searchResults;
  }, [searchResults, lastSearchedQuery]);

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

    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (value.length > 0) {
      setShowDropdown(true);
      // 防抖：200ms后才触发搜索
      const timer = setTimeout(() => {
        setLastSearchedQuery(value);
        onSearch?.(value);
      }, 200);
      setDebounceTimer(timer);
    } else {
      setShowDropdown(false);
      setLastSearchedQuery('');
    }
  };

  const handleSelectStock = (stock: Stock) => {
    setQuery('');
    setLastSearchedQuery('');
    setShowDropdown(false);
    onSelectStock?.(stock.symbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredResults.length > 0) {
      // 回车选择第一个结果
      handleSelectStock(filteredResults[0]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // 判断是否应该显示"未找到"（搜索完成且没有结果）
  const showNoResults = showDropdown && query.length > 0 && !searchLoading && filteredResults.length === 0 && lastSearchedQuery === query;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '1.25rem' }}>📈</span>
        <span className="font-bold text-lg text-gray-900">PriceAction Pro</span>
      </div>

      {/* 搜索框 */}
      <div className="flex-1 max-w-md mx-4 relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="输入6位股票代码（如 002460）或名称..."
            value={query}
            style={{
              width: '100%',
              height: '2.25rem',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              outline: 'none',
            }}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length > 0 && setShowDropdown(true)}
          />
          <svg
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1rem',
              height: '1rem',
              color: '#9ca3af',
            }}
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
        {showDropdown && filteredResults.length > 0 && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.25rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              maxHeight: '16rem',
              overflowY: 'auto',
            }}
          >
            {filteredResults.map((stock) => (
              <div
                key={stock.symbol}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 1rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f9fafb',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => handleSelectStock(stock)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>{stock.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{stock.symbol}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#111827' }}>¥{stock.price.toFixed(2)}</span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: stock.changePercent >= 0 ? '#000' : '#6b7280',
                    }}
                  >
                    {stock.changePercent >= 0 ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 加载中提示 */}
        {showDropdown && searchLoading && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.25rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              padding: '1rem',
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            搜索中...
          </div>
        )}

        {/* 无搜索结果提示（只在搜索完成后显示） */}
        {showNoResults && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '0.25rem',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              padding: '1rem',
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            未找到匹配的股票
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              请输入正确的6位股票代码
            </div>
          </div>
        )}
      </div>

      {/* 右侧操作 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          style={{
            position: 'relative',
            padding: '0.5rem',
            color: '#6b7280',
            borderRadius: '0.5rem',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: '0.25rem',
              right: '0.25rem',
              width: '0.5rem',
              height: '0.5rem',
              backgroundColor: '#000',
              borderRadius: '9999px',
            }}
          ></span>
        </button>
        <button
          style={{
            padding: '0.5rem',
            color: '#6b7280',
            borderRadius: '0.5rem',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div
          style={{
            width: '2rem',
            height: '2rem',
            backgroundColor: '#000',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          U
        </div>
      </div>
    </header>
  );
}
