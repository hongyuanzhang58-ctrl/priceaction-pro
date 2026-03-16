/**
 * MCP Server Integration for PriceAction Pro
 * 将 apify-agent-mcp 集成到项目中
 *
 * 在 Claude Desktop 配置后，AI 助手可以直接调用这些工具
 */

import { Stock, News } from '../types';

/**
 * MCP 工具定义
 * 这些工具可以在 Claude Desktop 配置中使用
 */
export const MCP_TOOLS = {
  /**
   * 获取股票实时行情
   */
  fetchStock: {
    name: 'fetch_stock',
    description: '获取指定股票的实时行情数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: '股票代码，如 600519',
        },
      },
      required: ['symbol'],
    },
  },

  /**
   * 获取K线数据
   */
  fetchCandles: {
    name: 'fetch_candles',
    description: '获取指定股票的K线历史数据',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: '股票代码',
        },
        timeframe: {
          type: 'string',
          enum: ['1m', '5m', '15m', '30m', '60m', '1d', '1w', '1M'],
          description: '时间框架',
        },
      },
      required: ['symbol', 'timeframe'],
    },
  },

  /**
   * 获取股票新闻
   */
  fetchNews: {
    name: 'fetch_stock_news',
    description: '获取与股票相关的最新新闻',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: '股票代码',
        },
        limit: {
          type: 'number',
          description: '返回新闻数量',
          default: 10,
        },
      },
      required: ['symbol'],
    },
  },

  /**
   * 获取热门板块
   */
  fetchHotSectors: {
    name: 'fetch_hot_sectors',
    description: '获取当前热门板块排行',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: '返回板块数量',
          default: 10,
        },
      },
    },
  },

  /**
   * 搜索股票
   */
  searchStocks: {
    name: 'search_stocks',
    description: '根据名称或代码搜索股票',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Claude Desktop 配置示例
 * 复制到 ~/.config/Claude/claude_desktop_config.json
 */
export const CLAUDE_DESKTOP_CONFIG = `
{
  "mcpServers": {
    "priceaction-stock": {
      "command": "node",
      "args": [
        "/Users/zhanghongyuan/priceaction-pro/tools/mcp-server.js"
      ],
      "env": {
        "APIFY_TOKEN": "your_apify_token_here"
      }
    }
  }
}
`;

/**
 * 前端使用 MCP 工具的 Hook 示例
 */
export function useMCPTools() {
  /**
   * 调用 MCP 工具获取股票数据
   */
  async function callFetchStock(symbol: string): Promise<Stock | null> {
    // 实际使用时通过 MCP 协议调用
    // 这里展示调用方式
    console.log('Calling MCP tool: fetch_stock', { symbol });
    return null;
  }

  /**
   * 调用 MCP 工具获取新闻
   */
  async function callFetchNews(symbol: string, limit?: number): Promise<News[]> {
    console.log('Calling MCP tool: fetch_stock_news', { symbol, limit });
    return [];
  }

  return {
    callFetchStock,
    callFetchNews,
  };
}
