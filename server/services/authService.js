const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyRefreshToken } = require('../utils/tokens');

/* Verify credentials and return the active user. Generic message on failure so we
   don't leak whether an email exists. */
async function login(email, plainPassword) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +status');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await user.comparePassword(plainPassword);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  if (user.status !== 'active') throw ApiError.forbidden('Your account has been disabled');

  user.lastLogin = new Date();
  await user.save();
  return user;
}

/* Validate a refresh token, ensuring the token version still matches (not revoked). */
async function refresh(refreshToken) {
  if (!refreshToken) throw ApiError.unauthorized('No refresh token');

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Refresh token expired or invalid');
  }

  const user = await User.findById(decoded.sub).select('+status');
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.status !== 'active') throw ApiError.forbidden('Account disabled');
  if (user.tokenVersion !== decoded.tv) throw ApiError.unauthorized('Session revoked, please log in again');

  return user;
}

/* Change own password. Verifies current password, then bumps tokenVersion so every
   other session is logged out. Returns the reloaded user (new tokenVersion). */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');

  user.password = newPassword;
  user.tokenVersion += 1;
  await user.save();
  return user;
}

module.exports = { login, refresh, changePassword };
