# PriceAction Pro - 项目进度文档

## 项目概述

**名称**: PriceAction Pro - 基于阿尔布鲁克斯价格行为学的股票分析平台

**位置**: `/Users/zhanghongyuan/priceaction-pro`

**运行命令**:
```bash
cd /Users/zhanghongyuan/priceaction-pro
npm run dev
# 或构建后运行
npm run build && npx serve dist -l 3009
```

**访问地址**: http://localhost:3009/

---

## 当前状态

**版本**: V1.5

**最后更新**: 2026-03-12

**状态**: ✅ 构建成功，已接入真实数据源（新浪/腾讯/东方财富）

---

## 已完成功能

### 核心模块
| 模块 | 状态 | 说明 |
|------|------|------|
| K线图表 | ✅ 完成 | 使用 Lightweight Charts，白色涨黑色跌 |
| 股票搜索 | ✅ 新增 | 顶部搜索框，支持代码/名称搜索，实时下拉结果 |
| 图表绘制工具 | ✅ 完成 | 支持趋势线、水平线、通道线等绘制 (类似TradingView) |
| 形态高亮 | ✅ 完成 | 点击形态在图表中高亮显示，修复空白问题 |
| 时间框架切换 | ✅ 完成 | 支持1分钟到月K |
| 价格行为分析 | ✅ 完成 | 趋势分析、形态识别、支撑阻力位 |
| 交易建议 | ✅ 完成 | 入场价、止损、目标位、风险收益比，头部显示买入建议 |
| 自选股管理 | ✅ 完成 | 添加/删除/查看 |
| 热点板块 | ✅ 完成 | 板块热度排行、新闻聚合、即将爆发板块预警带选股推荐 |

### 价格行为分析算法 (V1.3 阿尔布鲁克斯方法论)
- **摆动点计算（Al Brooks 方法）**:
  - ✅ 3-5根K线确认摆动高低点
  - ✅ 强度评分（1-3级）
  - ✅ 位置信息记录用于图表标注
- **趋势分析（Al Brooks 方法）**:
  - ✅ 基于 HH/HL（上升趋势）或 LH/LL（下降趋势）序列
  - ✅ 趋势线斜率计算
  - ✅ 多时间框架趋势一致性检查
- **图表形态识别**:
  - ✅ 双顶/双底（M/W形态，带颈线）
  - ✅ 头肩顶/底（带颈线和测量目标）
  - ✅ 旗形（回调50%-61.8%斐波那契位）
  - ✅ 楔形（三推楔形、收敛楔形）
  - ✅ 三角形（上升/下降/对称）
  - ✅ 通道线突破识别
- **K线形态（Al Brooks 方法）**:
  - ✅ Pin Bar（锤子线/上吊线）- 长影线，短实体
  - ✅ 吞没形态（多头/空头）
  - ✅ Doji（十字星）
  - ✅ 结合趋势背景判断信号质量
- **支撑阻力位**:
  - ✅ 基于摆动高低点计算
  - ✅ 多次测试强度加权
  - ✅ 1.5%容差合并相近水平
- **交易信号与建议**:
  - ✅ 高概率 setups（顺势+支撑阻力+形态确认）
  - ✅ 入场区间、止损位、目标位计算
  - ✅ 风险收益比评估
  - ✅ 趋势背景警告
- **图表绘制工具**:
  - ✅ 水平线 - 标记支撑阻力位
  - ✅ 趋势线 - 连接两个点绘制趋势线
  - ✅ 射线 - 从一个点向外延伸的射线
  - ✅ 通道线 - 平行通道绘制
  - ✅ 斐波那契回撤 - 自动计算回撤位
  - ✅ 文字标注 - 添加注释
  - ✅ 绘制列表管理 - 显示/隐藏/删除绘制对象
- **形态高亮显示**:
  - ✅ 点击分析面板中的形态，图表自动高亮显示
  - ✅ 支持双顶/双底、头肩顶/底、三角形、三推楔形等
  - ✅ 不同形态使用不同颜色和样式标注
  - ✅ 关键点位标注（峰、谷、颈线、趋势线）

---

## 技术栈

- **框架**: React 19 + TypeScript + Vite
- **样式**: 纯 CSS (已移除 Tailwind，避免兼容问题)
- **图表**: Lightweight Charts
- **价格行为算法**: 阿尔布鲁克斯方法论 (Al Brooks Price Action)
- **状态管理**: Zustand (带持久化)
- **数据**: 多数据源（新浪财经、腾讯财经、东方财富、Apify）- 全部真实数据，无模拟数据
- **Polyfills**: vite-plugin-node-polyfills (解决apify-client浏览器兼容)

