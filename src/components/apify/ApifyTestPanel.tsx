import { useState, useEffect } from 'react';
import { enhancedApifyStockApi } from '../../services/enhancedApifyStockApi';
import './ApifyTestPanel.css';

export function ApifyTestPanel() {
  const [testResults, setTestResults] = useState<Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    data?: any;
    error?: string;
    time?: number;
  }>>([]);

  const [isTesting, setIsTesting] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // 检查是否有Apify Token
    const token = import.meta.env.VITE_APIFY_TOKEN;
    setHasToken(!!token);
  }, []);

  const runTests = async () => {
    setIsTesting(true);
    setTestResults([]);

    const tests = [
      { name: '获取股票数据 (600519)', test: () => enhancedApifyStockApi.getStock('600519') },
      { name: '获取K线数据 (1d)', test: () => enhancedApifyStockApi.getCandles('600519', '1d') },
      { name: '获取K线数据 (60m)', test: () => enhancedApifyStockApi.getCandles('600519', '60m') },
      { name: '获取热门板块', test: () => enhancedApifyStockApi.getHotSectors() },
      { name: '搜索股票', test: () => enhancedApifyStockApi.searchStocks('茅台') },
      { name: '获取新闻', test: () => enhancedApifyStockApi.getNews(['600519']) },
    ];

    for (const { name, test } of tests) {
      const startTime = Date.now();

      try {
        const result = await test();
        const time = Date.now() - startTime;

        setTestResults(prev => [...prev, {
          name,
          status: 'success',
          data: result,
          time,
        }]);
      } catch (error) {
        const time = Date.now() - startTime;

        setTestResults(prev => [...prev, {
          name,
          status: 'error',
          error: error instanceof Error ? error.message : '未知错误',
          time,
        }]);
      }

      // 请求间隔，避免限流
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setIsTesting(false);
  };

  const clearCache = () => {
    enhancedApifyStockApi.clearCache();
    alert('缓存已清除');
  };

  return (
    <div className="apify-test-panel">
      <div className="panel-header">
        <h2>🌐 Apify 集成测试</h2>
        <div className="token-status">
          <span className={`status-dot ${hasToken ? 'active' : 'inactive'}`} />
          {hasToken ? 'API Token 已配置' : 'API Token 未配置 (使用模拟数据)'}
        </div>
      </div>

      <div className="panel-actions">
        <button
          className="test-btn"
          onClick={runTests}
          disabled={isTesting}
        >
          {isTesting ? '测试中...' : '🚀 运行测试'}
        </button>
        <button className="clear-btn" onClick={clearCache}>
          🗑️ 清除缓存
        </button>
      </div>

      {isTesting && (
        <div className="testing-indicator">
          <div className="spinner" />
          <span>正在测试各项API，请稍候...</span>
        </div>
      )}

      <div className="test-results">
        {testResults.map((result, index) => (
          <div key={index} className={`test-card ${result.status}`}>
            <div className="test-header">
              <span className="test-name">{result.name}</span>
              <span className={`test-status ${result.status}`}>
                {result.status === 'success' ? '✅ 成功' : '❌ 失败'}
              </span>
              {result.time && <span className="test-time">{result.time}ms</span>}
            </div>

            {result.status === 'success' && result.data && (
              <div className="test-data">
                <pre>{JSON.stringify(result.data, null, 2).substring(0, 500)}</pre>
                {JSON.stringify(result.data).length > 500 && '...'}
              </div>
            )}

            {result.status === 'error' && result.error && (
              <div className="test-error">
                错误: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="panel-info">
        <h3>📋 测试说明</h3>
        <ul>
          <li>测试会自动检测是否配置了 <code>VITE_APIFY_TOKEN</code></li>
          <li>如果未配置Token，将使用模拟数据作为降级方案</li>
          <li>数据会缓存以提高性能和减少API调用</li>
          <li>请求间隔设置为2秒以避免触发反爬机制</li>
          <li>所有数据来自东方财富公开API</li>
        </ul>
      </div>
    </div>
  );
}
