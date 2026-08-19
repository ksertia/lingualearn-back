module.exports = {
  apps: [
    {
      name: 'lingualearn-back',
      script: 'src/server.js',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'lingualearn-media-worker',
      script: 'src/worker.js',
      env: { NODE_ENV: 'production' },
      // Transcodage CPU-intensif — un restart auto en cas de crash suffit,
      // pas besoin de plusieurs instances (concurrency: 1 dans worker.js).
      autorestart: true,
    },
  ],
};