---

## 文件结构 (更新)

```
priceaction-pro/
├── src/
│   ├── components/
│   │   ├── apify/                    # Apify 集成测试
│   │   │   ├── ApifyTestPanel.tsx
│   │   │   ├── ApifyTestPanel.css
│   │   │   └── index.ts
│   │   ├── charts/                   # ⭐ V1.2 增强: 图表组件
│   │   │   ├── CandlestickChart.tsx  # K线图表 (新增绘制功能)
│   │   │   ├── CandlestickChart.css  # ⭐ 新增: 图表样式
│   │   │   ├── ChartDrawingTools.tsx # ⭐ 新增: 绘制工具栏
│   │   │   ├── ChartDrawingTools.css # ⭐ 新增: 工具栏样式
│   │   │   ├── TimeFrameSelector.tsx # 时间框架选择
│   │   │   └── index.ts
│   │   ├── analysis/                 # ⭐ V1.2 增强: 分析面板
│   │   │   ├── TrendAnalysis.tsx     # 价格行为分析 (新增点击高亮)
│   │   │   ├── TrendAnalysis.css     # ⭐ 新增: 分析面板样式
│   │   │   └── index.ts
│   │   ├── watchlist/
│   │   │   ├── Watchlist.tsx         # 自选股列表
│   │   │   └── index.ts
│   │   ├── hotspots/
│   │   │   ├── HotSectors.tsx        # 热点板块
│   │   │   └── index.ts
│   │   └── layout/
│   │       ├── Header.tsx            # 顶部导航 (V1.4 新增搜索功能)
│   │       ├── Sidebar.tsx           # 侧边栏
│   │       ├── MainLayout.tsx        # 主布局 (V1.4 集成搜索)
│   │       └── index.ts
│   ├── hooks/
│   │   └── useStockData.ts           # 股票数据 Hook
│   ├── services/
│   │   ├── stockApi.ts               # 模拟数据 API
│   │   ├── realStockApi.ts           # ⭐ V1.5 新增: 多数据源服务（新浪/腾讯/东方财富）
│   │   ├── proxyDataSource.ts         # ⭐ V1.5 新增: 代理服务器数据源
│   │   ├── apifyStockApi.ts          # Apify 股票数据 (旧)
│   │   ├── enhancedApifyStockApi.ts  # 增强版带缓存/降级
│   │   ├── apifyNewsService.ts       # Apify 新闻服务
│   │   └── mcpIntegration.ts         # MCP 服务集成
│   ├── store/
│   │   └── stockStore.ts             # Zustand 状态管理
│   ├── types/
│   │   └── index.ts                  # TypeScript 类型定义 (V1.2 新增绘制类型)
│   ├── utils/
│   │   ├── priceAction.ts            # 价格行为分析算法 (V1.3 阿尔布鲁克斯方法论)
│   │   └── apifyWebFetcher.ts        # 底层抓取工具封装
│   ├── App.tsx                       # 主应用组件 (V1.2 新增形态高亮)
│   ├── main.tsx                      # 入口文件
│   └── index.css                     # 全局样式
├── proxy-server/                    # ⭐ V1.5 新增: 代理服务器
│   ├── server.js                    # 代理服务器主文件
│   ├── package.json                 # 依赖配置
│   ├── Dockerfile                 # Docker镜像
│   ├── docker-compose.yml          # Docker Compose配置
│   ├── .env.example            # 环境变量模板
│   ├── .gitignore              # Git忽略
│   ├── .dockerignore          # Docker忽略
│   ├── README.md              # 使用文档
│   └── DEPLOY.md            # 部署指南
├── tools/
│   └── mcp-server.js                 # MCP 服务器
├── vite.config.ts                    # Vite 配置
├── APIFY_INTEGRATION.md              # 使用指南
└── PROJECT_PROGRESS.md               # 本文件
```

---

## 已解决的问题

