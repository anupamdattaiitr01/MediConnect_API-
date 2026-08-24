import jwt from 'jsonwebtoken';

/**
 * Reads the Bearer token and puts the caller's identity on `req.user`.
 *
 * The user id comes from the signed token and never from the request body.
 * That is the whole point: if the client could send `patientId`, anyone could
 * book an appointment in someone else's name.
 */
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: expired ? 'Session expired. Please log in again.' : 'Invalid token.',
    });
  }
};

/**
 * Role gate. Use after `authenticate`:
 *   router.post('/', authenticate, requireRole('doctor'), handler)
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: `This action is only allowed for: ${roles.join(', ')}.` });
    }
    return next();
  };
