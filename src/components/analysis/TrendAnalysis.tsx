import { useState } from 'react';
import type { PriceActionAnalysis, SupportResistance, PatternResult, Signal, TradeRecommendation } from '../../types';
import { formatPrice, generateStarRating } from '../../utils/priceAction';
import './TrendAnalysis.css';

interface TrendAnalysisProps {
  analysis: PriceActionAnalysis | null;
  onPatternClick?: (pattern: PatternResult) => void;
  highlightedPattern?: PatternResult | null;
}

export function TrendAnalysis({ analysis, onPatternClick, highlightedPattern }: TrendAnalysisProps) {

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-gray-500 text-sm">加载分析数据...</div>
      </div>
    );
  }

  const { trend, patterns, supportResistance, signals, recommendation } = analysis;

  const trendText = {
    uptrend: '强势上涨',
    downtrend: '弱势下跌',
    sideways: '横盘震荡',
  };

  const handlePatternClick = (pattern: PatternResult) => {
    if (onPatternClick) {
      onPatternClick(pattern);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 趋势分析 */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-2">📊 当前趋势</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-semibold ${
              trend.type === 'uptrend' ? 'text-black' :
              trend.type === 'downtrend' ? 'text-gray-500' : 'text-gray-500'
            }`}>
              {trendText[trend.type]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">趋势强度:</span>
            <StarRating rating={trend.rating} />
            <span className="text-sm font-medium text-gray-700">({trend.strength.toFixed(0)}%)</span>
          </div>
        </div>
      </div>

      {/* 关键形态识别 */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-3">🔍 关键形态识别</h3>
        <PatternList
          patterns={patterns}
          onPatternClick={handlePatternClick}
          highlightedPattern={highlightedPattern}
        />
      </div>

      {/* 支撑阻力位 */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-3">📍 支撑阻力位</h3>
        <SupportResistanceList levels={supportResistance} />
      </div>

      {/* 交易信号 */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-500 mb-3">⚡ 交易信号</h3>
        <SignalList signals={signals} />
      </div>

      {/* 买卖建议 */}
      <div className="p-4 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-500 mb-3">💡 买卖建议</h3>
        <RecommendationCard recommendation={recommendation} />
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const { filled, empty } = generateStarRating(rating);
  return (
    <span className="flex">
      {Array(filled).fill(0).map((_, i) => (
        <span key={`filled-${i}`} className="text-yellow-400">★</span>
      ))}
      {Array(empty).fill(0).map((_, i) => (
        <span key={`empty-${i}`} className="text-gray-300">★</span>
      ))}
    </span>
  );
}

interface PatternListProps {
  patterns: PatternResult[];
  onPatternClick?: (pattern: PatternResult) => void;
  highlightedPattern?: PatternResult | null;
}

function PatternList({ patterns, onPatternClick, highlightedPattern }: PatternListProps) {
  const [hoveredPattern, setHoveredPattern] = useState<string | null>(null);

  if (patterns.length === 0) {
    return <div className="text-sm text-gray-400">暂无明显形态</div>;
  }

  // 分类显示
  const kLinePatterns = patterns.filter(p =>
    ['pin_bar_bullish', 'pin_bar_bearish', 'engulfing_bullish', 'engulfing_bearish',
     'inside_bar', 'doji', 'morning_star', 'evening_star',
     'three_white_soldiers', 'three_black_crows'].includes(p.type)
  );

  const chartPatterns = patterns.filter(p =>
    ['double_top', 'double_bottom', 'head_shoulders_top', 'head_shoulders_bottom',
     'ascending_triangle', 'descending_triangle', 'symmetrical_triangle', 'flag',
     'wedge', 'rising_wedge', 'falling_wedge', 'channel_up', 'channel_down', 'three_push_wedge'].includes(p.type)
  );

  return (
    <div className="space-y-3">
      {kLinePatterns.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-2">K线形态</div>
          <ul className="space-y-1.5">
            {kLinePatterns.map((pattern, index) => (
              <PatternItem
                key={`k-${index}`}
                pattern={pattern}
                onClick={() => onPatternClick?.(pattern)}
                isHighlighted={highlightedPattern?.type === pattern.type}
                isHovered={hoveredPattern === pattern.type}
                onHover={() => setHoveredPattern(pattern.type)}
                onLeave={() => setHoveredPattern(null)}
              />
            ))}
          </ul>
        </div>
      )}

      {chartPatterns.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-2">图表形态</div>
          <ul className="space-y-1.5">
            {chartPatterns.map((pattern, index) => (
              <PatternItem
                key={`c-${index}`}
                pattern={pattern}
                onClick={() => onPatternClick?.(pattern)}
                isHighlighted={highlightedPattern?.type === pattern.type}
                isHovered={hoveredPattern === pattern.type}
                onHover={() => setHoveredPattern(pattern.type)}
                onLeave={() => setHoveredPattern(null)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface PatternItemProps {
  pattern: PatternResult;
  onClick: () => void;
  isHighlighted: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

function PatternItem({ pattern, onClick, isHighlighted, isHovered, onHover, onLeave }: PatternItemProps) {
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      default: return '➡️';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-black';
    if (confidence >= 60) return 'text-gray-600';
    return 'text-gray-400';
  };

  const isClickable = pattern.location && pattern.location.points.length > 0;

  return (
    <li
      className={`pattern-item ${isClickable ? 'clickable' : ''} ${isHighlighted ? 'highlighted' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={isClickable ? onClick : undefined}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      title={isClickable ? '点击在图表中高亮显示此形态' : ''}
    >
      <div className="pattern-content">
        <div className="flex items-center gap-2">
          <span>{getDirectionIcon(pattern.direction)}</span>
          <span className={`w-2 h-2 rounded-full ${
            pattern.direction === 'bullish' ? 'bg-black' :
            pattern.direction === 'bearish' ? 'bg-gray-400' : 'bg-gray-400'
          }`} />
          <span className="text-gray-700">{pattern.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${getConfidenceColor(pattern.confidence)}`}>
            置信度 {pattern.confidence}%
          </span>
          {isClickable && (
            <span className="view-icon">👁</span>
          )}
        </div>
      </div>
    </li>
  );
}

function SupportResistanceList({ levels }: { levels: SupportResistance[] }) {
  if (levels.length === 0) {
    return <div className="text-sm text-gray-400">暂无数据</div>;
  }

  const topLevels = levels.slice(0, 5);

  return (
    <ul className="space-y-1.5">
      {topLevels.map((level, index) => (
        <li key={index} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              level.type === 'resistance' ? 'bg-black' : 'bg-gray-400'
            }`} />
            <span className="text-gray-600">
              {level.type === 'resistance' ? '阻力' : '支撑'}
            </span>
          </div>
          <span className="font-medium text-gray-900">{formatPrice(level.price)}</span>
          <span className="text-xs text-gray-400">触及 {level.touches} 次</span>
        </li>
      ))}
    </ul>
  );
}

