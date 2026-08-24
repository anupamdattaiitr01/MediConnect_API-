import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingPanel } from './Spinner.jsx';
import EmptyState from './EmptyState.jsx';
import { AlertIcon } from './Icons.jsx';

/**
 * Gates a route on being signed in, and optionally on a role.
 *
 * Waiting for `loading` matters: without it, refreshing /dashboard renders the
 * login page for a frame before the stored token has been verified.
 */
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="shell page">
        <LoadingPanel label="Checking your session…" />
      </div>
    );
  }

  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    // Explaining beats a silent redirect, which just looks broken.
    return (
      <div className="shell page">
        <EmptyState icon={<AlertIcon width={22} height={22} />} title={`${role}s only`}>
          You are signed in as a {user.role}, and this page is for {role}s.
        </EmptyState>
      </div>
    );
  }

  return children;
}
