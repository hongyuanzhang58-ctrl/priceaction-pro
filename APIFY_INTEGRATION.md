# Apify 集成使用指南

## 快速开始

### 1. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# Apify API Token
VITE_APIFY_TOKEN=YOUR_APIFY_TOKEN_HERE
```

### 2. 安装依赖

```bash
npm install apify-client
```

### 3. 使用示例

#### 获取股票数据

```typescript
import { apifyStockApi } from './services/apifyStockApi';

// 获取单只股票
const stock = await apifyStockApi.getStock('600519');
console.log(stock);

// 获取K线数据
const candles = await apifyStockApi.getCandles('600519', '1d');
console.log(candles);

// 获取热门板块
const sectors = await apifyStockApi.getHotSectors();
console.log(sectors);
```

#### 获取新闻资讯

```typescript
import { apifyNewsService } from './services/apifyNewsService';

// 获取股票相关新闻
const news = await apifyNewsService.getNewsByStock('600519', 10);
console.log(news);

// 获取最新财经新闻
const latestNews = await apifyNewsService.getLatestNews(20);
console.log(latestNews);

// 搜索新闻
const searchResults = await apifyNewsService.searchNews('人工智能', 10);
console.log(searchResults);
```

#### 底层抓取工具

```typescript
import { createWebFetcher } from './utils/apifyWebFetcher';

const fetcher = createWebFetcher();

// 抓取单个页面
const result = await fetcher.fetchPage('https://quote.eastmoney.com/600519.html', {
  extractLinks: true,
});
console.log(result.content);

// 抓取API数据
const apiData = await fetcher.fetchApi('https://api.example.com/data');
console.log(apiData);

// 批量抓取
const results = await fetcher.fetchMultiple([
  'https://quote.eastmoney.com/600519.html',
  'https://quote.eastmoney.com/000001.html',
]);
```

## MCP 集成

### Claude Desktop 配置

编辑 `~/.config/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "priceaction-stock": {
      "command": "npx",
      "args": [
        "apify-agent-mcp",
        "{\"name\":\"fetch_stock\",\"description\":\"获取股票行情\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"symbol\":{\"type\":\"string\"}},\"required\":[\"symbol\"]},\"implementation\":{\"type\":\"apify-actor\",\"actorId\":\"apify/website-content-crawler\",\"script\":\"await page.goto(`https://quote.eastmoney.com/${inputs.symbol}.html`); return {symbol: inputs.symbol, title: await page.title()};\"}}"
      ],
      "env": {
        "APIFY_TOKEN": "YOUR_APIFY_TOKEN_HERE"
      }
    }
  }
}
```

配置后重启 Claude Desktop，可以直接询问：

> "帮我获取贵州茅台(600519)的最新行情"

## 数据源

当前集成以下数据源：

| 数据源 | 用途 | 可靠性 |
|--------|------|--------|
| 东方财富 | 股票行情、K线、新闻 | 高 |
| 新浪财经 | 备选数据源 | 高 |
| 雪球 | 热门讨论、社区热点 | 中 |

## 注意事项

1. **Token 安全**：不要将 Token 提交到代码仓库
2. **抓取频率**：注意控制请求频率，避免触发反爬
3. **数据缓存**：建议对抓取结果进行本地缓存
4. **错误处理**：生产环境需要完善的错误处理机制

## 待优化项

- [ ] 添加数据缓存层 (localStorage/IndexedDB)
- [ ] 实现请求队列和限流
- [ ] 添加更多数据源 (腾讯财经、同花顺)
- [ ] 完善数据解析逻辑
- [ ] 添加单元测试
