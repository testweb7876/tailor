const { verifyAccessToken } = require('../utils/tokens');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

module.exports = async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Fallback: short-lived download token via query string — used only for
    // window.open() print/export links where cookies may not attach reliably.
    if (!token && req.query?.token) {
      token = req.query.token;
    }
    if (!token) throw ApiError.unauthorized('Authentication required');

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Session expired or invalid');
    }

    const user = await User.findById(decoded.sub).select('+status');
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.status !== 'active') throw ApiError.forbidden('Account disabled');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};