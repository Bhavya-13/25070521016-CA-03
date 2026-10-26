import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { UIProvider } from './context/UIContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Analytics from './pages/Analytics.jsx';
import Insights from './pages/Insights.jsx';
import Savings from './pages/Savings.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function Workspace() {
  return (
    <DataProvider>
      <UIProvider>
        <AppShell />
      </UIProvider>
    </DataProvider>
  );
}

function NotFound() {
  return (
    <div className="auth-page solo">
      <div className="card auth-card center">
        <h1>Page not found</h1>
        <p className="muted">That page does not exist.</p>
        <Link to="/dashboard" className="btn primary">Back to overview</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<Protected><Workspace /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subscriptions/*" element={<Subscriptions />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
