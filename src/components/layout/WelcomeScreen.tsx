import { useAtlasStore } from '../../store/useAtlasStore';
import { usePreferences } from '../../store/usePreferences';

export function WelcomeScreen() {
  const setShowWelcome = useAtlasStore((s) => s.setShowWelcome);
  const setUnits = usePreferences((s) => s.setUnits);

  const handleChoice = (units: 'imperial' | 'metric') => {
    setUnits(units);
    setShowWelcome(false);
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg)] z-50 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h1 className="text-5xl font-bold tracking-tight text-[var(--text)] mb-2">ATLAS</h1>
        <p className="text-sm text-[var(--text3)] font-mono uppercase tracking-widest mb-12">
          Personal Performance Intelligence
        </p>

        <p className="text-base text-[var(--text2)] mb-8">
          Choose your preferred units. You can always change this later in Settings.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleChoice('imperial')}
            className="flex-1 max-w-[180px] p-6 bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl hover:border-[var(--primary-text)] transition-colors group"
          >
            <p className="text-2xl font-mono font-bold text-[var(--text)] group-hover:text-[var(--primary-text)]">mi</p>
            <p className="text-sm text-[var(--text3)] mt-2">Imperial</p>
            <p className="text-xs text-[var(--text3)] mt-1">miles, feet, °F</p>
          </button>

          <button
            onClick={() => handleChoice('metric')}
            className="flex-1 max-w-[180px] p-6 bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl hover:border-[var(--primary-text)] transition-colors group"
          >
            <p className="text-2xl font-mono font-bold text-[var(--text)] group-hover:text-[var(--primary-text)]">km</p>
            <p className="text-sm text-[var(--text3)] mt-2">Metric</p>
            <p className="text-xs text-[var(--text3)] mt-1">km, meters, °C</p>
          </button>
        </div>
      </div>
    </div>
  );
}
