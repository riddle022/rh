import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, className = '', onClick }: CardProps) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#0F1629] border border-cyan-500/20 rounded-xl shadow-lg shadow-cyan-500/5 ${className} ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </div>
  );
};
