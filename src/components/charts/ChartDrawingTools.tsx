import { Drawing, DrawingTool } from '../../types';
import './ChartDrawingTools.css';

interface ChartDrawingToolsProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  drawings: Drawing[];
  onDrawingDelete: (id: string) => void;
  onDrawingClear: () => void;
  onDrawingVisibilityToggle: (id: string) => void;
}

// 工具定义
const tools: { type: DrawingTool; icon: string; label: string; tooltip: string }[] = [
  { type: 'cursor', icon: '⿻', label: '光标', tooltip: '光标 (Esc)' },
  { type: 'trendline', icon: '📏', label: '趋势线', tooltip: '趋势线 - 点击并拖动绘制' },
  { type: 'ray', icon: '→', label: '射线', tooltip: '射线 - 从起点向外延伸' },
  { type: 'horizontal', icon: '⎯', label: '水平线', tooltip: '水平线 - 点击放置' },
  { type: 'channel', icon: '⫯', label: '通道', tooltip: '平行通道 - 点击并拖动' },
  { type: 'fibonacci', icon: '∿', label: '斐波那契', tooltip: '斐波那契回撤 - 点击并拖动' },
  { type: 'rectangle', icon: '▭', label: '矩形', tooltip: '矩形 - 点击并拖动' },
  { type: 'text', icon: 'T', label: '文字', tooltip: '文字标注 - 点击放置' },
];

export function ChartDrawingTools({
  activeTool,
  onToolChange,
  drawings,
  onDrawingDelete,
  onDrawingClear,
  onDrawingVisibilityToggle,
}: ChartDrawingToolsProps) {
  return (
    <div className="tv-drawing-toolbar">
      {/* 主工具区 */}
      <div className="tv-toolbar-section">
        {tools.map((tool) => (
          <button
            key={tool.type}
            className={`tv-tool-btn ${activeTool === tool.type ? 'active' : ''}`}
            onClick={() => onToolChange(tool.type)}
            title={tool.tooltip}
          >
            <span className="tv-tool-icon">{tool.icon}</span>
          </button>
        ))}
      </div>

      <div className="tv-toolbar-divider" />

      {/* 绘制列表管理 */}
      <div className="tv-toolbar-section">
        <div className="tv-tool-btn" title="绘制列表">
          <span className="tv-tool-icon">📋</span>
          {drawings.length > 0 && <span className="tv-badge">{drawings.length}</span>}
        </div>

        {/* 绘制列表下拉菜单 */}
        {drawings.length > 0 && (
          <div className="tv-drawings-dropdown">
            <div className="tv-dropdown-header">
              <span>绘制对象 ({drawings.length})</span>
            </div>
            <div className="tv-dropdown-list">
              {drawings.map((drawing) => (
                <div key={drawing.id} className="tv-drawing-item">
                  <button
                    className="tv-visibility-btn"
                    onClick={() => onDrawingVisibilityToggle(drawing.id)}
                    title={drawing.visible ? '隐藏' : '显示'}
                  >
                    {drawing.visible ? '👁' : '🚫'}
                  </button>
                  <span className="tv-drawing-type">{getToolIcon(drawing.type)}</span>
                  <span className="tv-drawing-label">{getToolLabel(drawing.type)}</span>
                  <span
                    className="tv-drawing-color"
                    style={{ backgroundColor: drawing.color }}
                  />
                  <button
                    className="tv-delete-btn"
                    onClick={() => onDrawingDelete(drawing.id)}
                    title="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="tv-dropdown-footer">
              <button className="tv-clear-all-btn" onClick={onDrawingClear}>
                清除全部
              </button>
            </div>
          </div>
        )}

        <button
          className="tv-tool-btn tv-clear-btn"
          onClick={onDrawingClear}
          disabled={drawings.length === 0}
          title="清除所有绘制"
        >
          <span className="tv-tool-icon">🗑️</span>
        </button>
      </div>

      <div className="tv-toolbar-divider" />

      {/* 帮助提示 */}
      <div className="tv-toolbar-section tv-help-section">
        {activeTool !== 'cursor' && (
          <div className="tv-active-tool-hint">
            <span className="tv-hint-text">{getToolHint(activeTool)}</span>
            <button className="tv-cancel-btn" onClick={() => onToolChange('cursor')}>
              ESC 取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getToolIcon(type: DrawingTool): string {
  const tool = tools.find((t) => t.type === type);
  return tool?.icon || '○';
}

function getToolLabel(type: DrawingTool): string {
  const tool = tools.find((t) => t.type === type);
  return tool?.label || type;
}

function getToolHint(type: DrawingTool): string {
  switch (type) {
    case 'trendline':
      return '点击并拖动绘制趋势线';
    case 'ray':
      return '点击并拖动绘制射线';
    case 'horizontal':
      return '点击放置水平线';
    case 'channel':
      return '点击并拖动绘制通道';
    case 'fibonacci':
      return '点击并拖动绘制斐波那契回撤';
    case 'rectangle':
      return '点击并拖动绘制矩形';
    case 'text':
      return '点击放置文字标注';
    default:
      return '';
  }
}
