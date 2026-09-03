import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <main className="login-page">
      <form
        className="login-form"
        onSubmit={(event) => {
          event.preventDefault();
          navigate('/dashboard');
        }}
      >
        <h1>Login</h1>

        <div>
          <label htmlFor="username">Username</label>
          <input id="username" type="text" />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input id="password" type="password" />
        </div>

        <button type="submit">Login</button>
      </form>
    </main>
  );
}
