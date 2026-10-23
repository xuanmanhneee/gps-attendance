import type { ReactNode } from 'react';

type PanelProps = {
  children: ReactNode;
  className?: string;
  /**
   * `flush` — tràn viền, không bo góc (trang data-heavy như SessionsPage).
   * `card`  — card nổi, bo góc + viền (dashboard widget, panel phụ).
   * Mặc định `flush` để không phá layout các trang đã chỉnh.
   */
  variant?: 'flush' | 'card';
};

export const Panel = ({
  children,
  className = '',
  variant = 'flush',
}: PanelProps) => {
  const base = 'flex min-h-0 flex-1 flex-col bg-surface';
  const styles = {
    flush: '',
    card: 'overflow-hidden rounded-xl border border-line',
  };
  return (
    <div className={`${base} ${styles[variant]} ${className}`}>{children}</div>
  );
};

type PanelHeaderProps = {
  /** Tiêu đề chính. */
  title: ReactNode;
  /** Mô tả phụ dưới title. Optional. */
  subtitle?: ReactNode;
  /** Nút/hành động bên phải (StatusBadge, button, ...). Optional. */
  action?: ReactNode;
  className?: string;
  /** Có đường kẻ dưới phân tách với body. Mặc định `true`. */
  bordered?: boolean;
};

export const PanelHeader = ({
  title,
  subtitle,
  action,
  className = '',
  bordered = true,
}: PanelHeaderProps) => {
  return (
    <div
      className={`flex shrink-0 flex-wrap items-start justify-between gap-3 px-5 py-4 ${
        bordered ? 'border-b border-line' : ''
      } ${className}`}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-[14px] font-bold text-ink">{title}</h3>
        {subtitle !== undefined && (
          <p className="text-[12px] text-muted">{subtitle}</p>
        )}
      </div>
      {action !== undefined && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </div>
  );
};

type PanelBodyProps = {
  children: ReactNode;
  className?: string;
};

export const PanelBody = ({ children, className = '' }: PanelBodyProps) => {
  return <div className={`min-h-0 flex-1 ${className}`}>{children}</div>;
};

type PanelFooterProps = {
  children: ReactNode;
  className?: string;
};

export const PanelFooter = ({ children, className = '' }: PanelFooterProps) => {
  return (
    <div className={`shrink-0 border-t border-line px-5 py-4 ${className}`}>
      {children}
    </div>
  );
};
