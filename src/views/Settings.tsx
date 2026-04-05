import { TopBar } from '../components/layout/TopBar';
import { usePreferences } from '../store/usePreferences';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';


export function Settings() {
  const { units, setUnits, themeMode, themePreset, setTheme } = usePreferences();

  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 max-w-2xl space-y-8">
        {/* Units */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--text2)] mb-4">Units</h3>
          <Card>
            <div className="space-y-4">
              {([
                { label: 'Distance', imperial: 'Miles', metric: 'Kilometers' },
                { label: 'Pace', imperial: 'min/mile', metric: 'min/km' },
                { label: 'Speed', imperial: 'mph', metric: 'kph' },
                { label: 'Elevation', imperial: 'Feet', metric: 'Meters' },
                { label: 'Weight', imperial: 'lbs', metric: 'kg' },
                { label: 'Temperature', imperial: '°F', metric: '°C' },
              ]).map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm text-[var(--text2)]">{row.label}</span>
                  <div className="flex bg-[var(--surface2)] rounded-lg p-0.5">
                    <button
                      onClick={() => setUnits('imperial')}
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                        units === 'imperial'
                          ? 'bg-[var(--surface)] text-[var(--primary-text)] shadow-sm'
                          : 'text-[var(--text3)]'
                      }`}
                    >
                      {row.imperial}
                    </button>
                    <button
                      onClick={() => setUnits('metric')}
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                        units === 'metric'
                          ? 'bg-[var(--surface)] text-[var(--primary-text)] shadow-sm'
                          : 'text-[var(--text3)]'
                      }`}
                    >
                      {row.metric}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Appearance */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--text2)] mb-4">Appearance</h3>
          <Card>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text3)] uppercase tracking-wider">Mode</label>
                <div className="flex gap-2 mt-2">
                  {(['light', 'dark', 'system'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTheme({ themeMode: mode })}
                      className={`px-4 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                        themeMode === mode
                          ? 'bg-[var(--primary-light)] text-[var(--primary-text)] border border-[var(--primary)]'
                          : 'bg-[var(--surface2)] text-[var(--text3)] border border-[var(--border)]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--text3)] uppercase tracking-wider">Theme Preset</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {['linen', 'slate', 'parchment', 'fog', 'graphite', 'midnight', 'forest', 'rose'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTheme({ themePreset: preset })}
                      className={`px-3 py-2 text-xs font-medium rounded-lg capitalize transition-colors ${
                        themePreset === preset
                          ? 'bg-[var(--primary-light)] text-[var(--primary-text)] border border-[var(--primary)]'
                          : 'bg-[var(--surface2)] text-[var(--text3)] border border-[var(--border)]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Live Preview */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--text2)] mb-4">Live Preview</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Resting HR"
              value="52"
              unit="bpm"
              delta={-3}
              invertDelta={true}
              sparklineData={[58, 56, 55, 54, 53, 55, 52, 53, 51, 52]}
            />
            <StatCard
              label="VO2 Max"
              value="48.2"
              unit="ml/kg/min"
              delta={1.4}
              sparklineData={[45, 45.5, 46, 46.2, 46.8, 47, 47.5, 47.8, 48, 48.2]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
