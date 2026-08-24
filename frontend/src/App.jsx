import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import EmptyState from './components/EmptyState.jsx';
import { AlertIcon } from './components/Icons.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { landingPathFor } from './utils/routing.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import BrowseSlots from './pages/BrowseSlots.jsx';
import MyBookings from './pages/MyBookings.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';

/** '/' is not a page -- it forwards to wherever this visitor belongs. */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={landingPathFor(user)} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />

      <main>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public: browsing works signed out, booking does not. */}
          <Route path="/slots" element={<BrowseSlots />} />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute role="patient">
                <MyBookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <div className="shell page">
                <EmptyState icon={<AlertIcon width={22} height={22} />} title="Page not found">
                  That page does not exist. Try Find a slot from the menu above.
                </EmptyState>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  );
}
