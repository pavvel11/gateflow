/**
 * PM2 Ecosystem Configuration for GateFlow
 *
 * This config enables cluster mode to utilize all CPU cores for maximum performance.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js  # Zero-downtime reload
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 *
 * Monitoring:
 *   pm2 list                         # List all processes
 *   pm2 monit                        # Real-time monitoring
 *   pm2 logs                         # View logs
 *   pm2 logs --lines 100             # Last 100 lines
 */

module.exports = {
  apps: [
    {
      name: 'gateflow-admin',
      cwd: './admin-panel',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',

      // CLUSTER MODE - Use all CPU cores for maximum throughput
      instances: 'max', // or number like 2, 4, etc.
      exec_mode: 'cluster',

      // MEMORY MANAGEMENT
      max_memory_restart: '512M', // Restart if exceeds 512MB (adjust for VPS)
      min_uptime: '10s', // Consider app unstable if crashes within 10s
      max_restarts: 10, // Max restart attempts before giving up

      // GRACEFUL SHUTDOWN
      kill_timeout: 5000, // Time to wait for graceful shutdown (ms)
      listen_timeout: 10000, // Time to wait for app to be ready (ms)
      wait_ready: true, // Wait for 'ready' signal from app

      // LOGGING
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true, // Combine logs from all instances

      // ENVIRONMENT VARIABLES
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // ADVANCED OPTIONS
      autorestart: true, // Auto restart on crash
      watch: false, // Don't watch files (use pm2 reload for updates)
      ignore_watch: ['node_modules', 'logs', '.next'], // Folders to ignore if watch is enabled

      // HEALTH CHECK
      kill_retry_time: 100, // Time between kill retries (ms)
    },
  ],
};
