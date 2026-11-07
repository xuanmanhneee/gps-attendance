import type { IconType } from 'react-icons';

type PrimaryButtonProps = {
  label: string;
  icon?: IconType;
  onClick?: () => void;
  /** Dùng cho modal/nút chỉ hiển thị khi vai trò hiện tại có quyền gọi API. */
  type?: 'button' | 'submit';
  className?: string;
};

export const PrimaryButton = ({
  label,
  icon: Icon,
  onClick,
  type = 'button',
  className = '',
}: PrimaryButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    className={`inline-flex min-h-10 items-center gap-2 rounded-lg border border-accent-strong bg-accent-strong px-[15px] text-[12px] font-bold text-white shadow-[0_4px_12px_oklch(52%_0.17_220_/_0.18)] transition-colors hover:bg-[oklch(45%_0.17_220)] ${className}`}
  >
    {Icon && <Icon aria-hidden="true" className="text-[15px]" />}
    {label}
  </button>
);