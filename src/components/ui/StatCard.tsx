import { Sparkline } from '../charts/Sparkline';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  invertDelta?: boolean;
  sparklineData?: number[];
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
  const isImprovement = delta !== undefined && delta !== 0
    ? invertDelta ? delta < 0 : delta > 0
    : false;
  const isRegression = delta !== undefined && delta !== 0 && !isImprovement;

  // Don't show cards with zero values unless editing
  const isEmpty = value === '0' || value === '0.0' || value === 'NaN';

  return (
    <div
      className={cn(
        'relative bg-card rounded-xl border p-5 transition-all duration-200',
        'shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)]',
        'hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.06)]',
        !visible && editMode && 'opacity-30',
        editMode && 'ring-1 ring-dashed ring-border cursor-pointer',
      )}
      onClick={editMode ? onToggle : undefined}
    >
      {editMode && (
        <div className="absolute top-3 right-3">
          {visible
            ? <Eye className="size-4 text-primary" />
            : <EyeOff className="size-4 text-muted-foreground" />
          }
        </div>
      )}

      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {label}
      </p>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[28px] font-bold leading-none tracking-tight">
            {isEmpty ? '—' : value}
            {unit && !isEmpty && (
              <span className="ml-1.5 text-[13px] font-medium text-muted-foreground">{unit}</span>
            )}
          </p>
          {deltaLabel && !isEmpty && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-[12px] font-mono font-medium',
              isImprovement && 'text-emerald-600',
              isRegression && 'text-orange-500',
            )}>
              {isImprovement
                ? <TrendingUp className="size-3" />
                : <TrendingDown className="size-3" />
              }
              {deltaLabel}
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && !isEmpty && (
          <div className="w-20 h-8 shrink-0">
            <Sparkline data={sparklineData} color={isImprovement ? '#10b981' : 'var(--atlas-sky)'} />
          </div>
        )}
      </div>
    </div>
  );
}
