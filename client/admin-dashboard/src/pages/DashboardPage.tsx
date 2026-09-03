import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <h1>Dashboard</h1>

        <button className="logout-button" onClick={() => navigate('/login')}>
          Logout
        </button>
      </header>
    </main>
  );
}
