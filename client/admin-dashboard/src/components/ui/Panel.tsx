import type { ReactNode } from 'react';

type PanelProps = {
  children: ReactNode;
  className?: string;
};

/** Khối nội dung dạng card lớn, dùng cho bảng và side panel. */
export const Panel = ({ children, className = '' }: PanelProps) => (
  <section
    className={`overflow-hidden rounded-xl border border-line bg-surface shadow-panel ${className}`}
  >
    {children}
  </section>
);

type PanelHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export const PanelHeader = ({
  title,
  subtitle,
  action,
}: PanelHeaderProps) => (
  <div className="flex min-h-[68px] items-center justify-between gap-3 border-b border-line px-5 py-4">
    <div>
      <h2 className="font-display text-[15px] font-bold text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);