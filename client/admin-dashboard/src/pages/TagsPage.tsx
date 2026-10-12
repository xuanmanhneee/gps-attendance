/**
 * Route `/tags` — quản lý tag cho Admin, nối trực tiếp Tags API backend.
 * Route đã nằm trong `RoleGuard allowedRoles={['admin']}` nên giữ nguyên.
 */
import { toast } from 'react-toastify';

import { TagsPanel } from '../components/tags/TagsPanel';
import { useTagAssignment } from '../hooks/useTagAssignment';
import { useTags } from '../hooks/useTags';

const TagsPage = () => {
  const tagsState = useTags();
  const assignmentState = useTagAssignment();

  return (
    <TagsPanel
      tagsState={tagsState}
      assignmentState={assignmentState}
      onToastSuccess={(message) => toast.success(message)}
    />
  );
};

export default TagsPage;
