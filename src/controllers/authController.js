import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { asyncHandler, httpError } from '../middleware/errorHandler.js';
import { isEmail, isNonEmptyString } from '../utils/validation.js';

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = '24h';

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!isNonEmptyString(name)) throw httpError(400, 'name is required.');
  if (!isEmail(email)) throw httpError(400, 'A valid email is required.');
  if (typeof password !== 'string' || password.length < 8) {
    throw httpError(400, 'password must be at least 8 characters.');
  }
  // Only these two roles can be self-assigned at signup.
  if (role !== 'patient' && role !== 'doctor') {
    throw httpError(400, "role must be either 'patient' or 'doctor'.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // A duplicate email raises 23505, which the error handler turns into a 409.
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, lower($2), $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name.trim(), email.trim(), passwordHash, role]
  );

  const user = rows[0];
  res.status(201).json({ success: true, data: { user, token: signToken(user) } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!isEmail(email) || typeof password !== 'string' || password.length === 0) {
    throw httpError(400, 'email and password are required.');
  }

  const { rows } = await query(
    `SELECT id, name, email, role, password_hash, created_at
       FROM users WHERE email = lower($1)`,
    [email.trim()]
  );

  const user = rows[0];
  // Identical response whether the email is unknown or the password is wrong,
  // so this endpoint cannot be used to discover which emails are registered.
  const passwordMatches = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!user || !passwordMatches) throw httpError(401, 'Invalid email or password.');

  delete user.password_hash;
  res.json({ success: true, data: { user, token: signToken(user) } });
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  if (rows.length === 0) throw httpError(404, 'Account not found.');
  res.json({ success: true, data: rows[0] });
});
