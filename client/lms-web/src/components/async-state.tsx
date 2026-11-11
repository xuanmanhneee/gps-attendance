import { FiAlertCircle, FiInbox, FiLoader } from 'react-icons/fi';

export function AsyncState({ kind, message, onRetry }: { kind: 'loading' | 'empty' | 'error'; message: string; onRetry?: () => void }) {
  const Icon = kind === 'loading' ? FiLoader : kind === 'error' ? FiAlertCircle : FiInbox;
  return (
    <div className={`async-state async-state--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" />
      <strong>{message}</strong>
      {onRetry && <button className="button button--secondary" onClick={onRetry}>Thử lại</button>}
    </div>
  );
}
