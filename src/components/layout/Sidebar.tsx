import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◻' },
  { to: '/performance', label: 'Performance', icon: '△' },
  { to: '/recovery', label: 'Recovery', icon: '♡' },
  { to: '/explorer', label: 'Explorer', icon: '☰' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

interface SidebarProps {
  onImportClick: () => void;
}

export function Sidebar({ onImportClick }: SidebarProps) {
  return (
    <aside className="w-56 fixed left-0 top-0 bottom-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-6">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
          ATLAS
        </h1>
        <p className="text-[10px] text-[var(--text3)] font-mono uppercase tracking-widest mt-0.5">
          Performance Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                isActive
                  ? 'bg-[var(--primary-light)] text-[var(--primary-text)] border-l-2 border-[var(--primary-text)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--surface2)]'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Import button */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={onImportClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary-text)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add Data
        </button>
      </div>
    </aside>
  );
}
