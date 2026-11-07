import { useContext } from 'react';

import { LocaleContext } from '../context/locale-context-value';

/** Trả về hàm dịch `t` cùng locale hiện tại. */
export const useTranslation = () => {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useTranslation must be used within LocaleProvider');
  }

  return context;
};
