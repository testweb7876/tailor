const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });

const signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });

const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwt.refreshSecret);

/* '15m' | '7d' | '30s' | '2h' | '900' (raw seconds) -> milliseconds, for cookie maxAge. */
const parseDuration = (str) => {
  const m = String(str).match(/^(\d+)\s*([smhd])?$/);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2] || 's'];
  return n * unit;
};

const cookieBase = (secure) => ({
  httpOnly: true,
  secure,
  sameSite: secure ? 'none' : 'lax',
  path: '/',
});

/* Sign access + refresh for a user and set them as httpOnly cookies. Returns access token. */
const setAuthCookies = (res, user) => {
  const access = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refresh = signRefreshToken({ sub: user._id.toString(), tv: user.tokenVersion });
  const base = cookieBase(env.cookieSecure);
  res.cookie('accessToken', access, { ...base, maxAge: parseDuration(env.jwt.accessExpires) });
  res.cookie('refreshToken', refresh, { ...base, maxAge: parseDuration(env.jwt.refreshExpires) });
  return access;
};

const clearAuthCookies = (res) => {
  const base = cookieBase(env.cookieSecure);
  res.clearCookie('accessToken', base);
  res.clearCookie('refreshToken', base);
};

const signDownloadToken = (userId) =>
  jwt.sign({ sub: userId.toString() }, env.jwt.accessSecret, { expiresIn: '60s' });

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  parseDuration,
  cookieBase,
  setAuthCookies,
  clearAuthCookies,
  signDownloadToken,
};