function SignalList({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return <div className="text-sm text-gray-400">暂无明确信号</div>;
  }

  return (
    <ul className="space-y-2">
      {signals.map((signal, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-medium ${
            signal.type === 'buy' ? 'bg-black text-white' :
            signal.type === 'sell' ? 'bg-gray-200 text-gray-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {signal.type === 'buy' ? '买' : signal.type === 'sell' ? '卖' : '观'}
          </span>
          <span className="text-gray-700 flex-1">{signal.reason}</span>
          <StarRating rating={signal.strength} />
        </li>
      ))}
    </ul>
  );
}

function RecommendationCard({ recommendation }: { recommendation: TradeRecommendation }) {
  const actionColors = {
    buy: 'bg-black text-white',
    sell: 'bg-gray-400 text-white',
    hold: 'bg-gray-500 text-white',
    wait: 'bg-gray-300 text-gray-800',
  };

  const actionLabels = {
    buy: '建议买入',
    sell: '建议卖出',
    hold: '持有观望',
    wait: '等待时机',
  };

  return (
    <div className="space-y-3">
      {/* 操作建议 */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${actionColors[recommendation.action]}`}>
          {actionLabels[recommendation.action]}
        </span>
        {recommendation.riskRewardRatio && (
          <span className="text-sm text-gray-500">
            风险收益比 1:{recommendation.riskRewardRatio.toFixed(1)}
          </span>
        )}
      </div>

      {/* 入场/止损/目标 */}
      {recommendation.entryPrice && (
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-white rounded-lg p-2 border border-gray-200">
            <div className="text-gray-500 text-xs mb-1">入场价</div>
            <div className="font-medium text-gray-900">
              {formatPrice(recommendation.entryPrice.min)} - {formatPrice(recommendation.entryPrice.max)}
            </div>
          </div>
          {recommendation.stopLoss && (
            <div className="bg-white rounded-lg p-2 border border-gray-200">
              <div className="text-gray-500 text-xs mb-1">止损价</div>
              <div className="font-medium text-gray-600">{formatPrice(recommendation.stopLoss)}</div>
            </div>
          )}
          {recommendation.targets && recommendation.targets.length > 0 && (
            <div className="bg-white rounded-lg p-2 border border-gray-200">
              <div className="text-gray-500 text-xs mb-1">目标价</div>
              <div className="font-medium text-black">
                {recommendation.targets.map((t) => formatPrice(t)).join(' | ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 理由 */}
      {recommendation.reasons.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">做多理由:</div>
          <ul className="text-sm text-gray-700 space-y-0.5">
            {recommendation.reasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-gray-400">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 风险提示 */}
      {recommendation.warnings.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-2">
          <div className="text-xs text-yellow-700 mb-1">⚠️ 风险提示:</div>
          <ul className="text-sm text-yellow-800 space-y-0.5">
            {recommendation.warnings.slice(0, 2).map((warning, i) => (
              <li key={i} className="flex items-start gap-1">
                <span>•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
