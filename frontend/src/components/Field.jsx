import { useId } from 'react';

/**
 * A labelled input with an inline error.
 *
 * useId keeps label/input/error wired together correctly even when the same
 * field renders more than once on a page.
 */
export default function Field({ label, error, hint, as = 'input', children, ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  const shared = {
    id,
    className: 'input',
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
    ...inputProps,
  };

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>

      {as === 'select' ? <select {...shared}>{children}</select> : <input {...shared} />}

      {hint && !error && (
        <span className="small muted" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}
