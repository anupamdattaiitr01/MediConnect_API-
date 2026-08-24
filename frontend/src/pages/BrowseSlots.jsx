import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, bookingsApi, slotsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SlotCard from '../components/SlotCard.jsx';
import { LoadingPanel } from '../components/Spinner.jsx';
import { CalendarIcon } from '../components/Icons.jsx';
import { dayKey, formatDayLong, relativeDay } from '../utils/datetime.js';
import './BrowseSlots.css';

/** Groups slots into day sections, preserving the API's chronological order. */
const groupByDay = (slots) => {
  const groups = new Map();

  for (const slot of slots) {
    const key = dayKey(slot.startTime);
    if (!groups.has(key)) groups.set(key, { key, date: slot.startTime, slots: [] });
    groups.get(key).slots.push(slot);
  }

  return [...groups.values()];
};

export default function BrowseSlots() {
  const { user, token, isPatient, logout } = useAuth();
  const navigate = useNavigate();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [takenId, setTakenId] = useState(null);

  const load = useCallback(async () => {
    try {
      setSlots(await slotsApi.listAvailable());
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleBook = async (slot) => {
    setFeedback(null);
    setTakenId(null);
    // Per-card pending state: only this card spins, and a second click on it
    // cannot fire a duplicate request.
    setPendingId(slot.id);

    try {
      await bookingsApi.create(slot.id, token);
      setFeedback({ tone: 'success', text: `Appointment confirmed with ${slot.doctorName}.` });
      // Drop it immediately so the list never shows a slot that is now gone.
      setSlots((current) => current.filter((entry) => entry.id !== slot.id));
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      if (error.status === 409) {
        /*
         * Lost the race. The server's atomic claim means exactly one of the
         * concurrent requests won, and it was not this one. Mark the card so
         * the user understands what happened, then refresh -- the slot is
         * genuinely unavailable now, not just erroring.
         */
        setTakenId(slot.id);
        setFeedback({
          tone: 'error',
          text: 'That slot was booked by someone else a moment ago. Here are the latest openings.',
        });
        setTimeout(() => {
          setTakenId(null);
          load();
        }, 1800);
      } else if (error.status === 401) {
        logout();
        navigate('/login', { replace: true, state: { from: '/slots' } });
      } else if (error.status === 404) {
        setFeedback({ tone: 'error', text: 'That slot no longer exists.' });
        load();
      } else {
        setFeedback({ tone: 'error', text: error.message });
      }
    } finally {
      setPendingId(null);
    }
  };

  const days = useMemo(() => groupByDay(slots), [slots]);

  return (
    <div className="shell page">
      <div className="page-head">
        <span className="eyebrow">Availability</span>
        <h1>Find an appointment</h1>
        <p>
          {loading
            ? 'Loading open slots…'
            : `${slots.length} open slot${slots.length === 1 ? '' : 's'} across ${days.length} day${
                days.length === 1 ? '' : 's'
              }.`}
        </p>
      </div>

      {feedback && (
        <div className="browse-feedback">
          <Alert tone={feedback.tone} onDismiss={() => setFeedback(null)}>
            {feedback.text}
          </Alert>
        </div>
      )}

      {!user && !loading && (
        <div className="browse-feedback">
          <Alert tone="info">Sign in as a patient to book any of these slots.</Alert>
        </div>
      )}

      {loading ? (
        <LoadingPanel label="Fetching available slots…" />
      ) : loadError ? (
        <EmptyState icon={<CalendarIcon width={22} height={22} />} title="Could not load slots">
          {loadError}
          <button type="button" className="btn btn-soft btn-sm" onClick={load} style={{ marginTop: 12 }}>
            Try again
          </button>
        </EmptyState>
      ) : slots.length === 0 ? (
        <EmptyState icon={<CalendarIcon width={22} height={22} />} title="No open slots right now">
          Every published slot has been booked. Check back shortly — doctors add new times often.
        </EmptyState>
      ) : (
        <div className="day-list">
          {days.map((day) => (
            <section key={day.key} className="day-group">
              <header className="day-head">
                <h2>{formatDayLong(day.date)}</h2>
                {relativeDay(day.date) && <span className="badge badge-available">{relativeDay(day.date)}</span>}
                <span className="muted small">{day.slots.length} available</span>
              </header>

              <div className="slot-grid">
                {day.slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onBook={handleBook}
                    pending={pendingId === slot.id}
                    taken={takenId === slot.id}
                    signedIn={Boolean(user)}
                    canBook={isPatient}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
