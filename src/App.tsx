import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { DropZone } from './components/layout/DropZone';
import { Dashboard } from './views/Dashboard';
import { Performance } from './views/Performance';
import { Recovery } from './views/Recovery';
import { Explorer } from './views/Explorer';
import { Settings } from './views/Settings';
import { useAtlasStore } from './store/useAtlasStore';
import { getActivityCount, getDateRange } from './db/queries';
import type { ImportResult } from './lib/importHandler';

function App() {
  const { showWelcome, hasData, setHasData, setDateRange } = useAtlasStore();
  const [showImport, setShowImport] = useState(false);

  // Check if data exists on mount
  useEffect(() => {
    getActivityCount().then((count) => {
      if (count > 0) {
        setHasData(true);
        // Also set date range to cover all data
        getDateRange().then((range) => {
          if (range) setDateRange(range.min, range.max);
        });
      }
    });
  }, []);

  const handleImportComplete = (result: ImportResult) => {
    setHasData(true);
    // Set date range to cover imported data
    if (result.dateRange) {
      setDateRange(result.dateRange.min, result.dateRange.max);
    }
    setShowImport(false);
  };

  if (showWelcome) {
    return <WelcomeScreen />;
  }

  if (!hasData) {
    return (
      <DropZone
        fullScreen
        onComplete={handleImportComplete}
      />
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar onImportClick={() => setShowImport(true)} />
        <main className="flex-1 ml-56 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/recovery" element={<Recovery />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Import modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center">
            <div className="bg-[var(--bg)] rounded-2xl shadow-2xl max-w-lg w-full mx-4">
              <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text)]">Import Data</h3>
                <button
                  onClick={() => setShowImport(false)}
                  className="text-[var(--text3)] hover:text-[var(--text)] text-xl"
                >
                  ×
                </button>
              </div>
              <DropZone onComplete={handleImportComplete} />
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;
