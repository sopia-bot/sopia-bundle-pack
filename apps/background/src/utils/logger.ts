import winston from 'winston';
import Transport from 'winston-transport';
import fs from 'fs';
import path from 'path';

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

// 날짜별 로그 파일명 생성
function getLogFileName(baseFilename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  return `${baseFilename}-${dateStr}.log`;
}

// 커스텀 Transport: 로그 작성 시에만 파일을 열고 닫음
class FileWriteTransport extends Transport {
  private readonly baseFilename: string;
  private readonly dirname: string;

  constructor(opts: winston.transport.TransportStreamOptions & { baseFilename: string; dirname: string }) {
    super(opts);
    this.baseFilename = opts.baseFilename;
    this.dirname = opts.dirname;
  }

  override log(info: any, callback: () => void) {
    setTimeout(() => {
      try {
        // 로그 파일 경로
        const logFilePath = path.join(this.dirname, getLogFileName(this.baseFilename));
        
        // 로그 메시지 포맷팅
        const timestamp = new Date().toLocaleString('ko-KR', {
          timeZone: kstTimeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        let logMessage = `[${timestamp}] ${info.level.toUpperCase()}: ${info.message}`;
        
        if (info.stack) {
          logMessage += `\nStack: ${info.stack}`;
        }
        
        const metaKeys = Object.keys(info).filter(
          key => !['level', 'message', 'timestamp', 'stack', 'service'].includes(key)
        );
        
        if (metaKeys.length > 0) {
          const meta: any = {};
          metaKeys.forEach(key => meta[key] = info[key]);
          logMessage += `\nMeta: ${JSON.stringify(meta, null, 2)}`;
        }
        
        logMessage += '\n';
        
        // 파일에 추가 (파일을 열고 쓰고 즉시 닫음)
        fs.appendFileSync(logFilePath, logMessage, 'utf8');
        
      } catch (error) {
        console.error('Failed to write log:', error);
      }
    }, 0);

    callback();
  }
}

// 로그 파일 Transport 생성
const createFileTransport = (level: string, filename: string) => {
  return new FileWriteTransport({
    level,
    baseFilename: filename,
    dirname: path.join(__pkgdir, 'logs')
  });
};

// Winston 로거 생성
const logger = winston.createLogger({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'starter-pack-backend' },
  transports: [
    // 에러 로그 (에러만)
    createFileTransport('error', 'error'),
    
    // 일반 로그 (info 이상)
    createFileTransport('info', 'combined'),
    
    // 개발 환경에서만 콘솔 출력
    ...(process.env['NODE_ENV'] !== 'production' ? [
      new winston.transports.Console({
        format: consoleFormat
      })
    ] : [])
  ],
  
  // 예외 처리
  exceptionHandlers: [
    createFileTransport('error', 'exceptions')
  ],
  
  // Promise rejection 처리
  rejectionHandlers: [
    createFileTransport('error', 'rejections')
  ]
});

// 로그 디렉토리 생성 (없는 경우)
const logsDir = path.join(__pkgdir, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;
