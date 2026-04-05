import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const colors = {
    default: 'bg-[var(--surface2)] text-[var(--text2)]',
    primary: 'bg-[var(--primary-light)] text-[var(--primary-text)]',
    secondary: 'bg-orange-50 text-orange-700',
    accent: 'bg-green-50 text-green-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${colors[variant]}`}>
      {children}
    </span>
  );
}
