import { DataState } from '../components/ui/DataState';
import { Panel } from '../components/ui/Panel';

type MessagePageProps = {
  title: string;
  description: string;
  variant: 'empty' | 'error' | 'unavailable';
  actionLabel: string;
  onAction: () => void;
};

/** Page chỉ có một thông báo trạng thái kèm hành động thoát ra. */
export const MessagePage = ({
  title,
  description,
  variant,
  actionLabel,
  onAction,
}: MessagePageProps) => (
  <div className="mx-auto max-w-2xl pt-6">
    <Panel>
      <DataState
        variant={variant}
        title={title}
        description={description}
        onRetry={onAction}
        retryLabel={actionLabel}
      />
    </Panel>
  </div>
);