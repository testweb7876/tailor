const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

module.exports = (err, req, res, next) => {
  let error = err;

  if (err.name === 'CastError') error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`${field} already exists`);
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest('Validation failed', details);
  }

  if (err.name === 'ZodError') {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    error = ApiError.badRequest('Validation failed', details);
  }

  const statusCode = error.statusCode || 500;
  const payload = {
    success: false,
    message: error.message || 'Internal server error',
  };
  if (error.details) payload.details = error.details;
  if (!env.isProd) payload.stack = err.stack;

  if (statusCode >= 500) logger.error(err.stack || err.message);

  res.status(statusCode).json(payload);
};
