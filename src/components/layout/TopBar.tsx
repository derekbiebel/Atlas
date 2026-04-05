import { useAtlasStore } from '../../store/useAtlasStore';
import { useEffect, useState } from 'react';
import { getAllSports } from '../../db/queries';
import { Pencil, Check, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onCustomize?: () => void;
  isCustomizing?: boolean;
}

export function TopBar({ title, subtitle, onCustomize, isCustomizing }: TopBarProps) {
  const { startDate, endDate, setDateRange, activeSport, setActiveSport } = useAtlasStore();
  const [sports, setSports] = useState<string[]>([]);

  useEffect(() => {
    getAllSports().then(setSports);
  }, []);

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
      <div className="flex items-center justify-between py-4 px-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {sports.length > 0 && (
            <select
              value={activeSport}
              onChange={(e) => setActiveSport(e.target.value)}
              className="h-8 text-xs font-mono bg-card text-foreground border rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
            >
              <option value="all">All Sports</option>
              {sports.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-card border rounded-lg px-2 h-8">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setDateRange(e.target.value, endDate)}
              className="text-xs font-mono bg-transparent text-foreground focus:outline-none w-[100px]"
            />
            <span className="text-muted-foreground text-[10px]">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setDateRange(startDate, e.target.value)}
              className="text-xs font-mono bg-transparent text-foreground focus:outline-none w-[100px]"
            />
          </div>

          {onCustomize && (
            <button
              onClick={onCustomize}
              className={cn(
                'h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all',
                isCustomizing
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border text-muted-foreground hover:text-foreground'
              )}
            >
              {isCustomizing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
              {isCustomizing ? 'Done' : 'Customize'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
