import React from 'react';
import { MdErrorOutline, MdRefresh, MdHome } from 'react-icons/md';

export interface ErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
  className?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  title = 'Đã xảy ra lỗi kết nối',
  message = 'Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.',
  onRetry,
  onBack,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/40 p-8 text-center sm:p-12 ${className}`}
      role="alert"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 ring-8 ring-rose-50 mb-4">
        <MdErrorOutline className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-slate-600 leading-relaxed">
        {message}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
          >
            <MdRefresh className="h-4 w-4" />
            Thử lại
          </button>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition"
          >
            <MdHome className="h-4 w-4" />
            Về trang chủ
          </button>
        )}
      </div>
    </div>
  );
};
