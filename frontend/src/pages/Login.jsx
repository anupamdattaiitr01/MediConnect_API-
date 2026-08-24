import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';
import { landingPathFor } from '../utils/routing.js';
import './Auth.css';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in: nothing to do here.
  if (user) return <Navigate to={landingPathFor(user)} replace />;

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const signedIn = await login(form);
      // Return them to whatever they were trying to reach, if anything.
      navigate(location.state?.from ?? landingPathFor(signedIn), { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="auth-head">
          <h1>Welcome back</h1>
          <p>Sign in to book and manage appointments.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Alert tone="error">{error}</Alert>

          <Field
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            required
          />

          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={update('password')}
            required
          />

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting && <Spinner size={15} />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-foot">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
