// 股票基础信息
export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  turnover: number;
  marketCap?: number;
}

// K线数据
export interface Candle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 时间框架
export type TimeFrame = '1m' | '5m' | '15m' | '30m' | '60m' | '1d' | '1w' | '1M';

// 趋势类型
export type TrendType = 'uptrend' | 'downtrend' | 'sideways';

// 趋势强度
export interface TrendStrength {
  type: TrendType;
  strength: number; // 0-100
  rating: number; // 1-5
}

// 支撑阻力位
export interface SupportResistance {
  price: number;
  type: 'support' | 'resistance';
  strength: number; // 1-5
  touches: number;
}

// K线形态
export type PatternType =
  | 'pin_bar_bullish'
  | 'pin_bar_bearish'
  | 'engulfing_bullish'
  | 'engulfing_bearish'
  | 'inside_bar'
  | 'doji'
  | 'hammer'
  | 'shooting_star'
  | 'morning_star'
  | 'evening_star'
  | 'three_white_soldiers'
  | 'three_black_crows';

// 图表形态
export type ChartPatternType =
  | 'double_top'
  | 'double_bottom'
  | 'head_shoulders_top'
  | 'head_shoulders_bottom'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'flag'
  | 'wedge'
  | 'rising_wedge'
  | 'falling_wedge'
  | 'channel_up'
  | 'channel_down'
  | 'three_push_wedge'; // 三推楔形

// 形态位置信息（用于图表高亮）
export interface PatternLocation {
  startIndex: number;      // 形态开始位置
  endIndex: number;        // 形态结束位置
  startTime: string | number;
  endTime: string | number;
  points: PatternPoint[];  // 形态关键点
}

// 形态关键点
export interface PatternPoint {
  time: string | number;
  price: number;
  type: 'peak' | 'valley' | 'entry' | 'exit' | 'neckline' | 'trendline';
  label?: string;
}

// 形态识别结果
export interface PatternResult {
  type: PatternType | ChartPatternType;
  name: string;
  confidence: number; // 0-100
  direction: 'bullish' | 'bearish' | 'neutral';
  startPrice?: number;
  endPrice?: number;
  location?: PatternLocation;  // 新增：形态在图表上的位置
}

// 价格行为分析结果
export interface PriceActionAnalysis {
  trend: TrendStrength;
  patterns: PatternResult[];
  supportResistance: SupportResistance[];
  signals: Signal[];
  recommendation: TradeRecommendation;
}

// 交易信号
export interface Signal {
  type: 'buy' | 'sell' | 'hold';
  reason: string;
  strength: number; // 1-5
  price?: number;
}

// 交易建议
export interface TradeRecommendation {
  action: 'buy' | 'sell' | 'hold' | 'wait';
  entryPrice?: {
    min: number;
    max: number;
  };
  stopLoss?: number;
  targets?: number[];
  riskRewardRatio?: number;
  reasons: string[];
  warnings: string[];
}

// 自选股
export interface WatchlistItem extends Stock {
  addedAt: string;
  notes?: string;
  signalStrength: number; // 1-5
  recommendation: 'buy' | 'sell' | 'hold';
}

// 板块信息
export interface Sector {
  code: string;
  name: string;
  heatIndex: number; // 0-100
  change: number;
  changePercent: number;
  leadingStocks: Stock[];
  pattern?: string;
}

// 新闻
export interface News {
  id: string;
  title: string;
  summary: string;
  source: string;
  url?: string;
  publishedAt: string;
  relatedStocks: string[];
  relatedSectors: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

// 交易计划
export interface TradePlan {
  id: string;
  stockSymbol: string;
  stockName: string;
  createdAt: string;
  timeFrame: TimeFrame;
  reasons: string[];
  risks: string[];
  entryPrice: { min: number; max: number };
  stopLoss: number;
  targets: number[];
  positionSize?: number;
  status: 'pending' | 'executed' | 'cancelled';
}

// ==================== 图表绘制工具类型 ====================

// 图表绘制工具类型
export type DrawingTool =
  | 'cursor'        // 默认光标
  | 'trendline'     // 趋势线
  | 'horizontal'    // 水平线
  | 'ray'           // 射线
  | 'channel'       // 通道线
  | 'fibonacci'     // 斐波那契回撤
  | 'rectangle'     // 矩形
  | 'text';         // 文字标注

// 图表绘制对象
export interface Drawing {
  id: string;
  type: DrawingTool;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}

// 绘制点
export interface DrawingPoint {
  time: number | string;
  price: number;
}

// 图表高亮显示的形态标注
export interface HighlightedPattern {
  pattern: PatternResult;
  visible: boolean;
  style: {
    color: string;
    lineWidth: number;
    fillColor?: string;
    opacity?: number;
  };
}
