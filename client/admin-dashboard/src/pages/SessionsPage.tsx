import { useState } from 'react';
import { MdAdd } from 'react-icons/md';

import { CreateSessionModal } from '../components/CreateSessionModal';
import SessionTable from '../components/SessionTable';
import { PageHeading } from '../components/ui/PageHeading';
import { Panel } from '../components/ui/Panel';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { useAttendanceSessions } from '../hooks/useAttendanceSessions';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Danh sách phiên điểm danh của lecturer, giữ nguyên luồng tạo phiên cũ.
 *
 * Chỉ hiển thị cho tài khoản role `lecturer` (xem `RoleGuard`).
 */
const SessionsPage = () => {
  const { t } = useTranslation();

  const { sessions, isLoading, hasError, createSession, reload } =
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
          hasError={hasError}
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

export default SessionsPage;