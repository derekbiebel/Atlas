import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Heart,
  List,
  Settings,
  Sparkles,
  Plus,
  Activity,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/performance', label: 'Performance', icon: TrendingUp },
  { to: '/recovery', label: 'Recovery', icon: Heart },
  { to: '/explorer', label: 'Explorer', icon: List },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/insights', label: 'Insights', icon: Sparkles },
];

interface SidebarProps {
  onImportClick: () => void;
}

export function Sidebar({ onImportClick }: SidebarProps) {
  return (
    <aside className="w-60 fixed left-0 top-0 bottom-0 bg-[var(--sidebar)] flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--atlas-sky)] flex items-center justify-center">
            <Activity className="size-4 text-[var(--sidebar)]" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-white">ATLAS</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-[var(--sidebar-accent)] text-white'
                  : 'text-white/50 hover:text-white hover:bg-[var(--sidebar-accent)]/50'
              )
            }
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Import button */}
      <div className="p-4">
        <button
          onClick={onImportClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--atlas-sky)] text-[var(--sidebar)] rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
        >
          <Plus className="size-4" />
          Add Data
        </button>
      </div>
    </aside>
  );
}
