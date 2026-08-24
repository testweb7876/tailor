// PM2 process file: `pm2 start ecosystem.config.js --env production`
module.exports = {
  apps: [
    {
      name: 'tailor-erp-api',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: { NODE_ENV: 'development', PORT: 6000 },
      env_production: { NODE_ENV: 'production', PORT: 6000 },
      max_memory_restart: '400M',
    },
  ],
};
