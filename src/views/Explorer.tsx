import { TopBar } from '../components/layout/TopBar';

export function Explorer() {
  return (
    <div>
      <TopBar title="Activity Explorer" />
      <div className="p-6">
        <div className="flex items-center justify-center h-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div className="text-center">
            <p className="text-2xl mb-2">☰</p>
            <p className="text-sm text-[var(--text3)]">Activity Explorer — Coming in Phase 2</p>
            <p className="text-xs text-[var(--text3)] mt-1">Filterable list, activity detail, lap splits</p>
          </div>
        </div>
      </div>
    </div>
  );
}
