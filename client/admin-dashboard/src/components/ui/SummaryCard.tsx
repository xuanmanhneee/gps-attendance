import type { IconType } from 'react-icons';

export type SummaryTone = 'accent' | 'positive' | 'warning' | 'danger' | 'neutral';

const toneClass: Record<SummaryTone, string> = {
  accent: 'bg-accent-soft text-accent-strong',
  positive: 'bg-positive-soft text-positive',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-subtle text-muted',
};

type SummaryCardProps = {
  label: string;
  /** `null` khi chỉ số chưa có nguồn dữ liệu — hiển thị dấu gạch thay vì số. */
  value: number | null;
  note?: string;
  tone?: SummaryTone;
  icon: IconType;
};

export const SummaryCard = ({
  label,
  value,
  note,
  tone = 'accent',
  icon: Icon,
}: SummaryCardProps) => {
  const displayValue = value === null ? '—' : value.toLocaleString();

  return (
    <article className="rounded-xl border border-line bg-surface px-[19px] pt-[18px] pb-4 shadow-panel">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted">{label}</span>

        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${toneClass[tone]}`}
        >
          <Icon aria-hidden="true" className="text-[15px]" />
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <strong className="font-display text-[27px] font-extrabold tracking-[-0.05em] text-ink">
          {displayValue}
        </strong>
      </div>

      {note && <p className="mt-1 text-[11px] text-muted-soft">{note}</p>}
    </article>
  );
};