import { Navigate, Outlet } from 'react-router-dom';

import { LoadingState } from '../components/ui/DataState';
import { useAuth } from '../hooks/useAuth';
import { ROUTE_PATHS } from './paths';

const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingState />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={ROUTE_PATHS.login} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
