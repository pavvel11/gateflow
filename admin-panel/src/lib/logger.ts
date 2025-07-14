import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Type for log data
type LogData = Record<string, unknown> | string | number | boolean | null | undefined;

// Get current date for log file naming
const getLogFileName = () => {
  const date = new Date().toISOString().split('T')[0];
  return `app-${date}.log`;
};

// Format log entry
const formatLogEntry = (level: string, message: string, data?: LogData) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data ? JSON.stringify(data, null, 2) : undefined
  };
  return JSON.stringify(logEntry) + '\n';
};

// Write to log file
const writeToLogFile = (entry: string) => {
  const logFile = path.join(logsDir, getLogFileName());
  fs.appendFileSync(logFile, entry);
};

export const logger = {
  info: (message: string, data?: LogData) => {
    console.log(`ℹ️ ${message}`, data || '');
    writeToLogFile(formatLogEntry('INFO', message, data));
  },
  
  error: (message: string, data?: LogData) => {
    console.error(`❌ ${message}`, data || '');
    writeToLogFile(formatLogEntry('ERROR', message, data));
  },
  
  warn: (message: string, data?: LogData) => {
    console.warn(`⚠️ ${message}`, data || '');
    writeToLogFile(formatLogEntry('WARN', message, data));
  },
  
  debug: (message: string, data?: LogData) => {
    console.log(`🔍 ${message}`, data || '');
    writeToLogFile(formatLogEntry('DEBUG', message, data));
  },
  
  security: (message: string, data?: LogData) => {
    console.log(`🔐 ${message}`, data || '');
    writeToLogFile(formatLogEntry('SECURITY', message, data));
  }
};