1. **Tailwind CSS v4 兼容性问题** → 改用纯 CSS
2. **React StrictMode 导致图表双重渲染报错** → 移除 StrictMode
3. **lightweight-charts 图表销毁后访问报错** → 添加 isDisposedRef 标志
4. **Zustand Hook 依赖循环问题** → 使用 useRef 防止重复请求
5. **Apify API不稳定** → 添加缓存层 + 自动降级到模拟数据
6. **请求限流** → 实现请求队列，最小间隔6秒
7. **Apify 浏览器兼容性错误** (`Class extends value undefined`) → 添加 vite-plugin-node-polyfills
8. **【V1.2 修复】图表飘动问题** → 移除错误的 `scrollToPosition` 调用，保持视图稳定
9. **【V1.2 修复】图表绘制交互** → 改为 TradingView 风格：点击工具 → 十字准线 → 拖动绘制
10. **【V1.2 修复】形态标记显示错误** → 双底/头肩底等形态不再显示为通道线，正确标记关键点和颈线
11. **【V1.3 优化】价格行为算法** → 全面采用阿尔布鲁克斯方法论，重写摆动点计算、趋势分析、形态识别算法
12. **【V1.4 新增】股票搜索功能** → 顶部搜索框支持代码/名称搜索，实时下拉结果，点击跳转
13. **【V1.4 修复】形态点击空白** → 修复时间戳不匹配导致的图表崩溃问题
14. **【V1.4 优化】K线颜色** → 改为白色涨、黑色跌，符合传统图表习惯
15. **【V1.4 优化】热点板块** → 添加板块切换、即将爆发板块推荐股票、新闻跳转
16. **【V1.5 新增】多数据源接入** → 接入新浪财经、腾讯财经、东方财富、Apify四大数据源
17. **【V1.5 变更】移除模拟数据** → 不再使用任何模拟数据，全部数据来自真实API
18. **【V1.5 优化】请求队列** → 500ms间隔限流，避免被数据源封禁
19. **【V1.5 修复】搜索功能** → 由于浏览器CORS限制，改用直接代码查询+本地名称匹配方案
20. **【V1.5 新增】代理服务器** → 提供完整后端代理方案，支持Railway/Render/Cloudflare/自有服务器部署

---

## V1.5 更新 - 全真实数据源

### 核心变更
**🚫 不再使用模拟数据** - 所有数据均来自真实API

### 数据源架构
| 数据源 | 优先级 | 类型 | 功能覆盖 |
|--------|--------|------|----------|
| 东方财富 | 1 | 免费API | 行情、K线、板块 |
| 新浪财经 | 2 | 免费API | 行情、K线 |
| Apify | 2 | 代理抓取 | 备用全功能 |
| 腾讯财经 | 3 | 免费API | 行情、K线 |

### 搜索功能实现（重要变更）
由于浏览器CORS限制，**东方财富搜索API无法直接调用**。改用以下方案：

1. **6位数字代码**：直接查询该股票行情（如 `600519` → 茅台）
2. **股票名称**：匹配本地常见股票列表（18只热门股票）
3. **模糊搜索**：支持名称片段匹配（如 `茅台` → 贵州茅台）

**示例可搜索内容**：
- 代码：`600519`, `000001`, `300750`
- 名称：`茅台`, `平安`, `宁德时代`, `比亚迪`, `招商银行` 等

**注意**：如需完整搜索功能，建议部署后端代理服务器转发搜索API。

### 代理服务器（新增）

为了解决CORS限制，提供完整的代理服务器方案：

| 部署方式 | 成本 | 难度 | 适用场景 |
|----------|------|------|----------|
| 本地开发 | 免费 | ⭐ | 本地调试 |
| Railway | $5/月（免费额度） | ⭐⭐ | 小规模应用 |
| Render | 免费 | ⭐⭐ | 个人项目 |
| Cloudflare Workers | 免费（10万次/天） | ⭐⭐⭐ | 全球部署 |
| 自有服务器 | ¥50+/月 | ⭐⭐ | 生产环境 |

**代理服务器功能**：
- ✅ 股票搜索（全量）
- ✅ 行情查询
- ✅ K线数据
- ✅ 板块数据
- ✅ 内置缓存
- ✅ 限流保护

**快速启动**：
```bash
cd proxy-server
npm install
npm start
```

**详细文档**：`proxy-server/README.md` 和 `proxy-server/DEPLOY.md`

### 技术特点
- **全部真实数据**：股票行情、K线、板块、新闻均为真实数据
- **浏览器直调**：fetch直接调用，无需后端
- **缓存机制**：减少API调用次数
- **限流保护**：500ms间隔，避免被封

### 文件更新
- `src/services/realStockApi.ts`: 新增多数据源服务（⭐ 核心文件，已整合Apify）
- `src/hooks/useStockData.ts`: 更新为使用 realStockApi
- `src/App.tsx`: 更新为使用 realStockApi

---

## V1.4 更新 - 搜索功能与交互优化

### 新增功能
1. **股票搜索**
   - 顶部搜索框支持代码/名称搜索
   - 实时显示搜索结果下拉列表
   - 显示股票名称、代码、价格、涨跌幅
   - 支持键盘操作（回车选择、ESC关闭）
   - 点击搜索结果自动跳转到分析面板

