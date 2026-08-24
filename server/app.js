const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Behind a proxy (Render/Railway/Nginx) so secure cookies + rate-limit IPs work
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — credentials on so httpOnly cookies flow to the SPA
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// Body + cookies
app.use(express.json({
  limit: '2mb',
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Strip $ / . keys to block NoSQL operator injection
app.use(mongoSanitize());

// Request logging
if (!env.isProd) app.use(morgan('dev'));

// Global rate limit (auth routes get a stricter one in their own phase)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  })
);

app.use('/api', routes);

// 404 + central error handler (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
