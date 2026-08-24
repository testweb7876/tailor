const ApiError = require('../utils/ApiError');

module.exports = function requirePermission(moduleName) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (req.user.role === 'ADMIN' && req.user.permissions?.includes(moduleName)) return next();
    return next(ApiError.forbidden('You do not have access to this module'));
  };
};