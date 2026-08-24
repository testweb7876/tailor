/* Tiny dependency-free logger. Swap for pino/winston later if needed. */
const ts = () => new Date().toISOString();
const fmt = (level, args) => [`[${ts()}] ${level}`, ...args];

module.exports = {
  info: (...a) => console.log(...fmt('INFO ', a)),
  warn: (...a) => console.warn(...fmt('WARN ', a)),
  error: (...a) => console.error(...fmt('ERROR', a)),
  debug: (...a) => {
    if (process.env.NODE_ENV !== 'production') console.debug(...fmt('DEBUG', a));
  },
};
