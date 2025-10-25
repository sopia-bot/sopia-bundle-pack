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
import yachtRoutes from './routes/yacht';
import logger from './utils/logger';
import { initializeAllDataFiles, getDataFile, saveDataFile } from './utils/fileManager';

const app = express();
app.use(express.json());

// 타입 안전 파싱 함수
function safeIntData(data: any, defaultValue: number = 0): number {
  if (typeof data === 'number' && !isNaN(data)) {
    return Math.floor(data);
  }
  if (typeof data === 'string') {
    if (data.match(/^\d+$/)) {
      return parseInt(data.match(/^\d+/)?.[0] || defaultValue.toString(), 10);
    }
    return defaultValue;
  }
  return defaultValue;
}

function safeBooleanData(data: any, defaultValue: boolean = false): boolean {
  if (typeof data === 'boolean') {
    return data;
  }
  if (data === 'true' || data === true) {
    return true;
  }
  if (data === 'false' || data === false) {
    return false;
  }
  return defaultValue;
}

// Fanscore Config 타입 검증 및 수정
async function validateAndFixFanscoreConfig() {
  try {
    const config = await getDataFile('fanscore-config');
    
    const defaultConfig = {
      enabled: true,
      attendance_score: 10,
      chat_score: 1,
      like_score: 10,
      spoon_score: 100,
      quiz_enabled: false,
      quiz_bonus: 100,
      quiz_interval: 30,
      quiz_timeout: 5,
      lottery_enabled: true,
      lottery_spoon_required: 100
    };

    let needsUpdate = false;

    // 타입 검증 및 수정
    const validatedConfig = {
      enabled: safeBooleanData(config.enabled, defaultConfig.enabled),
      attendance_score: safeIntData(config.attendance_score, defaultConfig.attendance_score),
      chat_score: safeIntData(config.chat_score, defaultConfig.chat_score),
      like_score: safeIntData(config.like_score, defaultConfig.like_score),
      spoon_score: safeIntData(config.spoon_score, defaultConfig.spoon_score),
      quiz_enabled: safeBooleanData(config.quiz_enabled, defaultConfig.quiz_enabled),
      quiz_bonus: safeIntData(config.quiz_bonus, defaultConfig.quiz_bonus),
      quiz_interval: safeIntData(config.quiz_interval, defaultConfig.quiz_interval),
      quiz_timeout: safeIntData(config.quiz_timeout, defaultConfig.quiz_timeout),
      lottery_enabled: safeBooleanData(config.lottery_enabled, defaultConfig.lottery_enabled),
      lottery_spoon_required: safeIntData(config.lottery_spoon_required, defaultConfig.lottery_spoon_required)
    };

    // 변경사항 확인
    if (JSON.stringify(config) !== JSON.stringify(validatedConfig)) {
      needsUpdate = true;
      logger.warn('Fanscore config type mismatch detected, fixing...', {
        original: config,
        validated: validatedConfig
      });
    }

    // 변경사항이 있으면 저장
    if (needsUpdate) {
      await saveDataFile('fanscore-config', validatedConfig);
      logger.info('Fanscore config validated and fixed');
    } else {
      logger.debug('Fanscore config validation passed');
    }
  } catch (error: any) {
    logger.error('Failed to validate fanscore config', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
  }
}

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
app.use('/yacht', yachtRoutes);
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

// Fanscore Config 타입 검증 및 수정
validateAndFixFanscoreConfig();

// 서버 시작 로그
logger.info('Starter Pack Backend Server initialized', {
  environment: process.env['NODE_ENV'] || 'development',
  port: process.env['PORT'] || 'unknown'
});

export default app;