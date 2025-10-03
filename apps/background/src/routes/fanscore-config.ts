import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const router = express.Router();

// 설정 조회
router.get('/', (req, res) => {
  try {
    logger.debug('Fetching fanscore config');
    const config = getDataFile('fanscore-config');
    logger.info('Fanscore config fetched successfully');
    res.json(config);
  } catch (error: any) {
    logger.error('Failed to fetch fanscore config', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// 설정 저장
router.post('/', (req, res) => {
  try {
    const config = req.body;
    logger.debug('Saving fanscore config', { 
      enabled: config.enabled,
      chatScore: config.chat_score,
      likeScore: config.like_score,
      spoonScore: config.spoon_score
    });
    
    saveDataFile('fanscore-config', config);
    
    logger.info('Fanscore config saved successfully', {
      enabled: config.enabled,
      quizEnabled: config.quiz_enabled,
      lotteryEnabled: config.lottery_enabled
    });
    
    res.json(config);
  } catch (error: any) {
    logger.error('Failed to save fanscore config', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      config: req.body
    });
    res.status(500).json({ error: 'Failed to save config' });
  }
});

export default router;

