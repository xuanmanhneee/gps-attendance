import type { ReactNode } from 'react';

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
};

export const ScrollArea = ({
  children,
  className = '',
}: ScrollAreaProps) => {
  return (
    <div className={`h-full min-h-0 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
};