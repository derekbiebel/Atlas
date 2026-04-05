import { TopBar } from '../components/layout/TopBar';

export function Performance() {
  return (
    <div>
      <TopBar title="Performance Hub" />
      <div className="p-6">
        <div className="flex items-center justify-center h-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div className="text-center">
            <p className="text-2xl mb-2">△</p>
            <p className="text-sm text-[var(--text3)]">Performance Hub — Coming in Phase 2</p>
            <p className="text-xs text-[var(--text3)] mt-1">VO2 Max, FTP, PR Timeline, Zone Distribution</p>
          </div>
        </div>
      </div>
    </div>
  );
}