2. **热点板块增强**
   - 点击板块右侧详情实时切换
   - 即将爆发板块带预测理由标签
   - 推荐股票可点击跳转至分析面板
   - 新闻点击支持跳转

3. **分析面板优化**
   - 股票信息头部显示建议买入价位
   - K线颜色改为白色涨、黑色跌
   - 修复点击形态图表空白问题

### 文件更新
- `src/components/layout/Header.tsx`: 新增搜索组件
- `src/components/layout/MainLayout.tsx`: 集成搜索功能
- `src/components/hotspots/HotSectors.tsx`: 增强交互功能
- `src/components/charts/CandlestickChart.tsx`: 修复形态绘制
- `src/App.tsx`: 集成搜索逻辑

---

## V1.3 更新 - 阿尔布鲁克斯方法论集成

### 核心改进
1. **摆动点计算**
   - 采用 Al Brooks 的 3-5 根K线确认法
   - 相比传统的 fractal 方法更加稳定
   - 摆动点分为 1-3 级强度

2. **趋势分析**
   - 基于 Higher Highs / Higher Lows（上升趋势）
   - 或 Lower Highs / Lower Lows（下降趋势）
   - 计算趋势斜率和持续时间

3. **形态识别优化**
   - 双顶/双底：正确标记 M/W 形态，颈线作为突破点
   - 头肩顶/底：标记头部、肩部、颈线，计算测量目标
   - 楔形：识别三推楔形和收敛楔形
   - 旗形：基于斐波那契 50%-61.8% 回调位

4. **交易信号质量**
   - 结合趋势方向、支撑阻力、形态确认
   - 只生成高概率 setups
   - 提供清晰的入场区间、止损、目标

### 算法文件更新
- `src/utils/priceAction.ts`: 重命名为 `AlBrooksPriceActionAnalyzer` 类
- 完整实现 Al Brooks 价格行为方法论
- `src/hooks/useStockData.ts`: 更新为使用新分析器

---

## 待开发功能 (V1.3+)

- [ ] 交易计划功能
- [ ] 历史复盘功能
- [ ] 策略回测功能
- [ ] 更多数据源接入 (新浪财经、腾讯财经)

---

## Apify-Agent 集成 (已完善)

**状态**: ✅ 已完成并修复浏览器兼容性问题

**已完成**:
- ✅ `src/services/enhancedApifyStockApi.ts` - 增强版股票数据服务 (带缓存/降级)
- ✅ `src/components/apify/ApifyTestPanel.tsx` - 集成测试面板
- ✅ `vite.config.ts` - 添加 node-polyfills 配置
- ✅ 数据缓存层 (Memory Cache + TTL)
- ✅ 请求队列和限流 (Rate Limiter)
- ✅ 自动降级机制 (Token无效/请求失败 → 模拟数据)
- ✅ 浏览器兼容性修复 (vite-plugin-node-polyfills)

**配置说明**:
```bash
# 安装 polyfills 依赖 (已完成)
npm install --save-dev vite-plugin-node-polyfills

# vite.config.ts 已配置:
# - crypto, stream, events, util, buffer polyfills
# - global, Buffer, process globals
```

**使用方法**:
1. 配置环境变量: `VITE_APIFY_TOKEN=your_token`
2. 访问测试页面: 侧边栏 → 开发工具 → API测试
3. 导入服务: `import { enhancedApifyStockApi } from './services/enhancedApifyStockApi'`

**API测试面板功能**:
- 检测 Token 配置状态
- 测试股票数据、K线、板块、搜索、新闻接口
- 显示请求耗时和响应数据
- 一键清除缓存
- 自动使用降级数据

---

## 运行验证

**构建状态**: ✅ 成功

```bash
cd /Users/zhanghongyuan/priceaction-pro
npm run dev
# 或
npm run build && npx serve dist -l 3009
```

**访问地址**: http://localhost:3009/

**功能验证**:
- ✅ 分析面板 - K线图表 + 形态识别
- ✅ 股票搜索 - 顶部搜索框实时搜索
- ✅ 自选股管理
- ✅ 热点板块 - 板块切换、即将爆发预警
- ✅ API测试面板 (侧边栏 → 开发工具)

---

## 恢复开发指南

当你想继续这个项目时，告诉我：

> "请继续开发 PriceAction Pro 项目，项目文档在 `/Users/zhanghongyuan/priceaction-pro/PROJECT_PROGRESS.md`，我想要实现 [具体功能]"

或者直接告诉我项目路径和需求：

> "继续开发 `/Users/zhanghongyuan/priceaction-pro`，我想要 [需求描述]"