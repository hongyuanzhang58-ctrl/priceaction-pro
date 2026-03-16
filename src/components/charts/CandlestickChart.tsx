import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  Time,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import type { Candle, Drawing, DrawingTool, PatternResult, PatternPoint } from '../../types';
import { ChartDrawingTools } from './ChartDrawingTools';
import './CandlestickChart.css';

interface CandlestickChartProps {
  data: Candle[];
  height?: number;
  showVolume?: boolean;
  highlightedPattern?: PatternResult | null;
  onPatternHighlightClear?: () => void;
}

// 绘制中的线条类型
interface DrawingInProgress {
  tool: DrawingTool;
  startPoint: { time: number; price: number } | null;
  currentPoint: { time: number; price: number } | null;
}

export function CandlestickChart({
  data,
  height = 400,
  showVolume = true,
  highlightedPattern,
  onPatternHighlightClear,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const isDisposedRef = useRef(false);

  // 绘制工具状态
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // 绘制中的临时状态
  const drawingStateRef = useRef<DrawingInProgress>({
    tool: 'cursor',
    startPoint: null,
    currentPoint: null,
  });

  // 临时预览线
  const previewLineRef = useRef<ISeriesApi<'Line'> | null>(null);

  // 已完成的绘制线条引用
  const drawingLinesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const patternLinesRef = useRef<ISeriesApi<'Line'>[]>([]);

  // ===== 初始化图表 =====
  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    isDisposedRef.current = false;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: showVolume ? height + 80 : height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    chartRef.current = chart;

    // 添加K线系列
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ffffff',
      downColor: '#000000',
      borderDownColor: '#000000',
      borderUpColor: '#000000',
      wickDownColor: '#000000',
      wickUpColor: '#000000',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // 转换数据格式
    const chartData = data.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeries.setData(chartData);

    // 添加成交量
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#3b82f6',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
      });

      const volumeData = data.map((candle) => ({
        time: candle.time as Time,
        value: candle.volume,
        color: candle.close >= candle.open ? 'rgba(0, 0, 0, 0.5)' : 'rgba(128, 128, 128, 0.3)',
      }));

      volumeSeries.setData(volumeData);

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // 自适应 - 只执行一次，不自动调整
    chart.timeScale().fitContent();

    // 响应式
    const handleResize = () => {
      if (chartContainerRef.current && !isDisposedRef.current && chartRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      isDisposedRef.current = true;
      window.removeEventListener('resize', handleResize);
      try {
        if (chartRef.current) {
          chart.remove();
          chartRef.current = null;
        }
      } catch {
        // 忽略已销毁的错误
      }
    };
  }, [data, height, showVolume]);

  // ===== 绘制交互逻辑 =====
  useEffect(() => {
    const chart = chartRef.current;
    const candlestickSeries = candlestickSeriesRef.current;
    if (!chart || !candlestickSeries) return;

    // 鼠标按下 - 开始绘制
    const handleMouseDown = (param: MouseEventParams) => {
      if (activeTool === 'cursor' || !param.point || !param.time) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price === null) return;

      const time = param.time as number;

      // 开始新的绘制
      drawingStateRef.current = {
        tool: activeTool,
        startPoint: { time, price },
        currentPoint: { time, price },
      };
      setIsDrawing(true);

      // 创建预览线
      if (activeTool !== 'text') {
        createPreviewLine();
      }
    };

    // 鼠标移动 - 更新预览
    const handleMouseMove = (param: MouseEventParams) => {
      if (!isDrawing || !drawingStateRef.current.startPoint) return;
      if (!param.point || !param.time) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price === null) return;

      const time = param.time as number;
      drawingStateRef.current.currentPoint = { time, price };

      // 更新预览线
      updatePreviewLine();
    };

    // 鼠标松开 - 完成绘制
    const handleMouseUp = () => {
      if (!isDrawing || !drawingStateRef.current.startPoint) return;

      const { tool, startPoint, currentPoint } = drawingStateRef.current;

      // 只有当移动了一定距离才完成绘制
      if (currentPoint && (tool === 'horizontal' || thisPointMoved(startPoint, currentPoint))) {
        completeDrawing(tool, startPoint, currentPoint);
      }

      // 清理
      clearPreviewLine();
      drawingStateRef.current = { tool: 'cursor', startPoint: null, currentPoint: null };
      setIsDrawing(false);

      // 保持工具选中状态（TradingView 风格），而不是自动切回 cursor
      // setActiveTool('cursor');
    };

    // 点击事件（用于水平线和文字）
    const handleClick = (param: MouseEventParams) => {
      if (activeTool === 'cursor' || !param.point || !param.time) return;

      const price = candlestickSeries.coordinateToPrice(param.point.y);
      if (price === null) return;

      const time = param.time as number;

      if (activeTool === 'horizontal') {
        // 水平线：点击即放置
        addDrawing({
          id: `drawing-${Date.now()}`,
          type: 'horizontal',
          points: [{ time: data[0].time as number, price }, { time: data[data.length - 1].time as number, price }],
          color: '#3b82f6',
          lineWidth: 2,
          lineStyle: 'solid',
          visible: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else if (activeTool === 'text') {
        // 文字标注
        const text = prompt('请输入标注文字:', '');
        if (text) {
          addDrawing({
            id: `drawing-${Date.now()}`,
            type: 'text',
            points: [{ time, price }],
            color: '#3b82f6',
            lineWidth: 2,
            lineStyle: 'solid',
            visible: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    };

    chart.subscribeClick(handleClick);
    // 使用 subscribeCrosshairMove 来跟踪鼠标移动
    chart.subscribeCrosshairMove(handleMouseMove);

    // 使用 DOM 事件处理鼠标按下和松开
    const container = chartContainerRef.current;
    if (container) {
      container.addEventListener('mousedown', handleMouseDown as any);
      container.addEventListener('mouseup', handleMouseUp as any);
    }

    return () => {
      chart.unsubscribeClick(handleClick);
      chart.unsubscribeCrosshairMove(handleMouseMove);
      if (container) {
        container.removeEventListener('mousedown', handleMouseDown as any);
        container.removeEventListener('mouseup', handleMouseUp as any);
      }
    };
  }, [activeTool, data, isDrawing]);

  // 检查点是否移动了足够距离
  const thisPointMoved = (p1: { time: number; price: number }, p2: { time: number; price: number }) => {
    const timeDiff = Math.abs(p2.time - p1.time);
    const priceDiff = Math.abs(p2.price - p1.price) / p1.price;
    return timeDiff > 0 || priceDiff > 0.001;
  };

  // 创建预览线
  const createPreviewLine = () => {
    const chart = chartRef.current;
    if (!chart) return;

    clearPreviewLine();

    previewLineRef.current = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: 2, // dashed
      lastValueVisible: false,
      priceLineVisible: false,
    } as any);
  };

  // 更新预览线
  const updatePreviewLine = () => {
    if (!previewLineRef.current || !drawingStateRef.current.startPoint || !drawingStateRef.current.currentPoint) return;

    const { tool, startPoint, currentPoint } = drawingStateRef.current;

    let lineData: { time: Time; value: number }[] = [];

    switch (tool) {
      case 'trendline':
        lineData = [
          { time: startPoint.time as Time, value: startPoint.price },
          { time: currentPoint.time as Time, value: currentPoint.price },
        ];
        break;
      case 'ray':
        // 射线：从起点向外延伸
        lineData = [
          { time: startPoint.time as Time, value: startPoint.price },
          { time: currentPoint.time as Time, value: currentPoint.price },
        ];
        break;
      case 'channel':
        // 通道暂时只显示中线
        lineData = [
          { time: startPoint.time as Time, value: startPoint.price },
          { time: currentPoint.time as Time, value: currentPoint.price },
        ];
        break;
      case 'horizontal':
        // 水平线
        lineData = [
          { time: data[0].time as Time, value: startPoint.price },
          { time: data[data.length - 1].time as Time, value: startPoint.price },
        ];
        break;
    }

    previewLineRef.current.setData(lineData);
  };

  // 清除预览线
  const clearPreviewLine = () => {
    if (previewLineRef.current && chartRef.current) {
      chartRef.current.removeSeries(previewLineRef.current);
      previewLineRef.current = null;
    }
  };

  // 完成绘制
  const completeDrawing = (tool: DrawingTool, start: { time: number; price: number }, end: { time: number; price: number }) => {
    let drawing: Drawing | null = null;

    switch (tool) {
      case 'trendline':
        drawing = {
          id: `drawing-${Date.now()}`,
          type: 'trendline',
          points: [start, end],
          color: '#3b82f6',
          lineWidth: 2,
          lineStyle: 'solid',
          visible: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        break;
      case 'ray':
        drawing = {
          id: `drawing-${Date.now()}`,
          type: 'ray',
          points: [start, end],
          color: '#3b82f6',
          lineWidth: 2,
          lineStyle: 'solid',
          visible: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        break;
      case 'channel':
        drawing = {
          id: `drawing-${Date.now()}`,
          type: 'channel',
          points: [start, end],
          color: '#3b82f6',
          lineWidth: 1,
          lineStyle: 'solid',
          visible: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        break;
      case 'fibonacci':
        drawing = {
          id: `drawing-${Date.now()}`,
          type: 'fibonacci',
          points: [start, end],
          color: '#8b5cf6',
          lineWidth: 1,
          lineStyle: 'dashed',
          visible: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        break;
      case 'rectangle':
        drawing = {
          id: `drawing-${Date.now()}`,
          type: 'rectangle',
          points: [start, end],
          color: '#3b82f6',
          lineWidth: 1,
          lineStyle: 'solid',
          visible: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        break;
    }

    if (drawing) {
      addDrawing(drawing);
    }
  };

  // 添加绘制对象到图表
  const addDrawing = useCallback((drawing: Drawing) => {
    setDrawings((prev) => [...prev, drawing]);

    const chart = chartRef.current;
    if (!chart) return;

    if (drawing.type === 'horizontal' || drawing.type === 'trendline' || drawing.type === 'ray') {
      const line = chart.addSeries(LineSeries, {
        color: drawing.color,
        lastValueVisible: false,
        priceLineVisible: false,
        title: drawing.type,
      } as any);

      const lineData = drawing.points.map((p) => ({
        time: p.time as Time,
        value: p.price,
      }));

      line.setData(lineData);
      drawingLinesRef.current.set(drawing.id, line);
    }
  }, []);

  // 删除绘制
  const handleDrawingDelete = useCallback((id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));

    const line = drawingLinesRef.current.get(id);
    if (line && chartRef.current) {
      chartRef.current.removeSeries(line);
      drawingLinesRef.current.delete(id);
    }
  }, []);

  // 清除所有绘制
  const handleDrawingClear = useCallback(() => {
    drawingLinesRef.current.forEach((line) => {
      if (chartRef.current) {
        chartRef.current.removeSeries(line);
      }
    });
    drawingLinesRef.current.clear();
    setDrawings([]);
  }, []);

  // 切换绘制可见性
  const handleDrawingVisibilityToggle = useCallback((id: string) => {
    setDrawings((prev) => prev.map((d) => (d.id === id ? { ...d, visible: !d.visible } : d)));

    const line = drawingLinesRef.current.get(id);
    if (line) {
      line.applyOptions({ visible: !line.options().visible });
    }
  }, []);

  // ===== 形态高亮显示 =====
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // 清除之前的高亮
    patternLinesRef.current.forEach((line) => {
      try {
        chart.removeSeries(line);
      } catch {
        // 忽略已移除的错误
      }
    });
    patternLinesRef.current = [];

    if (!highlightedPattern || !highlightedPattern.location) {
      return;
    }

    // 确保数据存在且有效
    if (!data || data.length === 0) {
      console.warn('图表数据为空，无法绘制形态');
      return;
    }

    const { location, direction } = highlightedPattern;
    const color = direction === 'bullish' ? '#22c55e' : direction === 'bearish' ? '#ef4444' : '#3b82f6';

    // 过滤出存在于图表数据中的有效点
    const validPoints = location.points.filter(point => {
      const pointTime = typeof point.time === 'number' ? point.time : parseInt(point.time as string);
      // 检查该时间点是否存在于图表数据中
      return data.some(d => {
        const dataTime = typeof d.time === 'number' ? d.time : parseInt(d.time as string);
        return dataTime === pointTime;
      });
    });

    if (validPoints.length === 0) {
      console.warn('形态时间点与图表数据不匹配，无法绘制');
      return;
    }

    // 根据形态类型绘制不同的标注
    try {
      switch (highlightedPattern.type) {
        case 'double_top':
        case 'double_bottom':
          drawDoublePattern(chart, validPoints, color);
          break;
        case 'head_shoulders_top':
        case 'head_shoulders_bottom':
          drawHeadShoulders(chart, validPoints, color);
          break;
        case 'ascending_triangle':
        case 'descending_triangle':
        case 'symmetrical_triangle':
          drawTriangle(chart, validPoints, color);
          break;
        case 'three_push_wedge':
          drawThreePushWedge(chart, validPoints, color);
          break;
        case 'channel_up':
        case 'channel_down':
          drawChannel(chart, validPoints, color);
          break;
        default:
          drawPatternPoints(chart, validPoints, color);
      }
    } catch (error) {
      console.error('绘制形态时出错:', error);
    }

    // 【修复】移除导致图表飘动的 scrollToPosition 调用
    // 形态高亮时不再自动滚动，保持当前视图稳定
    // 如果需要查看形态位置，用户可手动滚动
  }, [highlightedPattern, data]);

  // 绘制双顶/双底 - 正确标记两个顶/底点和颈线
  const drawDoublePattern = (chart: IChartApi, points: PatternPoint[], color: string) => {
    if (points.length < 2 || data.length === 0) return;

    // 获取峰/谷点（双顶是peak，双底是valley）
    const patternPoints = points.filter((p) => p.type === 'peak' || p.type === 'valley');
    const necklinePoint = points.find((p) => p.type === 'neckline');

    if (patternPoints.length < 2) return;

    // 1. 标记两个顶/底点
    patternPoints.forEach((point) => {
      try {
        // 使用 LineSeries 绘制短横线标记点
        const markerLine = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        } as any);

        // 直接使用 point.time，lightweight-charts 会处理
        markerLine.setData([{ time: point.time as Time, value: point.price }]);
        patternLinesRef.current.push(markerLine);
      } catch (e) {
        console.warn('绘制形态点时出错:', e);
      }
    });

    // 2. 绘制颈线（水平支撑/阻力线）
    if (necklinePoint) {
      try {
        const firstCandle = data[0];
        const lastCandle = data[data.length - 1];
        if (!firstCandle || !lastCandle) return;

        const neckline = chart.addSeries(LineSeries, {
          color: '#94a3b8',
          lineWidth: 1,
          lineStyle: 2, // dashed
          lastValueVisible: false,
          priceLineVisible: false,
          title: '颈线',
        } as any);

        neckline.setData([
          { time: firstCandle.time as Time, value: necklinePoint.price },
          { time: lastCandle.time as Time, value: necklinePoint.price },
        ]);
        patternLinesRef.current.push(neckline);
      } catch (e) {
        console.warn('绘制颈线时出错:', e);
      }
    }
  };

  // 绘制头肩形态 - 正确标记三个肩/头点和颈线
  const drawHeadShoulders = (chart: IChartApi, points: PatternPoint[], color: string) => {
    if (points.length < 3 || data.length === 0) return;

    // 获取肩/头点（按时间排序：左肩、头、右肩）
    const patternPoints = points
      .filter((p) => p.type === 'peak' || p.type === 'valley')
      .sort((a, b) => {
        const timeA = typeof a.time === 'number' ? a.time : parseInt(a.time as string);
        const timeB = typeof b.time === 'number' ? b.time : parseInt(b.time as string);
        return timeA - timeB;
      });

    if (patternPoints.length < 3) return;

    // 1. 标记三个点（左肩、头、右肩）
    patternPoints.forEach((point) => {
      try {
        const markerLine = chart.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
        } as any);

        markerLine.setData([{ time: point.time as Time, value: point.price }]);
        patternLinesRef.current.push(markerLine);
      } catch (e) {
        console.warn('绘制头肩点时出错:', e);
      }
    });

    // 2. 绘制颈线（连接左右肩部的支撑/阻力线）
    const leftShoulder = patternPoints[0];
    const rightShoulder = patternPoints[2];

    if (leftShoulder && rightShoulder) {
      try {
        const neckline = chart.addSeries(LineSeries, {
          color: '#94a3b8',
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          title: '颈线',
        } as any);

        neckline.setData([
          { time: leftShoulder.time as Time, value: leftShoulder.price },
          { time: rightShoulder.time as Time, value: rightShoulder.price },
        ]);
        patternLinesRef.current.push(neckline);
      } catch (e) {
        console.warn('绘制颈线时出错:', e);
      }
    }
  };

  // 绘制三角形
  const drawTriangle = (chart: IChartApi, points: PatternPoint[], color: string) => {
    if (points.length < 3 || data.length === 0) return;

    const trendlinePoints = points.filter((p) => p.type === 'trendline');

    trendlinePoints.forEach((point, index) => {
      if (index === 0) return;

      try {
        const line = chart.addSeries(LineSeries, {
          color,
          lastValueVisible: false,
          priceLineVisible: false,
        } as any);

        line.setData([
          { time: trendlinePoints[0].time as Time, value: trendlinePoints[0].price },
          { time: point.time as Time, value: point.price },
        ]);
        patternLinesRef.current.push(line);
      } catch (e) {
        console.warn('绘制三角形时出错:', e);
      }
    });
  };

  // 绘制三推楔形
  const drawThreePushWedge = (chart: IChartApi, points: PatternPoint[], color: string) => {
    if (points.length < 3 || data.length === 0) return;

    const pushPoints = points.filter((p) => p.type === 'peak' || p.type === 'valley');
    if (pushPoints.length === 0) return;

    try {
      const line = chart.addSeries(LineSeries, {
        color,
        lastValueVisible: false,
        priceLineVisible: false,
      } as any);

      line.setData(
        pushPoints.map((p) => ({
          time: p.time as Time,
          value: p.price,
        }))
      );
      patternLinesRef.current.push(line);
    } catch (e) {
      console.warn('绘制三推楔形时出错:', e);
    }

    // 绘制收敛线
    if (pushPoints.length >= 3) {
      try {
        const trendline = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lastValueVisible: false,
          priceLineVisible: false,
        } as any);

        trendline.setData([
          { time: pushPoints[0].time as Time, value: pushPoints[0].price },
          { time: pushPoints[pushPoints.length - 1].time as Time, value: pushPoints[pushPoints.length - 1].price },
        ]);
        patternLinesRef.current.push(trendline);
      } catch (e) {
        console.warn('绘制收敛线时出错:', e);
      }
    }
  };

  // 绘制通道
  const drawChannel = (chart: IChartApi, points: PatternPoint[], color: string) => {
    if (points.length < 4 || data.length === 0) return;

    const upperPoints = points.filter((p) => p.label === 'upper');
    const lowerPoints = points.filter((p) => p.label === 'lower');

    [upperPoints, lowerPoints].forEach((channelPoints) => {
      if (channelPoints.length >= 2) {
        try {
          const line = chart.addSeries(LineSeries, {
            color,
            lastValueVisible: false,
            priceLineVisible: false,
          } as any);

          line.setData(
            channelPoints.map((p) => ({
              time: p.time as Time,
              value: p.price,
            }))
          );
          patternLinesRef.current.push(line);
        } catch (e) {
          console.warn('绘制通道时出错:', e);
        }
      }
    });
  };

  // 绘制形态关键点
  const drawPatternPoints = (chart: IChartApi, points: PatternPoint[], color: string) => {
    if (data.length === 0) return;
    points.forEach((point) => {
      try {
        const line = chart.addSeries(LineSeries, {
          color,
          lastValueVisible: true,
          priceLineVisible: false,
        } as any);

        line.setData([{ time: point.time as Time, value: point.price }]);
        patternLinesRef.current.push(line);
      } catch (e) {
        console.warn('绘制形态点时出错:', e);
      }
    });
  };

  // 如果没有数据，显示占位符
  if (data.length === 0) {
    return (
      <div className="candlestick-chart-container">
        <div style={{ height }} className="chart-no-data">
          暂无图表数据
        </div>
      </div>
    );
  }

  return (
    <div className="candlestick-chart-wrapper">
      {/* TradingView 风格：左侧工具栏 */}
      <ChartDrawingTools
        activeTool={activeTool}
        onToolChange={setActiveTool}
        drawings={drawings}
        onDrawingDelete={handleDrawingDelete}
        onDrawingClear={handleDrawingClear}
        onDrawingVisibilityToggle={handleDrawingVisibilityToggle}
      />

      <div className="candlestick-chart-main">
        {/* 形态高亮提示 */}
        {highlightedPattern && (
          <div className="pattern-highlight-banner">
            <span className="pattern-name">{highlightedPattern.name}</span>
            <span
              className={`pattern-direction ${
                highlightedPattern.direction === 'bullish'
                  ? 'bullish'
                  : highlightedPattern.direction === 'bearish'
                  ? 'bearish'
                  : 'neutral'
              }`}
            >
              {highlightedPattern.direction === 'bullish'
                ? '看涨'
                : highlightedPattern.direction === 'bearish'
                ? '看跌'
                : '中性'}
            </span>
            <span className="pattern-confidence">置信度 {highlightedPattern.confidence}%</span>
            <button className="clear-highlight-btn" onClick={onPatternHighlightClear}>
              ✕ 清除高亮
            </button>
          </div>
        )}

        {/* 图表容器 */}
        <div
          ref={chartContainerRef}
          className="chart-container"
          style={{
            height: showVolume ? height + 80 : height,
            cursor: activeTool !== 'cursor' ? 'crosshair' : 'default',
          }}
        />
      </div>
    </div>
  );
}
