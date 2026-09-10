interface CreateSessionModalActionsProps {
  isSubmitting: boolean;
  onClose: () => void;
}

export const CreateSessionModalActions = ({
  isSubmitting,
  onClose,
}: CreateSessionModalActionsProps) => (
  <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
    <button
      type="button"
      onClick={onClose}
      className="cursor-pointer rounded-lg px-4 py-2 text-base font-medium text-gray-600 transition-colors hover:bg-gray-100"
    >
      Hủy
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      className="cursor-pointer rounded-lg bg-blue-600 px-5 py-2 text-base font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
    >
      {isSubmitting ? 'Đang tạo...' : 'Tạo phiên điểm danh'}
    </button>
  </div>
);
