#!/usr/bin/env node
/**
 * MCP Server for PriceAction Pro
 * 用于 Claude Desktop 集成
 */

const { ApifyClient } = require('apify-client');

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const client = new ApifyClient({ token: APIFY_TOKEN });

/**
 * 获取股票数据
 */
async function fetchStock(symbol) {
  try {
    const input = {
      startUrls: [{ url: `https://quote.eastmoney.com/${symbol}.html` }],
      maxCrawlPages: 1,
      maxCrawlDepth: 0,
      htmlTransformer: 'extractus',
    };

    const run = await client.actor('apify/website-content-crawler').call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return { error: 'No data found' };
    }

    const data = items[0];
    return {
      symbol,
      title: data.title,
      content: data.text?.substring(0, 1000),
      url: data.url,
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * 获取新闻
 */
async function fetchNews(symbol, limit = 10) {
  try {
    const url = `https://so.eastmoney.com/web/s?keyword=${symbol}`;
    const input = {
      startUrls: [{ url }],
      maxCrawlPages: 1,
      maxCrawlDepth: 0,
      htmlTransformer: 'extractus',
    };

    const run = await client.actor('apify/website-content-crawler').call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return { error: 'No news found' };
    }

    return {
      symbol,
      newsCount: items.length,
      content: items[0].text?.substring(0, 2000),
    };
  } catch (error) {
    return { error: error.message };
  }
}

// MCP 工具处理
const tools = {
  fetch_stock: async (args) => fetchStock(args.symbol),
  fetch_news: async (args) => fetchNews(args.symbol, args.limit),
};

// 简单的命令行处理
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node mcp-server.js <tool_name> [args_json]');
    console.log('Tools: fetch_stock, fetch_news');
    process.exit(1);
  }

  const toolName = args[0];
  const toolArgs = args[1] ? JSON.parse(args[1]) : {};

  const tool = tools[toolName];
  if (!tool) {
    console.error(`Unknown tool: ${toolName}`);
    process.exit(1);
  }

  const result = await tool(toolArgs);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
