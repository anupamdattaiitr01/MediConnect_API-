import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { LoadingPanel } from '../components/Spinner.jsx';
import { CalendarIcon, ClockIcon, InboxIcon, StethoscopeIcon } from '../components/Icons.jsx';
import { formatDayLong, formatRange, isPast, relativeDay } from '../utils/datetime.js';
import './MyBookings.css';

export default function MyBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setBookings(await bookingsApi.listMine(token));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // The API returns everything; split so the next appointment is what you see first.
  const upcoming = bookings.filter((b) => !isPast(b.startTime));
  const past = bookings.filter((b) => isPast(b.startTime));

  const renderCard = (booking, isHistory) => (
    <article key={booking.id} className={`booking-card${isHistory ? ' is-past' : ''}`}>
      <div className="booking-when">
        <span className="booking-day">{formatDayLong(booking.startTime)}</span>
        <span className="booking-time">
          <ClockIcon width={14} height={14} />
          {formatRange(booking.startTime, booking.endTime)}
        </span>
      </div>

      <div className="booking-doctor">
        <span className="booking-avatar" aria-hidden="true">
          <StethoscopeIcon width={16} height={16} />
        </span>
        <div>
          <strong>{booking.doctorName ?? 'Doctor'}</strong>
          <span className="muted small">Consultation</span>
        </div>
      </div>

      <span className={`badge ${isHistory ? 'badge-booked' : 'badge-available'}`}>
        <span className="badge-dot" />
        {isHistory ? 'Completed' : (relativeDay(booking.startTime) ?? 'Confirmed')}
      </span>
    </article>
  );

  return (
    <div className="shell page">
      <div className="page-head">
        <span className="eyebrow">Your care</span>
        <h1>My appointments</h1>
        <p>Everything you have booked, newest first.</p>
      </div>

      {loading ? (
        <LoadingPanel label="Loading your appointments…" />
      ) : error ? (
        <EmptyState icon={<CalendarIcon width={22} height={22} />} title="Could not load appointments">
          {error}
        </EmptyState>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<InboxIcon width={22} height={22} />}
          title="No appointments yet"
          action={
            <Link to="/slots" className="btn btn-primary btn-sm">
              Find a slot
            </Link>
          }
        >
          When you book a slot it will show up here with the doctor and time.
        </EmptyState>
      ) : (
        <div className="booking-sections">
          {upcoming.length > 0 && (
            <section>
              <h2 className="section-title">Upcoming ({upcoming.length})</h2>
              <div className="booking-list">{upcoming.map((b) => renderCard(b, false))}</div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="section-title">Past ({past.length})</h2>
              <div className="booking-list">{past.map((b) => renderCard(b, true))}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
