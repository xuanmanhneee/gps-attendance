import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/auth-context';
import { LocaleProvider } from './context/locale-context';
import { ThemeProvider } from './context/theme-context';
import AppRoutes from './routes/AppRoutes';

/**
 * Locale/theme độc lập với auth; role hiển thị được suy ra từ auth context
 * (`useRole`) nên không cần provider riêng.
 */
function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastContainer position="top-right" autoClose={3000} />
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}

export default App;
