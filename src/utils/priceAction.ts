import { Candle, TrendStrength, SupportResistance, PatternResult, Signal, TradeRecommendation, PriceActionAnalysis, PatternLocation, PatternPoint } from '../types';

/**
 * 阿尔布鲁克斯价格行为分析器
 *
 * 核心理念：
 * 1. 市场始终处于趋势或交易区间中
 * 2. 每根K线都在讲述市场故事（开盘、收盘、高低点的关系）
 * 3. 支撑阻力基于前期的摆动高低点
 * 4. 形态是价格的重复模式，反映多空力量对比
 * 5. 入场需要确认信号，止损设于关键位之外
 */
export class AlBrooksPriceActionAnalyzer {
  private candles: Candle[];
  private swingHighs: Array<{ index: number; price: number; time: string | number; strength: number }> = [];
  private swingLows: Array<{ index: number; price: number; time: string | number; strength: number }> = [];

  constructor(candles: Candle[]) {
    this.candles = candles;
    this.calculateSwings();
  }

  /**
   * 计算摆动高低点 - 阿尔布鲁克斯方法
   * 使用 3-5 根K线确认摆动点
   */
  private calculateSwings() {
    this.swingHighs = [];
    this.swingLows = [];

    const lookback = 3; // 阿尔布鲁克斯通常使用3根K线确认

    for (let i = lookback; i < this.candles.length - lookback; i++) {
      const candle = this.candles[i];

      // 检查是否为摆动高点
      let isSwingHigh = true;
      let highStrength = 0;
      for (let j = 1; j <= lookback; j++) {
        if (this.candles[i - j].high >= candle.high || this.candles[i + j].high >= candle.high) {
          isSwingHigh = false;
          break;
        }
        // 计算强度：周围K线距离当前高点的距离
        highStrength += (candle.high - this.candles[i - j].high) / candle.high;
        highStrength += (candle.high - this.candles[i + j].high) / candle.high;
      }

      if (isSwingHigh) {
        this.swingHighs.push({
          index: i,
          price: candle.high,
          time: candle.time,
          strength: Math.min(highStrength * 100, 100)
        });
      }

      // 检查是否为摆动低点
      let isSwingLow = true;
      let lowStrength = 0;
      for (let j = 1; j <= lookback; j++) {
        if (this.candles[i - j].low <= candle.low || this.candles[i + j].low <= candle.low) {
          isSwingLow = false;
          break;
        }
        lowStrength += (this.candles[i - j].low - candle.low) / candle.low;
        lowStrength += (this.candles[i + j].low - candle.low) / candle.low;
      }

      if (isSwingLow) {
        this.swingLows.push({
          index: i,
          price: candle.low,
          time: candle.time,
          strength: Math.min(lowStrength * 100, 100)
        });
      }
    }
  }

  /**
   * 分析趋势 - 阿尔布鲁克斯方法
   * 基于HH/HL（上升趋势）或LH/LL（下降趋势）
   */
  analyzeTrend(): TrendStrength {
    if (this.candles.length < 20) {
      return { type: 'sideways', strength: 0, rating: 1 };
    }

    const recentHighs = this.swingHighs.slice(-5);
    const recentLows = this.swingLows.slice(-5);

    if (recentHighs.length < 2 || recentLows.length < 2) {
      return { type: 'sideways', strength: 30, rating: 2 };
    }

    // 检查是否形成更高的高点和更高的低点（上升趋势）
    const higherHighs = this.isSequenceHigher(recentHighs.map(h => h.price));
    const higherLows = this.isSequenceHigher(recentLows.map(l => l.price));

    // 检查是否形成更低的高点和更低的低点（下降趋势）
    const lowerHighs = this.isSequenceLower(recentHighs.map(h => h.price));
    const lowerLows = this.isSequenceLower(recentLows.map(l => l.price));

    let type: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';
    let strength = 50;
    let rating = 2;

    if (higherHighs && higherLows) {
      type = 'uptrend';
      strength = 70 + Math.min(recentHighs.length * 5, 25);
      rating = Math.min(Math.ceil(strength / 20), 5);
    } else if (lowerHighs && lowerLows) {
      type = 'downtrend';
      strength = 70 + Math.min(recentLows.length * 5, 25);
      rating = Math.min(Math.ceil(strength / 20), 5);
    } else {
      // 震荡市
      strength = 40;
      rating = 2;
    }

    return { type, strength, rating };
  }

