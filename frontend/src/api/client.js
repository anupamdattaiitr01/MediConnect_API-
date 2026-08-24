const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');

/**
 * An error carrying the HTTP status, so callers can branch on it.
 *
 * `BrowseSlots` needs to tell a 409 ("someone else just took this slot") apart
 * from a generic failure, and only the status makes that reliable.
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // fetch only rejects when the request never completed -- server down, DNS,
    // offline. There is no status to report, so say something actionable.
    throw new ApiError('Cannot reach the server. Is the API running?', 0);
  }

  if (response.status === 204) return null;

  // A crashed server can return HTML, so a failed parse must not mask the status.
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.message ?? `Request failed (${response.status}).`, response.status);
  }

  return payload;
}

/**
 * The API is inconsistent about the slot id: `GET /slots` and `GET /slots/my`
 * return it as `slot_id`, while `POST /slots` returns it as `id`. Normalising
 * here keeps that quirk out of every component.
 */
const normaliseSlot = (raw) => ({
  id: raw.slot_id ?? raw.id,
  startTime: raw.start_time,
  endTime: raw.end_time,
  status: raw.status ?? 'available',
  doctorId: raw.doctor_id ?? null,
  doctorName: raw.doctor_name ?? null,
  patientId: raw.patient_id ?? null,
  patientName: raw.patient_name ?? null,
});

const normaliseBooking = (raw) => ({
  id: raw.id,
  slotId: raw.slot_id,
  createdAt: raw.created_at,
  startTime: raw.start_time,
  endTime: raw.end_time,
  doctorId: raw.doctor_id ?? null,
  doctorName: raw.doctor_name ?? null,
});

export const authApi = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),
};

export const slotsApi = {
  async listAvailable() {
    const payload = await request('/slots');
    return (payload?.data ?? []).map(normaliseSlot);
  },
  async listMine(token) {
    const payload = await request('/slots/my', { token });
    return (payload?.data ?? []).map(normaliseSlot);
  },
  async create({ startTime, endTime }, token) {
    const payload = await request('/slots', { method: 'POST', body: { startTime, endTime }, token });
    return normaliseSlot(payload.data);
  },
};

export const bookingsApi = {
  async create(slotId, token) {
    const payload = await request('/bookings', { method: 'POST', body: { slotId }, token });
    return normaliseBooking(payload.data);
  },
  async listMine(token) {
    const payload = await request('/bookings/my', { token });
    return (payload?.data ?? []).map(normaliseBooking);
  },
};
