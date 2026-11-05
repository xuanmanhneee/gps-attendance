import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { useTranslation } from '../../hooks/useTranslation';

const PageActionBarTargetContext = createContext<HTMLDivElement | null>(null);

interface PageActionBarProviderProps {
  children: ReactNode;
  isVisible: boolean;
}

/** Dải thao tác ổn định ngay dưới topbar; nội dung được page đưa vào qua portal. */
export const PageActionBarProvider = ({
  children,
  isVisible,
}: PageActionBarProviderProps) => {
  const { t } = useTranslation();
  const [target, setTarget] = useState<HTMLDivElement | null>(null);

  return (
    <PageActionBarTargetContext.Provider value={isVisible ? target : null}>
      {isVisible && (
        <section
          aria-label={t('app.pageActionsAria')}
          className="flex h-14 shrink-0 items-center overflow-x-auto border-b border-line bg-surface px-4"
        >
          <div ref={setTarget} className="w-full min-w-max" />
        </section>
      )}
      {children}
    </PageActionBarTargetContext.Provider>
  );
};

interface PageActionBarPortalProps {
  children: ReactNode;
}

export const PageActionBarPortal = ({ children }: PageActionBarPortalProps) => {
  const target = useContext(PageActionBarTargetContext);

  return target ? createPortal(children, target) : null;
};
