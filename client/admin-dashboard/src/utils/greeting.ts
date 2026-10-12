import type { Translator } from '../i18n/translation-keys';

/**
 * Lời chào theo thời điểm trong ngày.
 *
 * Tên người dùng là dữ liệu backend trả về nên không được dịch.
 */
export const buildGreeting = (t: Translator, fullname?: string): string => {
  if (!fullname) {
    return t('greeting.anonymous');
  }

  const hour = new Date().getHours();
  const greetingKey =
    hour < 12
      ? 'greeting.morning'
      : hour < 18
        ? 'greeting.afternoon'
        : 'greeting.evening';

  return t(greetingKey, { name: fullname });
};