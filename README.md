# MediConnect API

An appointment booking REST API. Doctors publish time slots, patients book them.

The project focuses on two problems:

1. **Concurrent booking** — when several patients try to book the same slot at the same moment,
   exactly one must succeed.
2. **Role-based access** — doctors publish slots, patients book them, and neither can do the other's
   job.

**Stack:** Node.js · Express · PostgreSQL (`pg`, no ORM) · JWT · bcrypt

A React frontend for this API lives in [`frontend/`](./frontend) — run the API first, then
`cd frontend && npm install && npm run dev`.

> 📘 **[Engineering & Interview Guide](./docs/INTERVIEW-GUIDE.md)** — a deep walkthrough of every
> design decision here: the race condition, the fix, the alternatives rejected, and ~35 interview
> questions with answers. Also available as a [27-page PDF](./docs/MediConnect-Interview-Guide.pdf).

---

## Setup

```bash
git clone <repo> && cd MediConnect_API-
npm install

createdb mediconnect                 # any PostgreSQL 12+
cp .env.example .env                 # set DATABASE_URL and JWT_SECRET
npm run db:setup                     # creates the tables
npm run seed                         # 2 doctors, 2 patients, 16 slots
npm run dev
```

Generate a secret with `openssl rand -base64 32`. Seeded accounts all use the password
`Password123!` — `asha@mediconnect.test` (doctor) and `riya@mediconnect.test` (patient).

```bash
curl localhost:3000/health
curl localhost:3000/api/slots
```

---

## Preventing double booking

This is the core of the project.

### The problem

The obvious way to book a slot is to check it, then take it:

```js
const slot = await db.query('SELECT status FROM slots WHERE id = $1', [slotId]);
if (slot.status !== 'available') throw new Error('Already booked');
await db.query("UPDATE slots SET status = 'booked' WHERE id = $1", [slotId]);
```

This is broken. Two requests can both run the `SELECT` before either runs the `UPDATE`, so both see
`available` and both proceed. The slot gets booked twice.

```
Request A                     Request B
---------                     ---------
SELECT -> 'available'
                              SELECT -> 'available'     <-- A has not written yet
UPDATE -> booked
                              UPDATE -> booked          <-- overwrites; two bookings exist
```

Moving the two queries closer together does not fix it. It only makes the bad interleaving rarer,
which is worse — it means the bug shows up in production instead of in testing.

### The fix

Do the check and the write in **one statement**, so there is no gap between them:

```sql
UPDATE slots
   SET status = 'booked'
 WHERE id = $1 AND status = 'available'
RETURNING id, start_time, end_time;
```

PostgreSQL locks the row for the duration of each `UPDATE`, so concurrent writers are serialised.
Each one then evaluates `status = 'available'` against the row **as it stands after the previous
writer committed**. The first one flips the row and gets `rowCount: 1`. Every later one matches
nothing and gets `rowCount: 0`, which the API returns as `409 Conflict`.

The condition is part of the write, so there is no window to lose.

`rowCount: 0` is ambiguous — the slot might not exist, or might already be taken — so one follow-up
`SELECT` decides between `404` and `409`. Reading *after* the write is safe; reading before it is
what caused the bug.

### The safety net

The whole thing runs inside a transaction, and `bookings.slot_id` is `UNIQUE`:

```sql
slot_id UUID NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE
```

So even if the application logic were wrong, the database physically cannot store two bookings for
one slot. And because the claim and the insert share a transaction, a later failure (for example,
the slot turns out to be in the past) rolls the claim back and the slot returns to `available`
rather than being stranded as `booked` with nobody attached.

### Why not Redis?

A Redis distributed lock is a common answer to this question, but it would make this project worse:

- It adds a second service to run and deploy, for a problem the database already solves.
- A Redis lock is **weaker**. Locks need a timeout so a crashed process does not hold one forever —
  but if the holder stalls past that timeout, two clients hold the "lock" at once. Making it
  genuinely safe means adding fencing tokens and a database constraint behind it anyway.
- The `UPDATE ... WHERE status = 'available'` above cannot be beaten by any interleaving, needs no
  extra infrastructure, and is a few lines of SQL.

Redis earns its place when you need caching, or coordination across resources that *aren't* in one
database. Neither applies here.

### Verifying it

Fire 25 simultaneous requests at one slot:

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"riya@mediconnect.test","password":"Password123!"}' | jq -r .data.token)
SLOT=$(curl -s localhost:3000/api/slots | jq -r .data[0].slot_id)

for i in $(seq 1 25); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/bookings \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    -d "{\"slotId\":\"$SLOT\"}" &
done | sort | uniq -c
```

```
   1 201
  24 409
