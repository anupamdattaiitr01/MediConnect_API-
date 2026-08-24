import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { LogoMark, LogoutIcon } from './Icons.jsx';
import './Navbar.css';

export default function Navbar() {
  const { user, isDoctor, isPatient, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="navbar">
      <div className="shell navbar-inner">
        <NavLink to="/" className="brand" aria-label="MediConnect home">
          <LogoMark />
          <span>MediConnect</span>
        </NavLink>

        <nav className="nav-links" aria-label="Main">
          <NavLink to="/slots">Find a slot</NavLink>
          {isPatient && <NavLink to="/bookings">My appointments</NavLink>}
          {isDoctor && <NavLink to="/dashboard">Dashboard</NavLink>}
        </nav>

        <div className="nav-actions">
          <ThemeToggle />

          {user ? (
            <>
              <span className="nav-user" title={user.email}>
                <span className="nav-avatar" aria-hidden="true">
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="nav-user-text">
                  <strong>{user.name}</strong>
                  <span className="muted small">{user.role}</span>
                </span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                <LogoutIcon width={15} height={15} />
                <span className="nav-logout-text">Log out</span>
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost btn-sm">
                Log in
              </NavLink>
              <NavLink to="/register" className="btn btn-dark btn-sm">
                Get started
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
