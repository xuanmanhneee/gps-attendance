interface LogoMarkProps {
  className?: string;
}

/** Biểu tượng địa cầu và mũi tên định vị, giữ nét rõ ở kích thước sidebar nhỏ. */
export const LogoMark = ({ className = '' }: LogoMarkProps) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <circle cx="14.5" cy="17" r="9.5" stroke="currentColor" strokeWidth="1.8" />
    <ellipse
      cx="14.5"
      cy="17"
      rx="4.1"
      ry="9.5"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path
      d="M5.3 14h17.8M5.3 20h17.8"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path
      d="M18.7 10.1 28 5.3l-3.1 9.8-2.1-3-4.1-2Z"
      className="fill-accent"
      stroke="var(--color-ink)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);
