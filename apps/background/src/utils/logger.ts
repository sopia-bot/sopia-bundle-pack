import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// KST 시간대 설정
const kstTimeZone = 'Asia/Seoul';

// 로그 포맷 설정
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: () => {
      return new Date().toLocaleString('ko-KR', {
        timeZone: kstTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (stack) {
      log += `\nStack: ${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// 콘솔 포맷 (개발용)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: () => {
      return new Date().toLocaleString('ko-KR', {
        timeZone: kstTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 로그 파일 로테이션 설정
const createRotateTransport = (level: string, filename: string) => {
  return new DailyRotateFile({
    level,
    filename: `${filename}-%DATE%.log`,
    dirname: path.join(__pkgdir, 'logs'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
    format: logFormat
  });
};

// Winston 로거 생성
const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'starter-pack-backend' },
  transports: [
    // 에러 로그 (에러만)
    createRotateTransport('error', 'error'),
    
    // 일반 로그 (info 이상)
    createRotateTransport('info', 'combined'),
    
    // 개발 환경에서만 콘솔 출력
    ...(process.env['NODE_ENV'] !== 'production' ? [
      new winston.transports.Console({
        format: consoleFormat
      })
    ] : [])
  ],
  
  // 예외 처리
  exceptionHandlers: [
    createRotateTransport('error', 'exceptions')
  ],
  
  // Promise rejection 처리
  rejectionHandlers: [
    createRotateTransport('error', 'rejections')
  ]
});

// 로그 디렉토리 생성 (없는 경우)
import fs from 'fs';
import path from 'path';

const logsDir = path.join(__pkgdir, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
