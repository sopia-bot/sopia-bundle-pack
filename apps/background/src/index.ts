import express from 'express';
import userRoutes from './routes/user';
import fanscoreRoutes from './routes/fanscore';
import fanscoreConfigRoutes from './routes/fanscore-config';
import templateRoutes from './routes/templates';
import rouletteRoutes from './routes/roulette';
import shieldRoutes from './routes/shield';
import quizRoutes from './routes/quiz';
import migrationFanscoreRoutes from './routes/migration-fanscore';
import migrationRouletteRoutes from './routes/migration-roulette';
import logger from './utils/logger';
import { initializeAllDataFiles } from './utils/fileManager';

const app = express();
app.use(express.json());

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });
  
  next();
});

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 라우터 연결
app.use('/user', userRoutes);
app.use('/fanscore', fanscoreRoutes);
app.use('/fanscore/config', fanscoreConfigRoutes);
app.use('/templates', templateRoutes);
app.use('/roulette', rouletteRoutes);
app.use('/shield', shieldRoutes);
app.use('/quiz', quizRoutes);
app.use('/migration/fanscore', migrationFanscoreRoutes);
app.use('/migration/roulette', migrationRouletteRoutes);

// 404 핸들러
app.use('*', (req, res) => {
  logger.warn('404 Not Found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress
  });
  
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// 글로벌 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Error', {
    error: err?.message || 'Unknown error',
    stack: err?.stack || undefined,
    method: req.method,
    url: req.url,
    body: req.body,
    ip: req.ip || req.connection.remoteAddress
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env['NODE_ENV'] === 'production' 
      ? 'Something went wrong' 
      : err?.message || 'Unknown error'
  });
});

// 데이터 파일 초기화
try {
  initializeAllDataFiles();
} catch (error: any) {
  logger.error('Failed to initialize data files', {
    error: error?.message || 'Unknown error',
    stack: error?.stack || undefined
  });
}

// 서버 시작 로그
logger.info('Starter Pack Backend Server initialized', {
  environment: process.env['NODE_ENV'] || 'development',
  port: process.env['PORT'] || 'unknown'
});

export default app;