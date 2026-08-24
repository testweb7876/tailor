const asyncHandler = require('../utils/asyncHandler');
const { setAuthCookies, clearAuthCookies, signDownloadToken } = require('../utils/tokens');
const authService = require('../services/authService');
const activity = require('../services/activityService');

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  let user;
  try {
    user = await authService.login(email, password);
  } catch (err) {
    await activity.log({
      req,
      action: 'auth.failed_login',
      description: `Failed login attempt for ${email}`,
      resource: 'User',
      meta: { email },
    });
    throw err;
  }
  setAuthCookies(res, user);
  await activity.log({
    req,
    user,
    action: 'auth.login',
    description: `${user.name} logged in`,
    resource: 'User',
    resourceId: user._id,
  });
  res.json({ success: true, user: user.toSafeJSON() });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  if (req.user) {
    await activity.log({
      req,
      action: 'auth.logout',
      description: `${req.user.name} logged out`,
      resource: 'User',
      resourceId: req.user._id,
    });
  }
  res.json({ success: true, message: 'Logged out' });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeJSON() });
});

// POST /api/auth/refresh
exports.refresh = asyncHandler(async (req, res) => {
  const user = await authService.refresh(req.cookies?.refreshToken);
  setAuthCookies(res, user);
  res.json({ success: true, user: user.toSafeJSON() });
});

// POST /api/auth/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await authService.changePassword(req.user._id, currentPassword, newPassword);
  setAuthCookies(res, user);
  await activity.log({
    req,
    action: 'auth.change_password',
    description: `${user.name} changed their password`,
    resource: 'User',
    resourceId: user._id,
  });
  res.json({ success: true, message: 'Password changed. Other sessions have been logged out.' });
});

// GET /api/auth/download-token — short-lived (60s) token for window.open() download links
exports.downloadToken = asyncHandler(async (req, res) => {
  const token = signDownloadToken(req.user._id);
  res.json({ success: true, token });
});