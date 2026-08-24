/** Creates an error the handler below turns into a specific status, e.g. httpError(409, '...'). */
export const httpError = (status, message) => Object.assign(new Error(message), { status });

/** Sends a rejected promise from an async controller to the error handler instead of hanging the request. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

/**
 * One place that turns a thrown error into a response.
 *
 * Controllers call `next(error)` instead of catching, so this handler is the
 * only thing that formats failures -- and PostgreSQL error codes get mapped to
 * sensible HTTP statuses here rather than surfacing as a generic 500.
 */
// The unused `next` is required: Express detects an error handler by its arity.
export const errorHandler = (err, req, res, next) => {
  // Checked before err.status, because express.json() sets a status on its
  // parse errors too -- and its raw message ("Unexpected end of JSON input")
  // is not something to hand a client.
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON.' });
  }

  // Errors we raised on purpose already carry the status they deserve.
  if (err.status) {
    return res.status(err.status).json({ success: false, message: err.message });
  }

  switch (err.code) {
    // A malformed UUID reaches Postgres as invalid input. That is the client's
    // mistake, so it is a 400 -- not a 500.
    case '22P02':
      return res.status(400).json({ success: false, message: 'Invalid id or value format.' });
    case '23505': // unique_violation
      if (err.constraint === 'bookings_slot_id_key') {
        return res.status(409).json({ success: false, message: 'This slot is already booked.' });
      }
      if (err.constraint === 'users_email_key') {
        return res.status(409).json({ success: false, message: 'That email is already registered.' });
      }
      return res.status(409).json({ success: false, message: 'That record already exists.' });
    case '23503': // foreign_key_violation
      return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
    case '23514': // check_violation
      return res.status(400).json({ success: false, message: 'Value violates a database constraint.' });
    default:
      break;
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ success: false, message: 'Internal server error.' });
};
