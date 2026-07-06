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

const isVercel = !!process.env.VERCEL;

// Build transports list:
// - Vercel has a READ-ONLY filesystem, so DailyRotateFile crashes with EROFS.
//   On Vercel we only use Console transport.
// - On Render / local dev we keep file-based rotation + console.
const transports: winston.transport[] = [];

if (!isVercel) {
  // Error logs — kept 30 days
  transports.push(new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '30d'
  }));
  // All logs — kept 14 days
  transports.push(new DailyRotateFile({
    filename: 'logs/combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d'
  }));
}

// Console transport — always active
if (process.env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      appendRequestId(),
      winston.format.json()
    )
  }));
} else {
  transports.push(new winston.transports.Console());
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    appendRequestId(),
    winston.format.json()
  ),
  defaultMeta: { service: 'u9pgs-api' },
  transports
});

export default logger;
