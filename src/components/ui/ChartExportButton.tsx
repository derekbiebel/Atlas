import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { exportAsSVG, exportAsPNG } from '@/lib/exportChart';

interface ChartExportButtonProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
}

export function ChartExportButton({ chartRef, filename }: ChartExportButtonProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'svg' | 'png') => {
    if (!chartRef.current) return;
    if (format === 'svg') await exportAsSVG(chartRef.current, filename);
    else await exportAsPNG(chartRef.current, filename);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Export chart"
      >
        <Download className="size-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="absolute right-0 top-8 z-50 bg-card border rounded-lg shadow-lg py-1 min-w-[120px]"
          >
            <button
              onClick={() => handleExport('svg')}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            >
              Export SVG
            </button>
            <button
              onClick={() => handleExport('png')}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            >
              Export PNG
            </button>
          </div>
        </>
      )}
    </div>
  );
}
