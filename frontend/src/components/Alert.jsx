import { AlertIcon, CheckIcon } from './Icons.jsx';
import './Alert.css';

/**
 * `role="status"` with aria-live announces booking results to a screen reader,
 * which otherwise gets no feedback when a card silently changes state.
 */
export default function Alert({ tone = 'info', children, onDismiss }) {
  if (!children) return null;

  return (
    <div className={`alert alert-${tone}`} role="status" aria-live="polite">
      <span className="alert-icon">{tone === 'success' ? <CheckIcon /> : <AlertIcon />}</span>
      <span className="grow">{children}</span>
      {onDismiss && (
        <button type="button" className="alert-close" onClick={onDismiss} aria-label="Dismiss">
          &times;
        </button>
      )}
    </div>
  );
}
