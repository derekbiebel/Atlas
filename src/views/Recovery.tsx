import { TopBar } from '../components/layout/TopBar';

export function Recovery() {
  return (
    <div>
      <TopBar title="Recovery & Wellness" />
      <div className="p-6">
        <div className="flex items-center justify-center h-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <div className="text-center">
            <p className="text-2xl mb-2">♡</p>
            <p className="text-sm text-[var(--text3)]">Recovery & Wellness — Coming in Phase 2</p>
            <p className="text-xs text-[var(--text3)] mt-1">Sleep, HRV, Body Battery, Resting HR</p>
          </div>
        </div>
      </div>
    </div>
  );
}
