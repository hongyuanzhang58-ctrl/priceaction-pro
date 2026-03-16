# PriceAction Pro - Apify-Agent 集成完成总结

## ✅ 已创建的文件

### 核心服务
| 文件 | 说明 | 用途 |
|------|------|------|
| `src/services/apifyStockApi.ts` | 股票数据 API | 抓取东方财富/新浪财经实时行情、K线、板块数据 |
| `src/services/apifyNewsService.ts` | 新闻服务 | 抓取股票相关新闻、公告、研报 |
| `src/utils/apifyWebFetcher.ts` | 底层抓取工具 | 通用网页抓取、API调用封装 |
| `src/services/mcpIntegration.ts` | MCP 集成 | Claude Desktop MCP 工具配置 |

### 工具脚本
| 文件 | 说明 | 用途 |
|------|------|------|
| `tools/mcp-server.js` | MCP 服务器 | Claude Desktop 服务端点 |
| `~/tools/apify-agent/web-fetcher.js` | 通用抓取工具 | 可在其他项目复用 |
| `~/tools/apify-agent/fetch.js` | CLI 工具 | 命令行快速抓取 |

### 示例组件
| 文件 | 说明 |
|------|------|
| `src/components/apify/ApifyStockDemo.tsx` | 集成演示组件 |
| `src/components/apify/ApifyStockDemo.css` | 组件样式 |

### 文档
| 文件 | 说明 |
|------|------|
| `APIFY_INTEGRATION.md` | 详细使用指南 |
| `PROJECT_PROGRESS.md` | 已更新进度 |
| `src/services/APIFY_SUMMARY.md` | 本汇总文档 |

---

## 🚀 快速开始

### 1. 配置环境变量

```bash
# 在项目根目录创建 .env.local
echo "VITE_APIFY_TOKEN=YOUR_APIFY_TOKEN_HERE" > /Users/zhanghongyuan/priceaction-pro/.env.local
```

### 2. 安装依赖

```bash
cd /Users/zhanghongyuan/priceaction-pro
npm install apify-client
```

### 3. 使用示例

```typescript
// 获取股票数据
import { apifyStockApi } from './services/apifyStockApi';
const stock = await apifyStockApi.getStock('600519');

// 获取新闻
import { apifyNewsService } from './services/apifyNewsService';
const news = await apifyNewsService.getNewsByStock('600519', 10);

// 底层抓取
import { createWebFetcher } from './utils/apifyWebFetcher';
const fetcher = createWebFetcher();
const result = await fetcher.fetchPage('https://example.com');
```

---

## 🔌 MCP 集成（Claude Desktop）

### 配置 Claude Desktop

编辑 `~/.config/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "priceaction-stock": {
      "command": "node",
      "args": [
        "/Users/zhanghongyuan/priceaction-pro/tools/mcp-server.js"
      ],
      "env": {
        "APIFY_TOKEN": "YOUR_APIFY_TOKEN_HERE"
      }
    }
  }
}
```

重启 Claude Desktop 后可以直接询问：

> "帮我获取贵州茅台(600519)的最新行情"

---

## 📊 数据源支持

| 数据源 | 支持功能 | 可靠性 |
|--------|----------|--------|
| 东方财富 | 股票行情、K线、新闻、公告、研报 | ⭐⭐⭐⭐⭐ |
| 新浪财经 | 备选数据源 | ⭐⭐⭐⭐ |
| 雪球 | 热门讨论、社区热点 | ⭐⭐⭐ |

---

## 📝 API 参考

### apifyStockApi

```typescript
// 获取单只股票
getStock(symbol: string): Promise<Stock | null>

// 获取K线数据
getCandles(symbol: string, timeframe: TimeFrame): Promise<Candle[]>

// 获取热门板块
getHotSectors(): Promise<Sector[]>

// 搜索股票
searchStocks(query: string): Promise<Stock[]>

// 批量获取
getWatchlistData(symbols: string[]): Promise<Stock[]>
```

### apifyNewsService

```typescript
// 获取股票相关新闻
getNewsByStock(symbol: string, limit?: number): Promise<News[]>

// 获取板块新闻
getNewsBySector(sectorCode: string, limit?: number): Promise<News[]>

// 获取最新财经新闻
getLatestNews(limit?: number): Promise<News[]>

// 搜索新闻
searchNews(keyword: string, limit?: number): Promise<News[]>

// 获取公告
getAnnouncements(symbol: string): Promise<News[]>

// 获取研报
getResearchReports(symbol: string): Promise<News[]>
```

### WebFetcher

```typescript
// 抓取单个页面
fetchPage(url: string, options?: FetchOptions): Promise<FetchResult | null>

// 批量抓取
fetchMultiple(urls: string[], options?: FetchOptions): Promise<FetchResult[]>

// 抓取动态内容
fetchDynamic(url: string, waitForSelector: string): Promise<FetchResult | null>

// 抓取API数据
fetchApi<T>(url: string): Promise<T | null>

// 搜索并抓取
searchAndFetch(searchUrl: string, resultSelector: string): Promise<FetchResult[]>
```

---

## ⚠️ 注意事项

1. **Token 安全**：不要提交到代码仓库，使用 .env.local
2. **抓取频率**：注意控制请求频率，避免触发反爬机制
3. **数据缓存**：建议添加本地缓存减少重复请求
4. **错误处理**：生产环境需要完善的错误处理和重试机制

---

## 🔮 待优化项

- [ ] 添加数据缓存层 (localStorage/IndexedDB)
- [ ] 实现请求队列和限流控制
- [ ] 添加更多数据源 (腾讯财经、同花顺)
- [ ] 完善数据解析逻辑（根据实际页面结构调整）
- [ ] 添加单元测试和集成测试
- [ ] 添加数据监控和告警

---

## 📚 相关文档

- [Apify 官网](https://apify.com)
- [Apify Client JS](https://docs.apify.com/api/client/js/)
- [Website Content Crawler](https://apify.com/apify/website-content-crawler)

---

**创建时间**: 2026-03-09
**版本**: v1.0
**状态**: 示例代码已完成，待测试验证
