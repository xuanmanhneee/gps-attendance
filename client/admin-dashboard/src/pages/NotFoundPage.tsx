import { useNavigate } from 'react-router-dom';

import { useTranslation } from '../hooks/useTranslation';
import { ROUTE_PATHS } from '../routes/paths';
import { MessagePage } from './MessagePage';

const NotFoundPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <MessagePage
      variant="unavailable"
      title={t('common.notFoundTitle')}
      description={t('common.notFoundBody')}
      actionLabel={t('common.backToDashboard')}
      onAction={() => navigate(ROUTE_PATHS.overview, { replace: true })}
    />
  );
};

export default NotFoundPage;