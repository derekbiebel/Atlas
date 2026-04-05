import { Card } from './Card';
import { Sparkline } from '../charts/Sparkline';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  invertDelta?: boolean; // true = lower is better (e.g., resting HR)
  sparklineData?: number[];
  id?: string;
  editMode?: boolean;
  visible?: boolean;
  onToggle?: () => void;
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  invertDelta = false,
  sparklineData,
  editMode = false,
  visible = true,
  onToggle,
}: StatCardProps) {
  const isImprovement = delta !== undefined
    ? invertDelta
      ? delta < 0
      : delta > 0
    : false;

  if (editMode) {
    return (
      <Card className={`relative ${!visible ? 'opacity-40' : ''}`}>
        <button
          onClick={onToggle}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-[var(--surface2)] hover:bg-[var(--border)] transition-colors"
        >
          {visible ? '👁' : '👁‍🗨'}
        </button>
        <p className="text-xs text-[var(--text3)] font-medium uppercase tracking-wider">{label}</p>
        <p className="font-mono text-2xl font-semibold mt-1 text-[var(--text)]">
          {value}
          {unit && <span className="text-sm text-[var(--text3)] ml-1">{unit}</span>}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-xs text-[var(--text3)] font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <div>
          <p className="font-mono text-2xl font-semibold text-[var(--text)]">
            {value}
            {unit && <span className="text-sm text-[var(--text3)] ml-1">{unit}</span>}
          </p>
          {delta !== undefined && (
            <p className={`font-mono text-sm mt-0.5 ${isImprovement ? 'text-[var(--primary-text)]' : 'text-[var(--secondary)]'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
              {deltaLabel && <span className="text-[var(--text3)] ml-1">{deltaLabel}</span>}
            </p>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-24 h-8">
            <Sparkline data={sparklineData} />
          </div>
        )}
      </div>
    </Card>
  );
}
