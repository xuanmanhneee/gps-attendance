import { useState } from 'react';
import { MdAdd } from 'react-icons/md';

import { CreateSessionModal } from '../components/CreateSessionModal';
import SessionTable from '../components/SessionTable';
import { ErrorState } from '../components/ui/DataState';
import { PageHeading } from '../components/ui/PageHeading';
import { Panel } from '../components/ui/Panel';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useLecturers } from '../hooks/useLecturers';
import { useRole } from '../hooks/useRole';
import { useTranslation } from '../hooks/useTranslation';
import { resolveSessionListScope } from '../utils/attendance-sessions/session-filter';

/**
 * View lecturer: giữ nguyên luồng cũ — danh sách phiên do mình tạo qua
 * `GET /created-by-me` và nút tạo phiên (backend chỉ cho role lecturer tạo).
 *
 * Không hiển thị bộ lọc lecturer vì endpoint `created-by` yêu cầu role admin.
 */
const LecturerSessionsView = () => {
  const { t } = useTranslation();

  const { sessions, isLoading, error, createSession, reload } =
    useAttendanceSessions({ scope: 'created-by-me' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <PageHeading
        title={t('navigation.attendanceSessions')}
        description={t('sessions.page.description')}
        action={
          <PrimaryButton
            label={t('dashboard.createSession')}
            icon={MdAdd}
            onClick={() => setIsCreateModalOpen(true)}
          />
        }
      />

      <Panel>
        <SessionTable
          sessions={sessions}
          isLoading={isLoading}
          error={error}
          onRetry={reload}
        />
      </Panel>

      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmitSuccess={async (data) => {
          await createSession(data);
          setIsCreateModalOpen(false);
        }}
      />
    </>
  );
};

/**
 * View admin: xem toàn bộ phiên và lọc theo lecturer qua
 * `GET /created-by?userId=...` (endpoint yêu cầu role admin).
 *
 * Không có nút tạo phiên vì backend chỉ cho role lecturer tạo; không đưa
 * UI lecturer vào trang này.
 */
const AdminSessionsView = () => {
  const { t } = useTranslation();

  const [selectedLecturerId, setSelectedLecturerId] = useState<number | null>(
    null,
  );
  const {
    lecturerOptions,
    isLoading: isLoadingLecturers,
    error: lecturersError,
    reload: reloadLecturers,
  } = useLecturers();

  // `null` (Tất cả lecturer) → API toàn bộ; id hợp lệ → created-by; id không
  // hợp lệ → `null` và hook không được gọi API nào.
  const scopeSelection = resolveSessionListScope(selectedLecturerId);
  const { sessions, isLoading, error, reload } = useAttendanceSessions({
    scope: scopeSelection?.scope ?? 'all',
    createdByUserId:
      scopeSelection?.scope === 'created-by'
        ? scopeSelection.createdByUserId
        : undefined,
    enabled: scopeSelection !== null,
  });

  const handleLecturerChange = (value: string) => {
    setSelectedLecturerId(value === '' ? null : Number(value));
  };

  return (
    <>
      <PageHeading
        title={t('navigation.attendanceSessions')}
        description={t('sessions.page.description')}
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <label
            htmlFor="sessions-lecturer-filter"
            className="text-[12px] font-bold text-ink"
          >
            {t('sessions.filter.label')}
          </label>
          <select
            id="sessions-lecturer-filter"
            value={selectedLecturerId ?? ''}
            disabled={isLoadingLecturers}
            onChange={(event) => handleLecturerChange(event.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[12px] text-ink outline-none transition-colors focus:border-accent-strong disabled:opacity-50"
          >
            <option value="">{t('sessions.filter.allLecturers')}</option>
            {lecturerOptions.map((option) => (
              <option key={option.userId} value={option.userId}>
                {option.label}
              </option>
            ))}
          </select>

          {isLoadingLecturers && (
            <p role="status" className="text-[11px] text-muted">
              {t('sessions.filter.loading')}
            </p>
          )}

          {lecturersError && (
            <p role="alert" className="flex items-center gap-2 text-[11px] font-bold text-danger">
              {t('sessions.filter.loadError')}
              <button
                type="button"
                onClick={reloadLecturers}
                className="rounded-lg border border-line bg-surface-subtle px-3 py-1 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong"
              >
                {t('common.retry')}
              </button>
            </p>
          )}
        </div>

        {scopeSelection === null ? (
          // Phòng ngừa: lựa chọn không hợp lệ thì không gọi API nào cả.
          <ErrorState
            title={t('common.errorTitle')}
            description={t('sessions.filter.invalidLecturer')}
          />
        ) : (
          <SessionTable
            sessions={sessions}
            isLoading={isLoading}
            error={error}
            onRetry={reload}
          />
        )}
      </Panel>
    </>
  );
};

/**
 * Danh sách phiên điểm danh, hiển thị theo role của tài khoản đã xác thực:
 *
 * - `admin` — toàn bộ phiên + bộ lọc theo lecturer.
 * - `lecturer` — phiên do mình tạo + luồng tạo phiên.
 */
const SessionsPage = () => {
  const role = useRole();

  return role === 'admin' ? <AdminSessionsView /> : <LecturerSessionsView />;
};

export default SessionsPage;