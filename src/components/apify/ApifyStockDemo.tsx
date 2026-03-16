/**
 * ApifyStockDemo Component
 * 展示如何使用 Apify 抓取真实股票数据
 */

import React, { useState, useEffect } from 'react';
import { apifyStockApi } from '../../services/apifyStockApi';
import { apifyNewsService } from '../../services/apifyNewsService';
import { Stock, News } from '../../types';
import './ApifyStockDemo.css';

export const ApifyStockDemo: React.FC = () => {
  const [symbol, setSymbol] = useState('600519');
  const [stock, setStock] = useState<Stock | null>(null);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'news'>('stock');

  // 获取股票数据
  const fetchStockData = async () => {
    setLoading(true);
    setError('');
    try {
      // 注意：实际抓取需要配置 APIFY_TOKEN
      // 这里展示调用方式
      const data = await apifyStockApi.getStock(symbol);
      if (data) {
        setStock(data);
      } else {
        setError('未获取到数据，请检查 APIFY_TOKEN 配置');
      }
    } catch (err) {
      setError('获取数据失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 获取新闻
  const fetchNewsData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apifyNewsService.getNewsByStock(symbol, 5);
      setNews(data);
    } catch (err) {
      setError('获取新闻失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 获取热门板块
  const fetchHotSectors = async () => {
    setLoading(true);
    setError('');
    try {
      const sectors = await apifyStockApi.getHotSectors();
      console.log('热门板块:', sectors);
    } catch (err) {
      setError('获取板块数据失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 演示模式：显示说明信息
    setError('请先配置 APIFY_TOKEN 环境变量以使用真实数据抓取');
  }, []);

  return (
    <div className="apify-demo">
      <div className="apify-demo__header">
        <h2>🌐 Apify 实时数据演示</h2>
        <p className="apify-demo__desc">
          使用 Apify Agent 抓取东方财富/新浪财经真实数据
        </p>
      </div>

      <div className="apify-demo__config">
        <div className="apify-demo__input-group">
          <label>股票代码:</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="输入股票代码，如 600519"
            className="apify-demo__input"
          />
        </div>

        <div className="apify-demo__tabs">
          <button
            className={`apify-demo__tab ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            股票行情
          </button>
          <button
            className={`apify-demo__tab ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            相关新闻
          </button>
        </div>

        <div className="apify-demo__actions">
          {activeTab === 'stock' && (
            <button
              onClick={fetchStockData}
              disabled={loading}
              className="apify-demo__btn apify-demo__btn--primary"
            >
              {loading ? '抓取中...' : '获取行情'}
            </button>
          )}
          {activeTab === 'news' && (
            <button
              onClick={fetchNewsData}
              disabled={loading}
              className="apify-demo__btn apify-demo__btn--primary"
            >
              {loading ? '抓取中...' : '获取新闻'}
            </button>
          )}
          <button
            onClick={fetchHotSectors}
            disabled={loading}
            className="apify-demo__btn"
          >
            热门板块
          </button>
        </div>
      </div>

      {error && (
        <div className="apify-demo__error">
          <strong>⚠️ {error}</strong>
          <div className="apify-demo__help">
            <p>解决步骤：</p>
            <ol>
              <li>在项目根目录创建 <code>.env.local</code> 文件</li>
              <li>添加：VITE_APIFY_TOKEN=your_token_here</li>
              <li>重启开发服务器</li>
            </ol>
            <p>当前 Token: {import.meta.env.VITE_APIFY_TOKEN ? '已配置 ✓' : '未配置 ✗'}</p>
          </div>
        </div>
      )}

      {activeTab === 'stock' && stock && (
        <div className="apify-demo__result">
          <h3>📊 股票信息</h3>
          <div className="apify-demo__stock-card">
            <div className="apify-demo__stock-header">
              <span className="apify-demo__symbol">{stock.symbol}</span>
              <span className="apify-demo__name">{stock.name}</span>
            </div>
            <div className="apify-demo__stock-price">
              <span className="apify-demo__price">¥{stock.price.toFixed(2)}</span>
              <span className={`apify-demo__change ${stock.change >= 0 ? 'up' : 'down'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="apify-demo__stock-info">
              <div className="apify-demo__info-item">
                <span className="label">成交量:</span>
                <span className="value">{(stock.volume / 10000).toFixed(0)}万</span>
              </div>
              <div className="apify-demo__info-item">
                <span className="label">成交额:</span>
                <span className="value">{(stock.turnover / 100000000).toFixed(2)}亿</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'news' && (
        <div className="apify-demo__result">
          <h3>📰 相关新闻 ({news.length})</h3>
          {news.length === 0 ? (
            <p className="apify-demo__empty">暂无新闻数据</p>
          ) : (
            <div className="apify-demo__news-list">
              {news.map((item) => (
                <div key={item.id} className="apify-demo__news-item">
                  <div className="apify-demo__news-title">{item.title}</div>
                  <div className="apify-demo__news-meta">
                    <span className="apify-demo__news-source">{item.source}</span>
                    <span className="apify-demo__news-time">
                      {new Date(item.publishedAt).toLocaleString()}
                    </span>
                    <span className={`apify-demo__news-sentiment ${item.sentiment}`}>
                      {item.sentiment === 'positive' ? '利好' : item.sentiment === 'negative' ? '利空' : '中性'}
                    </span>
                  </div>
                  <div className="apify-demo__news-summary">{item.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="apify-demo__footer">
        <h4>💡 使用提示</h4>
        <ul>
          <li>支持的股票代码格式：600519 (沪市), 000001 (深市), 300750 (创业板)</li>
          <li>数据来源于东方财富，抓取可能有延迟</li>
          <li>建议添加缓存机制避免频繁请求</li>
          <li>查看 <a href="/APIFY_INTEGRATION.md">APIFY_INTEGRATION.md</a> 获取完整文档</li>
        </ul>
      </div>
    </div>
  );
};
