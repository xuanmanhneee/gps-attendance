import { IoClose } from 'react-icons/io5';

interface CreateSessionModalHeaderProps {
  onClose: () => void;
}

export const CreateSessionModalHeader = ({
  onClose,
}: CreateSessionModalHeaderProps) => (
  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
    <div>
      <h2 className="text-lg font-bold text-gray-900">
        Tạo phiên điểm danh mới
      </h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Cấu hình phạm vi GPS, thời gian và sinh viên áp dụng
      </p>
    </div>
    <button
      onClick={onClose}
      type="button"
      aria-label="Đóng cửa sổ tạo phiên"
      className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
    >
      <IoClose className="text-xl" />
    </button>
  </div>
);
