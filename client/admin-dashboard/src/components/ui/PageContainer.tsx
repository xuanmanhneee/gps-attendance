import type { ReactNode } from 'react';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export const PageContainer = ({
  children,
  className = '',
}: PageContainerProps) => {
  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {children}
    </div>
  );
};
