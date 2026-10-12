import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import { FOCUSABLE_SELECTOR, resolveTabTrapIndex } from './dialog-focus.utils';

type DialogProps = {
  ariaLabel: string;
  /** `false` khi mutation đang chạy — chặn Escape/backdrop/close để không mất state. */
  canClose: boolean;
  onClose: () => void;
  /** Control cần focus khi mở; mặc định là control đầu tiên trong dialog. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  panelClassName?: string;
  children: ReactNode;
};

/**
 * Dialog dùng chung: `role="dialog"`, focus trap, khôi phục focus về trigger.
 *
 * Component này chỉ render khi dialog đang mở (page điều kiện hoá bằng state),
 * nên trigger được lưu ngay lúc mount và focus được trả lại khi unmount.
 */
export const Dialog = ({
  ariaLabel,
  canClose,
  onClose,
  initialFocusRef,
  panelClassName = '',
  children,
}: DialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];

    return Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => !element.hasAttribute('disabled'));
  }, []);

  useEffect(() => {
    const active = document.activeElement;
    previouslyFocusedRef.current = active instanceof HTMLElement ? active : null;

    return () => {
      const trigger = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;

      if (trigger && document.contains(trigger)) {
        trigger.focus();
      }
    };
  }, []);

  useEffect(() => {
    const target =
      initialFocusRef?.current ?? getFocusableElements()[0] ?? panelRef.current;

    target?.focus();
  }, [initialFocusRef, getFocusableElements]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      if (canClose) onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements();
    const activeIndex = focusable.findIndex(
      (element) => element === document.activeElement,
    );
    const nextIndex = resolveTabTrapIndex({
      focusableCount: focusable.length,
      activeIndex,
      shiftKey: event.shiftKey,
    });

    if (nextIndex === null) return;

    event.preventDefault();
    focusable[nextIndex]?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={() => {
        if (canClose) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
        className={`w-full overflow-hidden rounded-xl border border-line bg-surface shadow-panel outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
