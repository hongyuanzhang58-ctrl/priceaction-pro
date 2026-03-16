import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Stock, Candle, TimeFrame, WatchlistItem } from '../types';

interface StockState {
  // 当前选中的股票
  currentStock: Stock | null;
  setCurrentStock: (stock: Stock | null) => void;

  // K线数据
  candles: Candle[];
  setCandles: (candles: Candle[]) => void;

  // 时间框架
  timeFrame: TimeFrame;
  setTimeFrame: (timeFrame: TimeFrame) => void;

  // 自选股列表
  watchlist: WatchlistItem[];
  addToWatchlist: (stock: Stock) => void;
  removeFromWatchlist: (symbol: string) => void;
  updateWatchlistItem: (symbol: string, updates: Partial<WatchlistItem>) => void;

  // 搜索
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Stock[];
  setSearchResults: (results: Stock[]) => void;

  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // 错误信息
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStockStore = create<StockState>()(
  persist(
    (set) => ({
      currentStock: null,
      setCurrentStock: (stock) => set({ currentStock: stock }),

      candles: [],
      setCandles: (candles) => set({ candles }),

      timeFrame: '1d',
      setTimeFrame: (timeFrame) => set({ timeFrame }),

      watchlist: [],
      addToWatchlist: (stock) =>
        set((state) => {
          if (state.watchlist.some((item) => item.symbol === stock.symbol)) {
            return state;
          }
          return {
            watchlist: [
              ...state.watchlist,
              {
                ...stock,
                addedAt: new Date().toISOString(),
                signalStrength: 3,
                recommendation: 'hold',
              },
            ],
          };
        }),
      removeFromWatchlist: (symbol) =>
        set((state) => ({
          watchlist: state.watchlist.filter((item) => item.symbol !== symbol),
        })),
      updateWatchlistItem: (symbol, updates) =>
        set((state) => ({
          watchlist: state.watchlist.map((item) =>
            item.symbol === symbol ? { ...item, ...updates } : item
          ),
        })),

      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchResults: [],
      setSearchResults: (results) => set({ searchResults: results }),

      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),

      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'stock-storage',
      partialize: (state) => ({
        watchlist: state.watchlist,
        timeFrame: state.timeFrame,
      }),
    }
  )
);