import { useLocation } from 'react-router-dom';

import { DataState } from '../components/ui/DataState';
import { PageHeading } from '../components/ui/PageHeading';
import { Panel } from '../components/ui/Panel';
import { findNavigationItem } from '../config/navigation';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Page mức tối thiểu cho route đã có menu nhưng chưa có nghiệp vụ.
 *
 * Tiêu đề và mô tả lấy từ navigation config theo path hiện tại, nên label chỉ
 * được khai báo một chỗ. Không giả lập dữ liệu backend: chỉ nêu rõ trạng thái
 * chưa triển khai để navigation không dẫn tới route chết.
 */
export const PlaceholderPage = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  const navItem = findNavigationItem(pathname);

  return (
    <>
      <PageHeading
        title={navItem ? t(navItem.labelKey) : t('common.notFoundTitle')}
        description={navItem?.descriptionKey ? t(navItem.descriptionKey) : undefined}
      />

      <Panel>
        <DataState
          variant="unavailable"
          title={t('common.comingSoonTitle')}
          description={t('common.comingSoonBody')}
        />
      </Panel>
    </>
  );
};