import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-[var(--border2)] transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
