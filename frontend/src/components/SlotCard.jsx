import { Link } from 'react-router-dom';
import Spinner from './Spinner.jsx';
import { ClockIcon, StethoscopeIcon } from './Icons.jsx';
import { durationMinutes, formatRange } from '../utils/datetime.js';
import './SlotCard.css';

/**
 * One bookable slot.
 *
 * `taken` is the visible half of the backend's concurrency guarantee: when a
 * booking loses the race, the API returns 409 and this card says so plainly
 * instead of surfacing a generic error somewhere else on the page.
 */
export default function SlotCard({ slot, onBook, pending, taken, canBook, signedIn }) {
  const minutes = durationMinutes(slot.startTime, slot.endTime);

  const label = () => {
    if (taken) return 'Just taken';
    if (pending) return 'Booking…';
    if (!canBook) return 'Patients only';
    return 'Book';
  };

  return (
    <article className={`slot-card${taken ? ' is-taken' : ''}`}>
      <div className="slot-time">
        <ClockIcon width={15} height={15} />
        <span>{formatRange(slot.startTime, slot.endTime)}</span>
      </div>

      <div className="slot-doctor">
        <span className="slot-avatar" aria-hidden="true">
          <StethoscopeIcon width={16} height={16} />
        </span>
        <div>
          <strong>{slot.doctorName ?? 'Doctor'}</strong>
          <span className="muted small">{minutes} min consultation</span>
        </div>
      </div>

      {taken ? (
        <p className="slot-taken-note">
          Someone else booked this while you were looking. Refreshing the list…
        </p>
      ) : !signedIn ? (
        // A disabled button would be a dead end. Send them somewhere useful,
        // and bring them back to this page once they are signed in.
        <Link to="/login" state={{ from: '/slots' }} className="btn btn-soft btn-block">
          Sign in to book
        </Link>
      ) : (
        <button
          type="button"
          className="btn btn-soft btn-block"
          onClick={() => onBook(slot)}
          disabled={pending || !canBook}
        >
          {pending && <Spinner size={14} />}
          {label()}
        </button>
      )}
    </article>
  );
}
