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

app.set('trust proxy', 1);
app.use(helmet());
app.use( cors({   origin: env.clientUrl,   credentials: true, }) );
app.use(express.json({limit: '2mb', }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());

if (!env.isProd) app.use(morgan('dev'));

app.use(  '/api',  rateLimit({    windowMs: 15 * 60 * 1000,    max: 300,    standardHeaders: true,    legacyHeaders: false,    message: { success: false, message: 'Too many requests, please try again later.' },  }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
