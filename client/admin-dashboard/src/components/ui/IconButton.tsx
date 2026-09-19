import type { IconType } from 'react-icons';

type IconButtonProps = {
  label: string;
  icon: IconType;
  onClick: () => void;
  title?: string;
  className?: string;
};

export const IconButton = ({
  label,
  icon: Icon,
  onClick,
  title,
  className = '',
}: IconButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={title}
    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:bg-surface-subtle hover:text-ink ${className}`}
  >
    <Icon aria-hidden="true" className="text-[17px]" />
  </button>
);