import { useAtlasStore } from '../../store/useAtlasStore';
import { useEffect, useState } from 'react';
import { getAllSports } from '../../db/queries';

interface TopBarProps {
  title: string;
  onCustomize?: () => void;
  isCustomizing?: boolean;
}

export function TopBar({ title, onCustomize, isCustomizing }: TopBarProps) {
  const { startDate, endDate, setDateRange, activeSport, setActiveSport } = useAtlasStore();
  const [sports, setSports] = useState<string[]>([]);

  useEffect(() => {
    getAllSports().then(setSports);
  }, []);

  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-[var(--border)] bg-[var(--surface)]">
      <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Sport filter */}
        {sports.length > 0 && (
          <select
            value={activeSport}
            onChange={(e) => setActiveSport(e.target.value)}
            className="text-xs font-mono bg-[var(--surface2)] text-[var(--text2)] border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="all">All Sports</option>
            {sports.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setDateRange(e.target.value, endDate)}
            className="text-xs font-mono bg-[var(--surface2)] text-[var(--text2)] border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <span className="text-[var(--text3)] text-xs">–</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setDateRange(startDate, e.target.value)}
            className="text-xs font-mono bg-[var(--surface2)] text-[var(--text2)] border border-[var(--border)] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Customize button */}
        {onCustomize && (
          <button
            onClick={onCustomize}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isCustomizing
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-[var(--surface2)] text-[var(--text3)] hover:text-[var(--text2)] border border-[var(--border)]'
            }`}
          >
            {isCustomizing ? 'Done' : 'Customize'}
          </button>
        )}
      </div>
    </div>
  );
}
