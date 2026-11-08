import { Component } from 'react';
import type { ReactNode } from 'react';

import { useTranslation } from '../../hooks/useTranslation';
import { DataState } from '../ui/DataState';
import { Panel } from '../ui/Panel';

const ErrorFallback = () => {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl pt-6">
      <Panel variant="card">
        <DataState
          variant="error"
          title={t('common.errorBoundaryTitle')}
          description={t('common.errorBoundaryBody')}
          onRetry={() => window.location.reload()}
          retryLabel={t('common.reloadPage')}
        />
      </Panel>
    </div>
  );
};

type ErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

