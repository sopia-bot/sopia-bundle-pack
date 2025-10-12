import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';
const { BrowserWindow } = require('electron');
const router = express.Router();

// 설정 조회
router.get('/', async (req, res) => {
  try {
    logger.debug('Fetching fanscore config');
    const config = await getDataFile('fanscore-config');
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
router.post('/', async (req, res) => {
  try {
    const config = req.body;
    logger.debug('Saving fanscore config', { 
      enabled: config.enabled,
      chatScore: config.chat_score,
      likeScore: config.like_score,
      spoonScore: config.spoon_score
    });
    
    await saveDataFile('fanscore-config', config);
    
    logger.info('Fanscore config saved successfully', {
      enabled: config.enabled,
      quizEnabled: config.quiz_enabled,
      lotteryEnabled: config.lottery_enabled
    });

    // Worker에 설정 업데이트 알림
    try {
      const window = BrowserWindow.getAllWindows()[0];
      if (window) {
        window.webContents.send('starter-pack.sopia.dev', {
          channel: 'config-updated',
          data: 'config-updated'
        });
        logger.debug('Worker notified of config update');
      }
    } catch (notifyError: any) {
      logger.warn('Failed to notify worker of config update', {
        error: notifyError?.message || 'Unknown error'
      });
      // 워커 알림 실패해도 설정 저장은 성공으로 처리
    }
    
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

