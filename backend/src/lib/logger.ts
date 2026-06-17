import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getRequestId } from './context';

// Custom format to inject Request ID from AsyncLocalStorage context
const appendRequestId = winston.format((info) => {
  const reqId = getRequestId();
  if (reqId) {
    info.requestId = reqId;
  }
  return info;
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    appendRequestId(),
    winston.format.json()
  ),
  defaultMeta: { service: 'u9pgs-api' },
  transports: [
    // Error logs — kept 30 days
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d'
    }),
    // All logs — kept 14 days
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d'
    })
  ]
});

// Also log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      appendRequestId(),
      winston.format.json()
    )
  }));
} else {
  logger.add(new winston.transports.Console());
}

export default logger;
