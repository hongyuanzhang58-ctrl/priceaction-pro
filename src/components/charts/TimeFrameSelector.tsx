import { TimeFrame } from '../../types';

interface TimeFrameSelectorProps {
  activeTimeFrame: TimeFrame;
  onTimeFrameChange: (tf: TimeFrame) => void;
}

const timeFrames: { value: TimeFrame; label: string }[] = [
  { value: '1m', label: '1分' },
  { value: '5m', label: '5分' },
  { value: '15m', label: '15分' },
  { value: '30m', label: '30分' },
  { value: '60m', label: '60分' },
  { value: '1d', label: '日K' },
  { value: '1w', label: '周K' },
  { value: '1M', label: '月K' },
];

export function TimeFrameSelector({ activeTimeFrame, onTimeFrameChange }: TimeFrameSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {timeFrames.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onTimeFrameChange(tf.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTimeFrame === tf.value
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}