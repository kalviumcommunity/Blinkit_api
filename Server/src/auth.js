const { randomBytes, scrypt: scryptCallback, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { Pool } = require('pg');
const { Router } = require('express');
const scrypt = promisify(scryptCallback);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();
const cookieName = 'blinkit_session';
const duration = 7 * 24 * 60 * 60 * 1000;
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };
const hash = value => createHash('sha256').update(value).digest('hex');
const tokenFrom = req => (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);

async function initializeAuth() {
  await pool.query(`CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS app_sessions (
    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
  ); CREATE INDEX IF NOT EXISTS app_sessions_expiry ON app_sessions(expires_at);`);
}

async function requireAuth(req, res, next) {
  try {
    const token = tokenFrom(req);
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
    const result = await pool.query(`SELECT u.id, u.name, u.email FROM app_users u
      JOIN app_sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > NOW()`, [hash(token)]);
    if (!result.rows[0]) return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
    res.locals.user = result.rows[0];
    next();
  } catch (error) { next(error); }
}

async function createSession(req, res, user) {
  const token = randomBytes(32).toString('hex');
  await pool.query('DELETE FROM app_sessions WHERE expires_at <= NOW() OR token_hash = $1', [hash(tokenFrom(req) || '')]);
  await pool.query('INSERT INTO app_sessions(token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [hash(token), user.id, new Date(Date.now() + duration)]);
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: duration });
}

// Bound password hashing work and slow repeated credential attempts per client.
const attempts = new Map();
router.use((req, res, next) => {
  if (!['/login', '/signup'].includes(req.path) || req.method !== 'POST') return next();
  const now = Date.now();
  for (const [key, entry] of attempts) if (entry.reset <= now) attempts.delete(key);
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, reset: now + 60_000 };
  attempts.set(key, entry);
  if (++entry.count > 20) return res.status(429).json({ message: 'Too many attempts. Please try again in a minute.' });
  next();
});

router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
        typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ message: 'Enter a name, a valid email, and a password between 8 and 128 characters.' });
    }
    const salt = randomBytes(16).toString('hex');
    const derived = await scrypt(password, salt, 64);
    const result = await pool.query('INSERT INTO app_users(name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name.trim(), email.trim().toLowerCase(), `${salt}:${derived.toString('hex')}`]);
    await createSession(req, res, result.rows[0]);
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with that email already exists. Please log in.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 128 || !password.length)
      return res.status(400).json({ message: 'Enter your email and password.' });
    const result = await pool.query('SELECT * FROM app_users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = result.rows[0];
    const [salt, stored] = user ? user.password_hash.split(':') : ['missing-account', '00'.repeat(64)];
    const derived = await scrypt(password, salt, 64);
    if (!timingSafeEqual(derived, Buffer.from(stored, 'hex')) || !user)
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    const publicUser = { id: user.id, name: user.name, email: user.email };
    await createSession(req, res, publicUser);
    res.json({ user: publicUser });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (_req, res) => res.json({ user: res.locals.user }));
router.post('/logout', async (req, res, next) => {
  try {
    const token = tokenFrom(req);
    if (token) await pool.query('DELETE FROM app_sessions WHERE token_hash = $1', [hash(token)]);
    res.clearCookie(cookieName, cookieOptions);
    res.json({ message: 'Logged out.' });
  } catch (error) { next(error); }
});

module.exports = { authRouter: router, requireAuth, initializeAuth };
