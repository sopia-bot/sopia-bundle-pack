import fs from 'fs';
import path from 'path';
import logger from './logger';

// 데이터 디렉토리 경로
const dataDir = path.join(__pkgdir, 'data');

// 기본 데이터 정의
const defaultData = {
  fanscore: [
  ],
  
  'fanscore-config': {
    enabled: true,
    attendance_score: 10,
    chat_score: 1,
    like_score: 10,
    spoon_score: 100,
    quiz_enabled: false,
    quiz_bonus: 10,
    quiz_interval: 180,
    quiz_timeout: 5,
    lottery_enabled: false,
    lottery_spoon_required: 50
  },
  
  templates: [
    {
      template_id: "default-1",
      name: "기본 룰렛",
      mode: "sticker",
      sticker: "heart",
      spoon: 1,
      division: true,
      auto_run: true,
      sound_below_1percent: true,
      items: [
        { type: "shield", label: "실드 1회", percentage: 10 },
        { type: "ticket", label: "복권", percentage: 0.001 },
        { type: "custom", label: "어떠한 커스텀 아이템", percentage: 0.001 }
      ]
    }
  ],
  
  'roulette-history': [],

  quiz: [],
  
  shield: {
    shield_count: 0,
    history: []
  }
};

/**
 * 데이터 디렉토리가 존재하는지 확인하고 없으면 생성
 */
export function ensureDataDirectory(): void {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', { dataDir });
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * 파일이 존재하는지 확인하고, 없으면 기본 데이터로 초기화
 * @param filename 파일명 (확장자 포함)
 * @param defaultContent 기본 데이터
 * @returns 파일이 존재했는지 여부
 */
export function ensureDataFile(filename: string, defaultContent: any): boolean {
  const filePath = path.join(dataDir, filename);
  
  if (!fs.existsSync(filePath)) {
    logger.info('Initializing data file with default content', { 
      filename, 
      filePath 
    });
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
      logger.info('Data file initialized successfully', { filename });
      return false; // 새로 생성됨
    } catch (error) {
      logger.error('Failed to initialize data file', {
        filename,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
  
  return true; // 이미 존재함
}

/**
 * JSON 파일을 안전하게 읽기
 * @param filename 파일명
 * @returns 파싱된 JSON 데이터
 */
export function readJsonFile(filename: string): any {
  const filePath = path.join(dataDir, filename);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.error('Failed to read JSON file', {
      filename,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * JSON 파일을 안전하게 쓰기
 * @param filename 파일명
 * @param data 저장할 데이터
 */
export function writeJsonFile(filename: string, data: any): void {
  const filePath = path.join(dataDir, filename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    logger.debug('JSON file written successfully', { filename });
  } catch (error) {
    logger.error('Failed to write JSON file', {
      filename,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 모든 데이터 파일 초기화
 */
export function initializeAllDataFiles(): void {
  logger.info('Initializing all data files');
  
  ensureDataDirectory();
  
  // 각 데이터 파일 초기화
  Object.entries(defaultData).forEach(([key, value]) => {
    const filename = key.includes('-') ? `${key}.json` : `${key}.json`;
    ensureDataFile(filename, value);
  });
  
  logger.info('All data files initialized');
}

/**
 * 특정 데이터 파일 가져오기 (없으면 초기화)
 * @param dataType 데이터 타입
 * @returns JSON 데이터
 */
export function getDataFile(dataType: keyof typeof defaultData): any {
  const filename = dataType.includes('-') ? `${dataType}.json` : `${dataType}.json`;
  
  // 파일이 없으면 기본 데이터로 초기화
  ensureDataFile(filename, defaultData[dataType]);
  
  // 파일 읽기
  return readJsonFile(filename);
}

/**
 * 특정 데이터 파일 저장
 * @param dataType 데이터 타입
 * @param data 저장할 데이터
 */
export function saveDataFile(dataType: keyof typeof defaultData, data: any): void {
  const filename = dataType.includes('-') ? `${dataType}.json` : `${dataType}.json`;
  writeJsonFile(filename, data);
}
