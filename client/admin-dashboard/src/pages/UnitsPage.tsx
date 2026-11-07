/**
 * Route `/units` — quản lý đơn vị cho Admin, nối trực tiếp Units API backend.
 * Route đã nằm trong `RoleGuard allowedRoles={['admin']}` nên giữ nguyên.
 */
import { UnitsPanel } from '../components/units/UnitsPanel';
import { useUnits } from '../hooks/useUnits';

const UnitsPage = () => {
  const unitsState = useUnits();

  return <UnitsPanel unitsState={unitsState} />;
};

export default UnitsPage;
