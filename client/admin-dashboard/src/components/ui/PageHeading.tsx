import type { ReactNode } from 'react';

type PageHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export const PageHeading = ({
  eyebrow,
  title,
  description,
  action,
}: PageHeadingProps) => (
  <div className="mb-[26px] flex flex-wrap items-end justify-between gap-5">
    <div>
      {eyebrow && (
        <p className="mb-1.5 text-[10px] font-extrabold tracking-[0.13em] text-accent-strong uppercase">
          {eyebrow}
        </p>
      )}

      <h1 className="font-display text-[28px] leading-[1.15] font-extrabold text-ink">
        {title}
      </h1>

      {description && (
        <p className="mt-1.5 text-[13px] text-muted">{description}</p>
      )}
    </div>

    {action}
  </div>
);