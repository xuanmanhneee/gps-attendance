import { Link } from 'react-router-dom';

type PanelActionLinkProps = {
  to: string;
  label: string;
};

/** Link hành động ở góc phải panel header. */
export const PanelActionLink = ({ to, label }: PanelActionLinkProps) => (
  <Link
    to={to}
    className="text-[12px] font-bold whitespace-nowrap text-accent-strong hover:underline"
  >
    {label}
  </Link>
);