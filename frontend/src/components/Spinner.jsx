import './Spinner.css';

export default function Spinner({ size = 18, label }) {
  return (
    <span className="spinner-wrap">
      <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
      {label ? <span className="muted small">{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

/** Full-panel loading state, so pages do not jump between empty and loaded. */
export function LoadingPanel({ label = 'Loading…' }) {
  return (
    <div className="loading-panel card card-pad">
      <Spinner size={22} label={label} />
    </div>
  );
}
