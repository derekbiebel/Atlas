import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { WelcomeScreen } from './components/layout/WelcomeScreen';
import { DropZone } from './components/layout/DropZone';
import { Dashboard } from './views/Dashboard';
import { Performance } from './views/Performance';
import { Recovery } from './views/Recovery';
import { Explorer } from './views/Explorer';
import { Settings } from './views/Settings';
import { Insights } from './views/Insights';
import { useAtlasStore } from './store/useAtlasStore';
import { getActivityCount, getDateRange } from './db/queries';
import type { ImportResult } from './lib/importHandler';
import { Menu, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/layout/PageTransition';
import { useTheme } from './hooks/useTheme';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/performance" element={<PageTransition><Performance /></PageTransition>} />
        <Route path="/recovery" element={<PageTransition><Recovery /></PageTransition>} />
        <Route path="/explorer" element={<PageTransition><Explorer /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/insights" element={<PageTransition><Insights /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useTheme();
  const { showWelcome, hasData, setHasData, setDateRange } = useAtlasStore();
  const [showImport, setShowImport] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    getActivityCount().then((count) => {
      if (count > 0) {
        setHasData(true);
        getDateRange().then((range) => {
          if (range) setDateRange(range.min, range.max);
        });
      }
    });
  }, []);

  const handleImportComplete = (result: ImportResult) => {
    setHasData(true);
    if (result.dateRange) {
      setDateRange(result.dateRange.min, result.dateRange.max);
    }
    setShowImport(false);
  };

  if (showWelcome) {
    return <WelcomeScreen />;
  }

  if (!hasData) {
    return <DropZone fullScreen onComplete={handleImportComplete} />;
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar onImportClick={() => setShowImport(true)} />
        </div>

        {/* Mobile header */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-[var(--sidebar)] flex items-center px-4 z-30 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-white/70 hover:text-white rounded-lg"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="text-sm font-bold text-white ml-3">ATLAS</h1>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-60 h-full">
              <Sidebar onImportClick={() => { setShowImport(true); setMobileMenuOpen(false); }} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-[-44px] p-2 text-white/70 hover:text-white rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 md:ml-60 min-h-screen pt-14 md:pt-0">
          <AnimatedRoutes />
        </main>

        {showImport && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center" onClick={() => setShowImport(false)}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full mx-4 border" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center px-5 py-4 border-b">
                <h3 className="font-semibold">Import Data</h3>
                <button
                  onClick={() => setShowImport(false)}
                  className="text-muted-foreground hover:text-foreground text-lg w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
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
