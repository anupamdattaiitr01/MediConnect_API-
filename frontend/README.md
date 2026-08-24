# MediConnect — Frontend

React UI for the MediConnect booking API. Doctors publish slots, patients book them.

**Stack:** React · Vite · React Router · plain CSS (no CSS framework)

Three runtime dependencies: `react`, `react-dom`, `react-router-dom`. Icons are inline SVG and all
styling is hand-written, so there is no Tailwind, Bootstrap or component library anywhere.

---

## Running it

The API must be running first (see the README one level up — it needs Postgres on port 3000).

```bash
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000/api
npm run dev               # http://localhost:5173
```

Seeded logins, all with password `Password123!`:

| Role | Email |
|---|---|
| Doctor | `asha@mediconnect.test` |
| Patient | `riya@mediconnect.test` |

---

## Pages

| Route | Who | What |
|---|---|---|
| `/slots` | public | Open slots grouped by day. Booking needs a patient login. |
| `/bookings` | patient | Their appointments, split into upcoming and past. |
| `/dashboard` | doctor | Publish a slot, and see every published slot with who booked it. |
| `/login`, `/register` | public | Auth. Registration picks patient or doctor. |

`/` forwards to `/dashboard` or `/slots` depending on who is signed in.

---

## How it handles the double-booking race

The API's whole point is that concurrent bookings for one slot produce exactly one winner. The
loser gets a `409`, and the UI has to make that make sense rather than showing "something went
wrong".

In `BrowseSlots.jsx`, a `409` is handled distinctly from every other failure:

```js
if (error.status === 409) {
  setTakenId(slot.id);        // that card turns red: "Someone else booked this…"
  setFeedback({ tone: 'error', text: 'That slot was booked by someone else a moment ago…' });
  setTimeout(() => { setTakenId(null); load(); }, 1800);   // then refresh the real list
}
```

Two people clicking Book on the same card at the same instant: one sees "Appointment confirmed",
the other sees the card turn red and the list refresh without it. Neither sees a generic error, and
neither ends up with a booking that does not exist.

Booking also tracks a **per-card** pending id rather than one page-wide flag, so only the clicked
card shows a spinner and a double-click cannot fire two requests.

---

## Structure

```
src/
  api/client.js          The only file that knows about HTTP
  context/
    AuthContext.jsx      user, token, login/register/logout, localStorage
    ThemeContext.jsx     light | dark
  components/            Navbar, SlotCard, Field, Alert, Spinner, EmptyState,
                         ProtectedRoute, ThemeToggle, Icons  (+ a .css each)
  pages/                 Login, Register, BrowseSlots, MyBookings, DoctorDashboard
  utils/                 datetime formatting, role-based landing paths
  styles/
    tokens.css           every colour, in both themes
    base.css             reset, typography, .btn / .card / .input primitives
```

**`api/client.js`** throws an `ApiError` carrying `.status`, which is what lets `BrowseSlots`
single out the `409`. It also smooths over an inconsistency in the API: `GET /slots` returns the id
as `slot_id` while `POST /slots` returns it as `id`, so every slot is normalised to a common shape
on the way in and no component has to know.

**`AuthContext`** verifies a stored token with `GET /auth/me` on startup. A 24h JWT can expire while
the tab is closed, and rendering a signed-in layout around a dead token means every click fails —
so it is checked once and cleared if rejected.

---

## Theming

Every colour is a CSS custom property declared in `styles/tokens.css`, once for light and once for
`[data-theme='dark']`. No component hardcodes a colour, so the toggle just flips one attribute on
`<html>`.

The greens *lighten* in dark mode rather than darken: `#3e8e4e` against a near-black card is about
2.4:1 and fails contrast, so the accent moves up in luminance while keeping its hue.

An inline script in `index.html` applies the saved theme before React mounts, so a dark-mode user
never gets a white flash on first paint. The choice persists in `localStorage`, falling back to the
system `prefers-color-scheme`.

---

## Notes

- Every error state is handled: loading, empty, API unreachable (with a retry button), wrong role,
  expired session, and the 409 race.
- A `401` anywhere clears the session and redirects to `/login`, remembering where you were going.
- Wrong-role visits show an explanation rather than silently redirecting, which just looks broken.
- Responsive down to 360px; the slot grid collapses to one column and the nav scrolls horizontally.
- Keyboard accessible: real `<button>`/`<label>` elements, visible focus rings, and `aria-live` on
  alerts so booking results are announced.
