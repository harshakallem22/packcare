import { useMe } from './api/hooks';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return <div className="center muted">Loading…</div>;
  }
  return me ? <Dashboard me={me} /> : <Login />;
}
