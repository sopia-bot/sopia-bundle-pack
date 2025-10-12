import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const router = express.Router();

// 실드 상태 조회
router.get('/', async (req, res) => {
  try {
    const data = await getDataFile('shield');
    res.json(data);
  } catch (error: any) {
    logger.error('Failed to fetch shield data', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to read shield data' });
  }
});

// 실드 변경
router.put('/change', async (req, res) => {
  try {
    const { change, reason } = req.body;
    logger.debug('Changing shield', { change, reason });
    
    const data = await getDataFile('shield');
    
    const oldCount = data.shield_count;
    const newCount = data.shield_count + change;
    
    data.shield_count = newCount;
    data.history.push({
      change,
      reason,
      time: new Date().toISOString()
    });
    
    await saveDataFile('shield', data);
    
    logger.info('Shield changed successfully', {
      oldCount,
      newCount,
      change,
      reason
    });
    
    res.json(data);
  } catch (error: any) {
    logger.error('Failed to change shield', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to update shield' });
  }
});

// 실드 초기화
router.put('/reset', async (req, res) => {
  try {
    const data = await getDataFile('shield');
    
    data.shield_count = 0;
    data.history.push({
      change: -data.shield_count,
      reason: '초기화',
      time: new Date().toISOString()
    });
    
    await saveDataFile('shield', data);
    res.json(data);
  } catch (error: any) {
    logger.error('Failed to reset shield', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to reset shield' });
  }
});

export default router;