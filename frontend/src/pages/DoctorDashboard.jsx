import { useCallback, useEffect, useState } from 'react';
import { slotsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Field from '../components/Field.jsx';
import Spinner, { LoadingPanel } from '../components/Spinner.jsx';
import { CalendarIcon, PlusIcon, UserIcon } from '../components/Icons.jsx';
import {
  dayKey,
  formatDayLong,
  formatRange,
  isPast,
  localInputToIso,
  nowForInput,
} from '../utils/datetime.js';
import './DoctorDashboard.css';

const DURATIONS = [15, 20, 30, 45, 60];

/**
 * Repeating the same date on every row is noise when a doctor publishes a
 * full day of slots, so the date is shown once per day and the rows below it
 * carry only their times.
 */
const groupByDay = (slots) => {
  const groups = new Map();
  for (const slot of slots) {
    const key = dayKey(slot.startTime);
    if (!groups.has(key)) groups.set(key, { key, date: slot.startTime, slots: [] });
    groups.get(key).slots.push(slot);
  }
  return [...groups.values()];
};

export default function DoctorDashboard() {
  const { token, user } = useAuth();

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [start, setStart] = useState('');
  const [duration, setDuration] = useState(30);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setSlots(await slotsApi.listMine(token));
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setFeedback(null);

    const startIso = localInputToIso(start);
    if (!startIso) {
      setFormError('Pick a start date and time.');
      return;
    }
    // Same rule the server enforces; checking here saves a round trip on the
    // most common mistake. The server remains the authority.
    if (new Date(startIso).getTime() <= Date.now()) {
      setFormError('The slot must start in the future.');
      return;
    }

    const endIso = new Date(new Date(startIso).getTime() + duration * 60000).toISOString();

    setSubmitting(true);
    try {
      await slotsApi.create({ startTime: startIso, endTime: endIso }, token);
      setFeedback({ tone: 'success', text: 'Slot published. Patients can book it now.' });
      setStart('');
      await load();
    } catch (error) {
      setFeedback({ tone: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const upcoming = slots.filter((slot) => !isPast(slot.startTime));
  const bookedCount = upcoming.filter((slot) => slot.status === 'booked').length;

  return (
    <div className="shell page">
      <div className="page-head">
        <span className="eyebrow">Doctor</span>
        <h1>Your schedule</h1>
        <p>
          Signed in as {user?.name}. Publish the times you are available and see who has booked them.
        </p>
      </div>

      <div className="dash-grid">
        <aside className="card card-pad publish-panel">
          <h2 className="panel-title">
            <PlusIcon width={17} height={17} />
            Publish a slot
          </h2>

          <form className="publish-form" onSubmit={handleSubmit} noValidate>
            <Field
              label="Starts at"
              type="datetime-local"
              value={start}
              min={nowForInput()}
              onChange={(event) => {
                setStart(event.target.value);
                setFormError('');
              }}
              error={formError}
            />

            <Field
              label="Duration"
              as="select"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            >
              {DURATIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </Field>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting && <Spinner size={15} />}
              {submitting ? 'Publishing…' : 'Publish slot'}
            </button>
          </form>

          {feedback && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Alert tone={feedback.tone} onDismiss={() => setFeedback(null)}>
                {feedback.text}
              </Alert>
            </div>
          )}

          <div className="publish-stats">
            <div>
              <strong>{upcoming.length}</strong>
              <span className="muted small">Upcoming</span>
            </div>
            <div>
              <strong>{bookedCount}</strong>
              <span className="muted small">Booked</span>
            </div>
          </div>
        </aside>

        <section className="dash-main">
          <h2 className="section-title">Published slots</h2>

          {loading ? (
            <LoadingPanel label="Loading your slots…" />
          ) : loadError ? (
            <EmptyState icon={<CalendarIcon width={22} height={22} />} title="Could not load slots">
              {loadError}
            </EmptyState>
          ) : slots.length === 0 ? (
            <EmptyState icon={<CalendarIcon width={22} height={22} />} title="No slots published yet">
              Use the form to publish your first availability. It appears to patients immediately.
            </EmptyState>
          ) : (
            <div className="day-list">
              {groupByDay(slots).map((day) => (
                <section key={day.key}>
                  <header className="dash-day-head">
                    <h3>{formatDayLong(day.date)}</h3>
                    <span className="muted small">
                      {day.slots.filter((s) => s.status === 'booked').length} of {day.slots.length}{' '}
                      booked
                    </span>
                  </header>

                  <div className="slot-rows">
                    {day.slots.map((slot) => {
                      const booked = slot.status === 'booked';
                      return (
                        <article
                          key={slot.id}
                          className={`slot-row${isPast(slot.startTime) ? ' is-past' : ''}`}
                        >
                          <div className="slot-row-when">
                            <strong>{formatRange(slot.startTime, slot.endTime)}</strong>
                          </div>

                          <div className="slot-row-who">
                            {booked ? (
                              <>
                                <UserIcon width={15} height={15} />
                                <span>{slot.patientName}</span>
                              </>
                            ) : (
                              <span className="muted small">No booking yet</span>
                            )}
                          </div>

                          <span className={`badge ${booked ? 'badge-booked' : 'badge-available'}`}>
                            <span className="badge-dot" />
                            {booked ? 'Booked' : 'Available'}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
