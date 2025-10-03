import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const router = express.Router();

// 애청지수 랭킹 조회
router.get('/ranking', (req, res) => {
  try {
    logger.debug('Fetching fanscore ranking');
    const data = getDataFile('fanscore');
    const sortedData = data.sort((a: any, b: any) => b.score - a.score);
    
    // 랭킹 업데이트
    const rankedData = sortedData.map((item: any, index: number) => ({
      ...item,
      rank: index + 1
    }));
    
    logger.info('Fanscore ranking fetched successfully', { count: rankedData.length });
    res.json(rankedData);
  } catch (error: any) {
    logger.error('Failed to fetch fanscore ranking', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to read fanscore data' });
  }
});

// 특정 사용자 애청지수 조회
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    logger.debug('Fetching user fanscore', { userId });
    
    const data = getDataFile('fanscore');
    const user = data.find((item: any) => item.user_id === parseInt(userId));
    
    if (!user) {
      logger.warn('User not found', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('User fanscore fetched successfully', { userId, score: user.score });
    res.json(user);
  } catch (error: any) {
    logger.error('Failed to fetch user fanscore', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId
    });
    res.status(500).json({ error: 'Failed to read user data' });
  }
});

// 애청지수 업데이트
router.put('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { score, chat_count, like_count, spoon_count } = req.body;
    
    logger.debug('Updating user fanscore', { 
      userId, 
      updates: { score, chat_count, like_count, spoon_count } 
    });
    
    const data = getDataFile('fanscore');
    const userIndex = data.findIndex((item: any) => item.user_id === parseInt(userId));
    
    if (userIndex === -1) {
      logger.warn('User not found for update', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldData = { ...data[userIndex] };
    data[userIndex] = {
      ...data[userIndex],
      score: score || data[userIndex].score,
      chat_count: chat_count || data[userIndex].chat_count,
      like_count: like_count || data[userIndex].like_count,
      spoon_count: spoon_count || data[userIndex].spoon_count
    };
    
    saveDataFile('fanscore', data);
    
    logger.info('User fanscore updated successfully', {
      userId,
      oldScore: oldData.score,
      newScore: data[userIndex].score,
      changes: {
        score: score !== undefined,
        chat_count: chat_count !== undefined,
        like_count: like_count !== undefined,
        spoon_count: spoon_count !== undefined
      }
    });
    
    res.json(data[userIndex]);
  } catch (error: any) {
    logger.error('Failed to update user fanscore', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to update user data' });
  }
});

export default router;