```

Then check the database agrees — this must return no rows no matter how many requests raced:

```sql
SELECT s.id, s.status, count(b.id) AS bookings
  FROM slots s LEFT JOIN bookings b ON b.slot_id = s.id
 GROUP BY s.id, s.status
HAVING (s.status = 'booked' AND count(b.id) <> 1)
    OR (s.status = 'available' AND count(b.id) <> 0);
```

---

## Role-based authentication

Passwords are hashed with bcrypt (cost 12) and never stored or returned in plain text. Logging in
returns a JWT containing the user's id and role, valid for 24 hours.

Two middlewares in `src/middleware/auth.js` do the work:

```js
router.post('/', authenticate, requireRole('doctor'), createSlot);
```

- `authenticate` verifies the token and sets `req.user = { id, role }`, or responds `401`.
- `requireRole('doctor')` responds `403` unless the role matches.

**The user id always comes from the token, never from the request body.** This matters: if the
client could send `patientId`, anyone could book an appointment in someone else's name. The same
applies to `doctor_id` when publishing a slot — it is taken from `req.user.id`, so a doctor can only
publish slots for themselves.

Login returns the same `401 Invalid email or password` whether the email is unknown or the password
is wrong, so the endpoint cannot be used to find out which emails have accounts.

---

## API

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | public | Sign up as `patient` or `doctor` |
| `POST` | `/api/auth/login` | public | Returns a JWT |
| `GET` | `/api/auth/me` | any logged-in user | Your profile |
| `GET` | `/api/slots` | public | All bookable future slots |
| `POST` | `/api/slots` | **doctor** | Publish a slot |
| `GET` | `/api/slots/my` | **doctor** | Your slots, with who booked them |
| `POST` | `/api/bookings` | **patient** | Book a slot |
| `GET` | `/api/bookings/my` | **patient** | Your bookings |
| `GET` | `/health` | public | Returns 503 if the database is unreachable |

### Example

```bash
API=localhost:3000/api

# Doctor publishes a slot
DOC=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"asha@mediconnect.test","password":"Password123!"}' | jq -r .data.token)

curl -X POST $API/slots -H "Authorization: Bearer $DOC" \
  -H 'Content-Type: application/json' \
  -d '{"startTime":"2026-12-01T09:00:00Z","endTime":"2026-12-01T09:30:00Z"}'

# Patient books it
PAT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"riya@mediconnect.test","password":"Password123!"}' | jq -r .data.token)

SLOT=$(curl -s $API/slots | jq -r .data[0].slot_id)
curl -X POST $API/bookings -H "Authorization: Bearer $PAT" \
  -H 'Content-Type: application/json' -d "{\"slotId\":\"$SLOT\"}"
```

### Responses

Success:

```json
{ "success": true, "message": "Appointment confirmed.", "data": { "id": "...", "slot_id": "..." } }
```

Failure:

```json
{ "success": false, "message": "This slot is already booked." }
```

| Status | When |
|---|---|
| `400` | Invalid input — bad UUID, malformed JSON, end time before start time |
| `401` | Missing, invalid or expired token |
| `403` | Valid token, wrong role for this endpoint |
| `404` | Slot does not exist |
| `409` | Slot already booked, appointment time already passed, email taken |

Controllers never catch their own errors — they call `next(error)`, and one handler in
`src/middleware/errorHandler.js` formats every failure. It also maps PostgreSQL error codes to
sensible statuses, so a malformed UUID (`22P02`) becomes a `400` instead of a `500`.

---

## Project structure

```
src/
  index.js                    Express setup, startup checks, graceful shutdown
  config/db.js                Connection pool + withTransaction() helper
  db/schema.sql               Tables, constraints, indexes
  middleware/
    auth.js                   authenticate, requireRole
    errorHandler.js           One place that turns errors into responses
  controllers/                Request handling and business logic
  routes/                     Endpoint definitions
  utils/validation.js         Small input checks
scripts/seed.js               Sample data
frontend/                     React UI for this API (see frontend/README.md)
```

### Database

Three tables: `users` (with a `role` of `patient` or `doctor`), `slots`, and `bookings`.

```sql
CREATE INDEX idx_slots_available ON slots (start_time) WHERE status = 'available';
```

A partial index — it only covers rows where `status = 'available'`, which is exactly what the
"list bookable slots" query filters on, so the index stays small.

---

## Not included

Deliberately out of scope, to keep the project focused:

- Cancelling or rescheduling a booking
- Doctor specialities, search and filtering
- Pagination (fine at this size; it would need adding before the slot list grows large)
- Email or SMS notifications
- Rate limiting and refresh tokens
