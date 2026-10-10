import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Trả về "now", tự cập nhật đúng lúc một mốc trong `boundaries` (chuỗi ISO)
 * trôi qua và khi app quay về foreground.
 */
export function useNow(boundaries: string[]): number {
  const [now, setNow] = useState(() => Date.now());
  const key = boundaries.join('|');

  useEffect(() => {
    const t = Date.now();
    const next = key
      .split('|')
      .map((b) => Date.parse(b))
      .filter((b) => b > t)
      .sort((a, b) => a - b)[0];

    if (next === undefined) return;

    const id = setTimeout(
      () => setNow(Date.now()),
      Math.min(next - t, 2 ** 31 - 1) + 50,
    );
    return () => clearTimeout(id);
  }, [key, now]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  return now;
}