  private isSequenceHigher(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i] <= values[i - 1]) return false;
    }
    return values.length >= 2;
  }

  private isSequenceLower(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i] >= values[i - 1]) return false;
    }
    return values.length >= 2;
  }

  /**
   * 识别支撑阻力位 - 基于摆动点
   * 阿尔布鲁克斯：支撑阻力是前期被多次测试的价格区域
   */
  findSupportResistance(): SupportResistance[] {
    const levels: SupportResistance[] = [];
    const currentPrice = this.candles[this.candles.length - 1].close;

    // 合并相近的摆动高点作为阻力位
    const resistanceMap = new Map<number, { price: number; touches: number; strength: number }>();
    this.swingHighs.forEach(high => {
      let merged = false;
      for (const [, value] of resistanceMap.entries()) {
        if (Math.abs(high.price - value.price) / value.price < 0.015) { // 1.5%容差
          value.touches++;
          value.strength = Math.max(value.strength, high.strength);
          value.price = (value.price * value.touches + high.price) / (value.touches + 1);
          merged = true;
          break;
        }
      }
      if (!merged) {
        resistanceMap.set(high.price, { price: high.price, touches: 1, strength: high.strength });
      }
    });

    // 合并相近的摆动低点作为支撑位
    const supportMap = new Map<number, { price: number; touches: number; strength: number }>();
    this.swingLows.forEach(low => {
      let merged = false;
      for (const [, value] of supportMap.entries()) {
        if (Math.abs(low.price - value.price) / value.price < 0.015) {
          value.touches++;
          value.strength = Math.max(value.strength, low.strength);
          value.price = (value.price * value.touches + low.price) / (value.touches + 1);
          merged = true;
          break;
        }
      }
      if (!merged) {
        supportMap.set(low.price, { price: low.price, touches: 1, strength: low.strength });
      }
    });

    // 转换为支撑阻力数组
    resistanceMap.forEach((value) => {
      if (value.price > currentPrice) {
        levels.push({
          price: value.price,
          type: 'resistance',
          strength: Math.min(value.touches + 1, 5),
          touches: value.touches
        });
      }
    });

    supportMap.forEach((value) => {
      if (value.price < currentPrice) {
        levels.push({
          price: value.price,
          type: 'support',
          strength: Math.min(value.touches + 1, 5),
          touches: value.touches
        });
      }
    });

    // 按强度和触及次数排序
    return levels
      .sort((a, b) => b.touches - a.touches || b.strength - a.strength)
      .slice(0, 8);
  }

  /**
   * 识别形态 - 阿尔布鲁克斯方法
   */
  identifyPatterns(): PatternResult[] {
    const patterns: PatternResult[] = [];

    if (this.candles.length < 10) return patterns;

    // 1. 双顶/双底（M头/W底）
    const doublePattern = this.identifyDoublePattern();
    if (doublePattern) patterns.push(doublePattern);

    // 2. 头肩顶/底
    const headShoulders = this.identifyHeadShoulders();
    if (headShoulders) patterns.push(headShoulders);

    // 3. 旗形/通道
    const flag = this.identifyFlag();
    if (flag) patterns.push(flag);

    // 4. 楔形（收敛形态）
    const wedge = this.identifyWedge();
    if (wedge) patterns.push(wedge);

    // 5. 三角形
    const triangle = this.identifyTriangle();
    if (triangle) patterns.push(triangle);

    // 6. K线形态
    patterns.push(...this.identifyCandlestickPatterns());

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 识别双顶/双底 - 阿尔布鲁克斯方法
   * 关键：两个相近的高点/低点，中间有回调/反弹
   */
  private identifyDoublePattern(): PatternResult | null {
    const recentHighs = this.swingHighs.slice(-4);
    const recentLows = this.swingLows.slice(-4);

    // 双顶 - 两个相近的高点
    if (recentHighs.length >= 2) {
      for (let i = 0; i < recentHighs.length - 1; i++) {
        for (let j = i + 1; j < recentHighs.length; j++) {
          const high1 = recentHighs[i];
          const high2 = recentHighs[j];
          const priceDiff = Math.abs(high1.price - high2.price) / high1.price;

          // 两个高点价格相近（差异小于2%）
          if (priceDiff < 0.02) {
            // 检查中间是否有足够的回调
            const betweenLows = this.swingLows.filter(
              low => low.index > high1.index && low.index < high2.index
            );

            if (betweenLows.length > 0) {
              const lowestBetween = Math.min(...betweenLows.map(l => l.price));
              const pullbackRatio = (high1.price - lowestBetween) / high1.price;

              // 回调至少2%
              if (pullbackRatio > 0.02) {
                return {
                  type: 'double_top',
                  name: '双顶形态 (M头)',
                  confidence: Math.round(85 - priceDiff * 2000),
                  direction: 'bearish',
                  location: this.createPatternLocation(high1.index, high2.index, [
                    { time: high1.time, price: high1.price, type: 'peak', label: '左顶' },
                    { time: high2.time, price: high2.price, type: 'peak', label: '右顶' },
                    {
                      time: this.candles[Math.floor((high1.index + high2.index) / 2)].time,
                      price: lowestBetween,
                      type: 'neckline'
                    },
                  ]),
                };
              }
            }
          }
        }
      }
    }

    // 双底 - 两个相近的低点
    if (recentLows.length >= 2) {
      for (let i = 0; i < recentLows.length - 1; i++) {
        for (let j = i + 1; j < recentLows.length; j++) {
          const low1 = recentLows[i];
          const low2 = recentLows[j];
          const priceDiff = Math.abs(low1.price - low2.price) / low1.price;

          if (priceDiff < 0.02) {
            const betweenHighs = this.swingHighs.filter(
              high => high.index > low1.index && high.index < low2.index
            );

            if (betweenHighs.length > 0) {
              const highestBetween = Math.max(...betweenHighs.map(h => h.price));
              const bounceRatio = (highestBetween - low1.price) / low1.price;

              if (bounceRatio > 0.02) {
                return {
                  type: 'double_bottom',
                  name: '双底形态 (W底)',
                  confidence: Math.round(85 - priceDiff * 2000),
                  direction: 'bullish',
                  location: this.createPatternLocation(low1.index, low2.index, [
                    { time: low1.time, price: low1.price, type: 'valley', label: '左底' },
                    { time: low2.time, price: low2.price, type: 'valley', label: '右底' },
                    {
                      time: this.candles[Math.floor((low1.index + low2.index) / 2)].time,
                      price: highestBetween,
                      type: 'neckline'
                    },
                  ]),
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * 识别头肩顶/底 - 阿尔布鲁克斯方法
   */
  private identifyHeadShoulders(): PatternResult | null {
    const recentHighs = this.swingHighs.slice(-5);
    const recentLows = this.swingLows.slice(-5);

    // 头肩顶 - 三个高点，中间最高
    if (recentHighs.length >= 3) {
      for (let i = 0; i <= recentHighs.length - 3; i++) {
        const left = recentHighs[i];
        const head = recentHighs[i + 1];
        const right = recentHighs[i + 2];

        // 头部必须明显高于两肩
        const headAboveLeft = (head.price - left.price) / left.price;
        const headAboveRight = (head.price - right.price) / right.price;

        if (headAboveLeft > 0.01 && headAboveRight > 0.01) {
          // 两肩高度相近（差异小于3%）
          const shoulderDiff = Math.abs(left.price - right.price) / left.price;

          if (shoulderDiff < 0.03) {
            return {
              type: 'head_shoulders_top',
              name: '头肩顶',
              confidence: Math.round(88 - shoulderDiff * 1000),
              direction: 'bearish',
              location: this.createPatternLocation(left.index, right.index, [
                { time: left.time, price: left.price, type: 'peak', label: '左肩' },
                { time: head.time, price: head.price, type: 'peak', label: '头部' },
                { time: right.time, price: right.price, type: 'peak', label: '右肩' },
                { time: left.time, price: left.price, type: 'neckline' },
                { time: right.time, price: right.price, type: 'neckline' },
              ]),
            };
          }
        }
      }
    }

    // 头肩底 - 三个低点，中间最低
    if (recentLows.length >= 3) {
      for (let i = 0; i <= recentLows.length - 3; i++) {
        const left = recentLows[i];
        const head = recentLows[i + 1];
        const right = recentLows[i + 2];

        const headBelowLeft = (left.price - head.price) / left.price;
        const headBelowRight = (right.price - head.price) / right.price;

        if (headBelowLeft > 0.01 && headBelowRight > 0.01) {
          const shoulderDiff = Math.abs(left.price - right.price) / left.price;

          if (shoulderDiff < 0.03) {
            return {
              type: 'head_shoulders_bottom',
              name: '头肩底',
              confidence: Math.round(88 - shoulderDiff * 1000),
              direction: 'bullish',
              location: this.createPatternLocation(left.index, right.index, [
                { time: left.time, price: left.price, type: 'valley', label: '左肩' },
                { time: head.time, price: head.price, type: 'valley', label: '头部' },
                { time: right.time, price: right.price, type: 'valley', label: '右肩' },
                { time: left.time, price: left.price, type: 'neckline' },
                { time: right.time, price: right.price, type: 'neckline' },
              ]),
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * 识别旗形/通道 - 阿尔布鲁克斯方法
   */
  private identifyFlag(): PatternResult | null {
    const len = this.candles.length;
    const recentCandles = this.candles.slice(-20);

    // 需要至少20根K线
    if (recentCandles.length < 20) return null;

    // 计算趋势
    const firstHalf = recentCandles.slice(0, 10);
    const secondHalf = recentCandles.slice(10);

    const firstTrend = this.calculateTrendSlope(firstHalf);
    const secondTrend = this.calculateTrendSlope(secondHalf);

    // 旗形：强烈的趋势后跟随盘整通道
    const isStrongTrend = Math.abs(firstTrend) > 0.005; // 0.5%斜率
    const isConsolidation = Math.abs(secondTrend) < Math.abs(firstTrend) * 0.3;

    if (isStrongTrend && isConsolidation) {
      const direction = firstTrend > 0 ? 'bullish' : 'bearish';
      const name = firstTrend > 0 ? '看涨旗形' : '看跌旗形';

      return {
        type: 'flag',
        name,
        confidence: 75,
        direction,
        location: this.createPatternLocation(len - 20, len - 1, [
          { time: recentCandles[0].time, price: recentCandles[0].close, type: 'entry' },
          { time: recentCandles[9].time, price: recentCandles[9].high, type: 'peak' },
          { time: recentCandles[recentCandles.length - 1].time, price: recentCandles[recentCandles.length - 1].close, type: 'exit' },
        ]),
      };
    }

    return null;
  }

  /**
   * 识别楔形 - 收敛形态
   */
  private identifyWedge(): PatternResult | null {
    const recentHighs = this.swingHighs.slice(-4);
    const recentLows = this.swingLows.slice(-4);

    if (recentHighs.length < 3 || recentLows.length < 3) return null;

    // 计算趋势线斜率
    const highSlope = this.calculateSlope(recentHighs.map(h => ({ x: h.index, y: h.price })));
    const lowSlope = this.calculateSlope(recentLows.map(l => ({ x: l.index, y: l.price })));

    // 上升楔形：高点斜率 < 低点斜率（收敛）
    if (highSlope > 0 && lowSlope > 0 && highSlope < lowSlope) {
      return {
        type: 'rising_wedge',
        name: '上升楔形',
        confidence: 70,
        direction: 'bearish',
        location: this.createPatternLocation(
          recentHighs[0].index,
          recentHighs[recentHighs.length - 1].index,
          [
            ...recentHighs.map(h => ({ time: h.time, price: h.price, type: 'peak' as const })),
            ...recentLows.map(l => ({ time: l.time, price: l.price, type: 'valley' as const })),
          ]
        ),
      };
    }

    // 下降楔形：高点斜率 < 低点斜率（收敛）
    if (highSlope < 0 && lowSlope < 0 && highSlope > lowSlope) {
      return {
        type: 'falling_wedge',
        name: '下降楔形',
        confidence: 70,
        direction: 'bullish',
        location: this.createPatternLocation(
          recentLows[0].index,
          recentLows[recentLows.length - 1].index,
          [
            ...recentHighs.map(h => ({ time: h.time, price: h.price, type: 'peak' as const })),
            ...recentLows.map(l => ({ time: l.time, price: l.price, type: 'valley' as const })),
          ]
        ),
      };
    }

    return null;
  }

  /**
   * 识别三角形
   */
  private identifyTriangle(): PatternResult | null {
    const recentHighs = this.swingHighs.slice(-4);
    const recentLows = this.swingLows.slice(-4);

    if (recentHighs.length < 3 || recentLows.length < 3) return null;

    const highSlope = this.calculateSlope(recentHighs.map(h => ({ x: h.index, y: h.price })));
    const lowSlope = this.calculateSlope(recentLows.map(l => ({ x: l.index, y: l.price })));

    // 上升三角形：水平阻力 + 上升支撑
    if (Math.abs(highSlope) < 0.001 && lowSlope > 0.002) {
      return {
        type: 'ascending_triangle',
        name: '上升三角形',
        confidence: 75,
        direction: 'bullish',
        location: this.createPatternLocation(
          recentHighs[0].index,
          recentLows[recentLows.length - 1].index,
          [
            ...recentHighs.map(h => ({ time: h.time, price: h.price, type: 'peak' as const })),
            ...recentLows.map(l => ({ time: l.time, price: l.price, type: 'valley' as const })),
          ]
        ),
      };
    }

    // 下降三角形：下降阻力 + 水平支撑
    if (highSlope < -0.002 && Math.abs(lowSlope) < 0.001) {
      return {
        type: 'descending_triangle',
        name: '下降三角形',
        confidence: 75,
        direction: 'bearish',
        location: this.createPatternLocation(
          recentLows[0].index,
          recentHighs[recentHighs.length - 1].index,
          [
            ...recentHighs.map(h => ({ time: h.time, price: h.price, type: 'peak' as const })),
            ...recentLows.map(l => ({ time: l.time, price: l.price, type: 'valley' as const })),
          ]
        ),
      };
    }

    // 对称三角形：两条收敛趋势线
    if (highSlope < -0.001 && lowSlope > 0.001) {
      return {
        type: 'symmetrical_triangle',
        name: '对称三角形',
        confidence: 70,
        direction: 'neutral',
        location: this.createPatternLocation(
          recentHighs[0].index,
          recentLows[recentLows.length - 1].index,
          [
            ...recentHighs.map(h => ({ time: h.time, price: h.price, type: 'peak' as const })),
            ...recentLows.map(l => ({ time: l.time, price: l.price, type: 'valley' as const })),
          ]
        ),
      };
    }

    return null;
  }

  /**
   * 识别K线形态 - 阿尔布鲁克斯方法
   */
  private identifyCandlestickPatterns(): PatternResult[] {
    const patterns: PatternResult[] = [];
    const len = this.candles.length;

    if (len < 3) return patterns;

    const last = this.candles[len - 1];
    const prev = this.candles[len - 2];

    const bodySize = Math.abs(last.close - last.open);
    const range = last.high - last.low;
    const upperWick = last.high - Math.max(last.open, last.close);
    const lowerWick = Math.min(last.open, last.close) - last.low;

    // 锤子线/上吊线 - 长下影线，小实体
    if (lowerWick > bodySize * 2 && range > 0) {
      const isBullish = last.close > last.open;
      patterns.push({
        type: isBullish ? 'pin_bar_bullish' : 'pin_bar_bearish',
        name: isBullish ? '锤子线（看涨）' : '上吊线（看跌）',
        confidence: Math.round(70 + (lowerWick / range) * 20),
        direction: isBullish ? 'bullish' : 'bearish',
        location: this.createPatternLocation(len - 1, len - 1, [
          { time: last.time, price: last.high, type: 'peak' },
          { time: last.time, price: last.low, type: 'valley' },
        ]),
      });
    }

    // 流星线 - 长上影线，小实体
    if (upperWick > bodySize * 2 && range > 0) {
      patterns.push({
        type: 'pin_bar_bearish',
        name: '流星线（看跌）',
        confidence: Math.round(70 + (upperWick / range) * 20),
        direction: 'bearish',
        location: this.createPatternLocation(len - 1, len - 1, [
          { time: last.time, price: last.high, type: 'peak' },
          { time: last.time, price: last.low, type: 'valley' },
        ]),
      });
    }

    // 吞没形态
    const prevBody = Math.abs(prev.close - prev.open);
    const currentBody = Math.abs(last.close - last.open);

    if (currentBody > prevBody * 1.5) {
      // 看涨吞没
      if (last.close > last.open && prev.close < prev.open &&
          last.open < prev.close && last.close > prev.open) {
        patterns.push({
          type: 'engulfing_bullish',
          name: '看涨吞没',
          confidence: 82,
          direction: 'bullish',
          location: this.createPatternLocation(len - 2, len - 1, [
            { time: prev.time, price: prev.open, type: 'entry' },
            { time: prev.time, price: prev.close, type: 'exit' },
            { time: last.time, price: last.open, type: 'entry' },
            { time: last.time, price: last.close, type: 'exit' },
          ]),
        });
      }
      // 看跌吞没
      if (last.close < last.open && prev.close > prev.open &&
          last.open > prev.close && last.close < prev.open) {
        patterns.push({
          type: 'engulfing_bearish',
          name: '看跌吞没',
          confidence: 82,
          direction: 'bearish',
          location: this.createPatternLocation(len - 2, len - 1, [
            { time: prev.time, price: prev.open, type: 'entry' },
            { time: prev.time, price: prev.close, type: 'exit' },
            { time: last.time, price: last.open, type: 'entry' },
            { time: last.time, price: last.close, type: 'exit' },
          ]),
        });
      }
    }

    // 十字星
    if (bodySize < range * 0.1 && range > 0) {
      patterns.push({
        type: 'doji',
        name: '十字星',
        confidence: 65,
        direction: 'neutral',
        location: this.createPatternLocation(len - 1, len - 1, [
          { time: last.time, price: (last.open + last.close) / 2, type: 'entry' },
        ]),
      });
    }

    return patterns;
  }

  /**
   * 生成交易信号 - 阿尔布鲁克斯方法
   */
  generateSignals(): Signal[] {
    const signals: Signal[] = [];
    const trend = this.analyzeTrend();
    const patterns = this.identifyPatterns();
    const supportResistance = this.findSupportResistance();
    const lastCandle = this.candles[this.candles.length - 1];
    const currentPrice = lastCandle.close;

    // 1. 趋势信号
    if (trend.type === 'uptrend' && trend.strength > 60) {
      signals.push({
        type: 'buy',
        reason: `上升趋势保持，强度 ${trend.strength.toFixed(0)}% - 回调至支撑位考虑做多`,
        strength: trend.rating,
      });
    } else if (trend.type === 'downtrend' && trend.strength > 60) {
      signals.push({
        type: 'sell',
        reason: `下降趋势明确，强度 ${trend.strength.toFixed(0)}% - 反弹至阻力位考虑做空`,
        strength: trend.rating,
      });
    }

    // 2. 形态突破信号
    patterns.forEach(pattern => {
      if (pattern.confidence >= 75) {
        if (pattern.direction === 'bullish') {
          signals.push({
            type: 'buy',
            reason: `${pattern.name}形态确认，突破后做多`,
            strength: Math.ceil(pattern.confidence / 20),
          });
        } else if (pattern.direction === 'bearish') {
          signals.push({
            type: 'sell',
            reason: `${pattern.name}形态确认，跌破后做空`,
            strength: Math.ceil(pattern.confidence / 20),
          });
        }
      }
    });

    // 3. 支撑阻力位信号
    supportResistance.forEach(level => {
      const distance = Math.abs(currentPrice - level.price) / currentPrice;

      if (distance < 0.015) { // 距离1.5%以内
        if (level.type === 'support') {
          signals.push({
            type: 'buy',
            reason: `接近强支撑位 ¥${level.price.toFixed(2)}（触及${level.touches}次）`,
            strength: Math.min(level.touches, 5),
            price: level.price,
          });
        } else {
          signals.push({
            type: 'sell',
            reason: `接近强阻力位 ¥${level.price.toFixed(2)}（触及${level.touches}次）`,
            strength: Math.min(level.touches, 5),
            price: level.price,
          });
        }
      }
    });

    return signals;
  }

  /**
   * 生成交易建议 - 阿尔布鲁克斯方法
   */
  generateRecommendation(): TradeRecommendation {
    const trend = this.analyzeTrend();
    const patterns = this.identifyPatterns();
    const supportResistance = this.findSupportResistance();
    const lastCandle = this.candles[this.candles.length - 1];
    const currentPrice = lastCandle.close;

    const reasons: string[] = [];
    const warnings: string[] = [];
    let action: 'buy' | 'sell' | 'hold' | 'wait' = 'wait';

    let entryPrice: { min: number; max: number } | undefined;
    let stopLoss: number | undefined;
    let targets: number[] = [];

    // 阿尔布鲁克斯：寻找高概率入场点
    const bullishPatterns = patterns.filter(p => p.direction === 'bullish' && p.confidence >= 75);
    const bearishPatterns = patterns.filter(p => p.direction === 'bearish' && p.confidence >= 75);

    // 寻找最近的支撑和阻力
    const nearestSupport = supportResistance
      .filter(s => s.type === 'support' && s.price < currentPrice)
      .sort((a, b) => b.price - a.price)[0];

    const nearestResistance = supportResistance
      .filter(s => s.type === 'resistance' && s.price > currentPrice)
      .sort((a, b) => a.price - b.price)[0];

    // 做多条件
    if (trend.type === 'uptrend' || bullishPatterns.length > 0) {
      if (bullishPatterns.length > 0) {
        action = 'buy';
        reasons.push(`看涨形态确认: ${bullishPatterns.map(p => p.name).join(', ')}`);
      } else if (trend.type === 'uptrend') {
        action = 'buy';
        reasons.push('上升趋势保持完好');
      }

      if (nearestSupport) {
        entryPrice = { min: nearestSupport.price, max: currentPrice };
        stopLoss = Math.min(nearestSupport.price * 0.99, currentPrice * 0.97);
        reasons.push(`支撑位: ¥${nearestSupport.price.toFixed(2)}`);
      } else {
        entryPrice = { min: currentPrice * 0.98, max: currentPrice };
        stopLoss = currentPrice * 0.95;
      }

      if (nearestResistance) {
        targets = [nearestResistance.price, nearestResistance.price * 1.03];
      } else {
        targets = [currentPrice * 1.05, currentPrice * 1.08];
      }
    }
    // 做空条件
    else if (trend.type === 'downtrend' || bearishPatterns.length > 0) {
      if (bearishPatterns.length > 0) {
        action = 'sell';
        warnings.push(`看跌形态确认: ${bearishPatterns.map(p => p.name).join(', ')}`);
      } else if (trend.type === 'downtrend') {
        action = 'sell';
        warnings.push('下降趋势中');
      }

      if (nearestResistance) {
        entryPrice = { min: currentPrice, max: nearestResistance.price };
        stopLoss = Math.max(nearestResistance.price * 1.01, currentPrice * 1.03);
        warnings.push(`阻力位: ¥${nearestResistance.price.toFixed(2)}`);
      } else {
        entryPrice = { min: currentPrice, max: currentPrice * 1.02 };
        stopLoss = currentPrice * 1.05;
      }

      if (nearestSupport) {
        targets = [nearestSupport.price, nearestSupport.price * 0.97];
      } else {
        targets = [currentPrice * 0.95, currentPrice * 0.92];
      }
    }

    // 计算风险收益比
    let riskRewardRatio: number | undefined;
    if (entryPrice && stopLoss && targets.length > 0) {
      const risk = Math.abs(entryPrice.max - stopLoss);
      const reward = Math.abs(targets[0] - entryPrice.min);
      if (risk > 0) {
        riskRewardRatio = reward / risk;
      }
    }

    return {
      action,
      entryPrice,
      stopLoss,
      targets,
      riskRewardRatio,
      reasons,
      warnings,
    };
  }

  /**
   * 完整分析
   */
  analyze(): PriceActionAnalysis {
    return {
      trend: this.analyzeTrend(),
      patterns: this.identifyPatterns(),
      supportResistance: this.findSupportResistance(),
      signals: this.generateSignals(),
      recommendation: this.generateRecommendation(),
    };
  }

  // 辅助方法
  private calculateTrendSlope(candles: Candle[]): number {
    if (candles.length < 2) return 0;
    const first = candles[0].close;
    const last = candles[candles.length - 1].close;
    return (last - first) / first;
  }

  private calculateSlope(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;

    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;

    return (n * sumXY - sumX * sumY) / denominator;
  }

  private createPatternLocation(
    startIndex: number,
    endIndex: number,
    points: PatternPoint[]
  ): PatternLocation {
    const startCandle = this.candles[startIndex];
    const endCandle = this.candles[endIndex];

    return {
      startIndex,
      endIndex,
      startTime: startCandle.time,
      endTime: endCandle.time,
      points,
    };
  }
}

// 导出辅助函数
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `¥${price.toFixed(0)}`;
  } else if (price >= 100) {
    return `¥${price.toFixed(1)}`;
  } else {
    return `¥${price.toFixed(2)}`;
  }
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function generateStarRating(rating: number): { filled: number; empty: number } {
  return {
    filled: Math.min(Math.max(rating, 0), 5),
    empty: Math.max(0, 5 - rating),
  };
}
