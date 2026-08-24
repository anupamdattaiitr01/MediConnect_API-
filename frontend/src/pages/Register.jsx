import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Field from '../components/Field.jsx';
import Spinner from '../components/Spinner.jsx';
import { StethoscopeIcon, UserIcon } from '../components/Icons.jsx';
import { landingPathFor } from '../utils/routing.js';
import './Auth.css';

const ROLES = [
  { value: 'patient', label: 'Patient', blurb: 'Book appointments', Icon: UserIcon },
  { value: 'doctor', label: 'Doctor', blurb: 'Publish your slots', Icon: StethoscopeIcon },
];

/**
 * Mirrors the server's rules so a typo is caught instantly. The server still
 * decides -- these checks only save a round trip.
 */
const validate = ({ name, email, password }) => {
  const errors = {};
  if (name.trim().length < 2) errors.name = 'Please enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  return errors;
};

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={landingPathFor(user)} replace />;

  const update = (key) => (event) => {
    const { value } = event.target;
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear this field's error as soon as the user starts fixing it.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const found = validate(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSubmitting(true);
    try {
      const created = await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      navigate(landingPathFor(created), { replace: true });
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="card auth-card">
        <div className="auth-head">
          <h1>Create your account</h1>
          <p>Join as a patient to book care, or as a doctor to offer it.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Alert tone="error">{serverError}</Alert>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field-label" style={{ padding: 0, marginBottom: 6 }}>
              I am a
            </legend>
            <div className="role-group">
              {ROLES.map(({ value, label, blurb, Icon }) => (
                <label
                  key={value}
                  className={`role-option${form.role === value ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={form.role === value}
                    onChange={update('role')}
                  />
                  <Icon width={20} height={20} />
                  <strong>{label}</strong>
                  <span>{blurb}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field
            label="Full name"
            autoComplete="name"
            placeholder="Riya Sharma"
            value={form.name}
            onChange={update('name')}
            error={errors.name}
          />

          <Field
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
          />

          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            hint="Minimum 8 characters."
          />

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting && <Spinner size={15} />}
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
