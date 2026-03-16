/**
 * Cloudflare Workers 股票API代理
 */

// CORS响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 路由分发
      if (path === '/api/search') {
        return await handleSearch(url);
      } else if (path.startsWith('/api/stock/')) {
        const symbol = path.split('/').pop();
        return await handleStock(symbol);
      } else if (path.startsWith('/api/candles/')) {
        const symbol = path.split('/').pop();
        const timeFrame = url.searchParams.get('timeFrame') || '1d';
        return await handleCandles(symbol, timeFrame);
      } else if (path === '/api/sectors') {
        return await handleSectors();
      } else if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: corsHeaders
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};

// 搜索股票
async function handleSearch(url) {
  const query = url.searchParams.get('query');
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query required' }), {
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const targetUrl = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(query)}&type=14&count=10`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://quote.eastmoney.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`EastMoney API returned ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text.substring(0, 200));
      throw new Error('Invalid JSON response from EastMoney');
    }

    // 格式化结果
    let results = [];
    if (data.QuotationCodeTable && data.QuotationCodeTable.Data) {
      results = data.QuotationCodeTable.Data.map(item => ({
        symbol: item.Code,
        name: item.Name,
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        turnover: 0
      }));
    }

    return new Response(JSON.stringify(results), { headers: corsHeaders });
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 获取股票行情
async function handleStock(symbol) {
  try {
    const secid = getSecid(symbol);
    const targetUrl = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://quote.eastmoney.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`EastMoney API returned ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text.substring(0, 200));
      throw new Error('Invalid JSON response from EastMoney');
    }

    if (!data.data) {
      return new Response(JSON.stringify({ error: 'Stock not found' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const d = data.data;
    const stock = {
      symbol: d.f57 || symbol,
      name: d.f58 || symbol,
      price: (d.f43 || 0) / 100,
      change: (d.f170 || 0) / 100,
      changePercent: (d.f170 || 0) / 100,
      volume: (d.f47 || 0) / 100,
      turnover: (d.f48 || 0) / 10000
    };

    return new Response(JSON.stringify(stock), { headers: corsHeaders });
  } catch (error) {
    console.error('Stock error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 获取K线数据
async function handleCandles(symbol, timeFrame) {
  try {
    const periodMap = {
      '1m': '1', '5m': '5', '15m': '15', '30m': '30', '60m': '60',
      '1d': '101', '1w': '102', '1M': '103'
    };

    const secid = getSecid(symbol);
    const targetUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${periodMap[timeFrame]}&fqt=0&end=20500101&lmt=200`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://quote.eastmoney.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`EastMoney API returned ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text.substring(0, 200));
      throw new Error('Invalid JSON response from EastMoney');
    }

    if (!data.data || !data.data.klines) {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }

    const candles = data.data.klines.map(line => {
      const parts = line.split(',');
      return {
        time: parts[0],
        open: parseFloat(parts[1]),
        close: parseFloat(parts[2]),
        low: parseFloat(parts[4]),
        high: parseFloat(parts[3]),
        volume: parseFloat(parts[5])
      };
    });

    return new Response(JSON.stringify(candles), { headers: corsHeaders });
  } catch (error) {
    console.error('Candles error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 获取板块数据
async function handleSectors() {
  try {
    const targetUrl = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f20&fs=m:90+t:2+f:!50&fields=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222';

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://quote.eastmoney.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`EastMoney API returned ${response.status}`);
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text.substring(0, 200));
      throw new Error('Invalid JSON response from EastMoney');
    }

    if (!data.data || !data.data.diff) {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }

    const sectors = data.data.diff.map((item, index) => ({
      code: item.f12 || `sector_${index}`,
      name: item.f14 || '未知板块',
      heatIndex: Math.min(100, Math.abs(item.f3 || 0)),
      change: (item.f4 || 0) / 100,
      changePercent: (item.f3 || 0) / 100,
      leadingStocks: []
    }));

    return new Response(JSON.stringify(sectors), { headers: corsHeaders });
  } catch (error) {
    console.error('Sectors error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 辅助函数：转换股票代码
function getSecid(symbol) {
  if (symbol.startsWith('6')) return `1.${symbol}`;
  if (symbol.startsWith('0') || symbol.startsWith('3')) return `0.${symbol}`;
  if (symbol.startsWith('8') || symbol.startsWith('4')) return `0.${symbol}`;
  return `0.${symbol}`;
}
