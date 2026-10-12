/**
 * Logic thuần cho focus trap của dialog.
 *
 * Tách khỏi component để có thể kiểm tra bằng `node:test` mà không cần DOM.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export type TabTrapInput = {
  focusableCount: number;
  /** Vị trí control đang focus; `-1` khi focus không nằm trong dialog. */
  activeIndex: number;
  shiftKey: boolean;
};

/**
 * Trả về index control cần focus khi người dùng nhấn Tab/Shift+Tab.
 * `null` nghĩa là không có control nào để trap (để trình duyệt xử lý mặc định).
 * Vòng lặp: Tab ở control cuối quay về control đầu và ngược lại.
 */
export const resolveTabTrapIndex = ({
  focusableCount,
  activeIndex,
  shiftKey,
}: TabTrapInput): number | null => {
  if (focusableCount <= 0) return null;

  if (activeIndex < 0 || activeIndex >= focusableCount) {
    return shiftKey ? focusableCount - 1 : 0;
  }

  const nextIndex = shiftKey ? activeIndex - 1 : activeIndex + 1;

  if (nextIndex < 0) return focusableCount - 1;
  if (nextIndex >= focusableCount) return 0;

  return nextIndex;
};
