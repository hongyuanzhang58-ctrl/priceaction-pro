import { useState, useEffect, useCallback, useRef } from 'react';
import { useStockStore } from '../store/stockStore';
import { realStockApi } from '../services/realStockApi';
import { AlBrooksPriceActionAnalyzer } from '../utils/priceAction';
import { PriceActionAnalysis } from '../types';

export function useStockData(symbol: string | null) {
  const candles = useStockStore((state) => state.candles);
  const setCandles = useStockStore((state) => state.setCandles);
  const currentStock = useStockStore((state) => state.currentStock);
  const setCurrentStock = useStockStore((state) => state.setCurrentStock);
  const isLoading = useStockStore((state) => state.isLoading);
  const setIsLoading = useStockStore((state) => state.setIsLoading);
  const error = useStockStore((state) => state.error);
  const setError = useStockStore((state) => state.setError);

  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!symbol || isFetchingRef.current) return;

    const fetchData = async () => {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const [stockData, candleData] = await Promise.all([
          realStockApi.getStock(symbol),
          realStockApi.getCandles(symbol, '1d'),
        ]);

        if (stockData) {
          setCurrentStock(stockData);
        }
        setCandles(candleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchData();
  }, [symbol]); // 只依赖 symbol

  return { stock: currentStock, candles, isLoading, error };
}

export function usePriceAction() {
  const candles = useStockStore((state) => state.candles);
  const [analysis, setAnalysis] = useState<PriceActionAnalysis | null>(null);

  useEffect(() => {
    if (candles.length > 0) {
      const analyzer = new AlBrooksPriceActionAnalyzer(candles);
      setAnalysis(analyzer.analyze());
    }
  }, [candles]);

  return analysis;
}

export function useSearch() {
  const searchQuery = useStockStore((state) => state.searchQuery);
  const setSearchQuery = useStockStore((state) => state.setSearchQuery);
  const searchResults = useStockStore((state) => state.searchResults);
  const setSearchResults = useStockStore((state) => state.setSearchResults);
  const [searchLoading, setSearchLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSearchLoading(true);
      try {
        const results = await realStockApi.searchStocks(query);
        setSearchResults(results);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
      setSearchLoading(false);
    }
  }, [setSearchQuery, setSearchResults]);

  return { searchQuery, searchResults, searchLoading, search };
}

export function useWatchlist() {
  const watchlist = useStockStore((state) => state.watchlist);
  const addToWatchlist = useStockStore((state) => state.addToWatchlist);
  const removeFromWatchlist = useStockStore((state) => state.removeFromWatchlist);
  const updateWatchlistItem = useStockStore((state) => state.updateWatchlistItem);

  const refreshWatchlist = useCallback(async () => {
    if (watchlist.length === 0) return;
    const symbols = watchlist.map((item) => item.symbol);
    const updatedData = await realStockApi.getWatchlistData(symbols);

    updatedData.forEach((stock) => {
      updateWatchlistItem(stock.symbol, {
        price: stock.price,
        change: stock.change,
        changePercent: stock.changePercent,
      });
    });
  }, [watchlist, updateWatchlistItem]);

  return { watchlist, addToWatchlist, removeFromWatchlist, updateWatchlistItem, refreshWatchlist };
}