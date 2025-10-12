import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const router = express.Router();

/**
 * 오늘 날짜의 시작 시각 (00:00:00)
 */
function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// 애청지수 랭킹 조회
router.get('/ranking', async (req, res) => {
  try {
    logger.debug('Fetching fanscore ranking');
    const data = await getDataFile('fanscore');
    
    // 룰렛 티켓 수 가져오기
    const rouletteData = await getDataFile('roulette');
    const rouletteTickets = new Map<number, number>();
    
    // 각 사용자별 템플릿 티켓 총합 계산
    for (const {user_id:userId, tickets} of rouletteData.tickets) {
      const userIdNum = parseInt(userId);
      if (!isNaN(userIdNum) && typeof tickets === 'object' && tickets !== null) {
        const totalTickets = Object.values(tickets as Record<string, number>)
          .reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
        rouletteTickets.set(userIdNum, totalTickets);
      }
    }
    
    // 레벨 우선, 경험치 차순으로 정렬
    const sortedData = data.sort((a: any, b: any) => {
      // 1. 레벨 비교 (높은 레벨이 우선)
      if (b.level !== a.level) {
        return b.level - a.level;
      }
      // 2. 레벨이 같으면 경험치 비교 (높은 경험치가 우선)
      return b.exp - a.exp;
    });
    
    // 랭킹 업데이트 및 룰렛 티켓 추가
    const rankedData = sortedData.map((item: any, index: number) => ({
      ...item,
      rank: index + 1,
      roulette_tickets: rouletteTickets.get(item.user_id) || 0
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

// 오늘 활동한 청취자 수 조회
router.get('/stats/today-active', async (req, res) => {
  try {
    logger.debug('Fetching today active users count');
    const data = await getDataFile('fanscore');
    const todayStart = getTodayStart();
    
    // 오늘 활동한 사용자 필터링
    const todayActiveUsers = data.filter((user: any) => {
      if (!user.last_activity_at) return false;
      const lastActivity = new Date(user.last_activity_at);
      return lastActivity >= todayStart;
    });
    
    const count = todayActiveUsers.length;
    logger.info('Today active users count fetched', { count });
    res.json({ count });
  } catch (error: any) {
    logger.error('Failed to fetch today active users count', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to fetch today active users count' });
  }
});

// 특정 사용자 애청지수 조회
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    logger.debug('Fetching user fanscore', { userId });
    
    const data = await getDataFile('fanscore');
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

// 사용자 생성
router.post('/user', async (req, res) => {
  try {
    const { user_id, nickname, tag } = req.body;
    
    logger.debug('Creating new fanscore user', { user_id, nickname, tag });
    
    const data = await getDataFile('fanscore');
    const existingUser = data.find((item: any) => item.user_id === user_id);
    
    if (existingUser) {
      logger.warn('User already exists', { user_id });
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const newUser = {
      user_id,
      nickname,
      tag: tag || nickname,
      score: 0,
      rank: data.length + 1,
      level: 1,
      exp: 0,
      chat_count: 0,
      like_count: 0,
      spoon_count: 0,
      lottery_tickets: 0,
      attendance_live_id: null,
      last_activity_at: new Date().toISOString() // 등록 시각
    };
    
    data.push(newUser);
    await saveDataFile('fanscore', data);
    
    logger.info('Fanscore user created successfully', { user_id, nickname });
    res.json(newUser);
  } catch (error: any) {
    logger.error('Failed to create fanscore user', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// 사용자 삭제
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    logger.debug('Deleting fanscore user', { userId });
    
    const data = await getDataFile('fanscore');
    const userIndex = data.findIndex((item: any) => item.user_id === parseInt(userId));
    
    if (userIndex === -1) {
      logger.warn('User not found for deletion', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    
    const deletedUser = data.splice(userIndex, 1)[0];
    await saveDataFile('fanscore', data);
    
    logger.info('Fanscore user deleted successfully', { userId, nickname: deletedUser.nickname });
    res.json({ message: 'User deleted successfully', user: deletedUser });
  } catch (error: any) {
    logger.error('Failed to delete fanscore user', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId
    });
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 애청지수 업데이트 (단일)
router.put('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    logger.debug('Updating user fanscore', { userId, updates });
    
    const data = await getDataFile('fanscore');
    const userIndex = data.findIndex((item: any) => item.user_id === parseInt(userId));
    
    if (userIndex === -1) {
      logger.warn('User not found for update', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldData = { ...data[userIndex] };
    data[userIndex] = {
      ...data[userIndex],
      ...updates
    };
    
    await saveDataFile('fanscore', data);
    
    logger.info('User fanscore updated successfully', {
      userId,
      oldScore: oldData.score,
      newScore: data[userIndex].score
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

// 배치 업데이트
router.post('/batch-update', async (req, res) => {
  try {
    const { updates } = req.body; // [{ user_id, score, exp, level, chat_count, like_count, spoon_count, lottery_tickets, attendance_live_id }]
    
    logger.debug('Batch updating fanscore', { count: updates.length });
    
    const data = await getDataFile('fanscore');
    let updated = 0;
    
    updates.forEach((update: any) => {
      const userIndex = data.findIndex((item: any) => item.user_id === update.user_id);
      if (userIndex !== -1) {
        data[userIndex] = {
          ...data[userIndex],
          ...update
        };
        updated++;
      }
    });
    
    await saveDataFile('fanscore', data);
    
    logger.info('Batch update completed', { requested: updates.length, updated });
    res.json({ updated, total: updates.length });
  } catch (error: any) {
    logger.error('Failed to batch update fanscore', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to batch update' });
  }
});

// 복권 티켓 업데이트
router.put('/user/:userId/lottery', async (req, res) => {
  try {
    const { userId } = req.params;
    const { change } = req.body; // +N or -N
    
    logger.debug('Updating lottery tickets', { userId, change });
    
    const data = await getDataFile('fanscore');
    const userIndex = data.findIndex((item: any) => item.user_id === parseInt(userId));
    
    if (userIndex === -1) {
      logger.warn('User not found for lottery update', { userId });
      return res.status(404).json({ error: 'User not found' });
    }
    
    const oldTickets = data[userIndex].lottery_tickets || 0;
    data[userIndex].lottery_tickets = Math.max(0, oldTickets + change);
    
    await saveDataFile('fanscore', data);
    
    logger.info('Lottery tickets updated', {
      userId,
      oldTickets,
      newTickets: data[userIndex].lottery_tickets,
      change
    });
    
    res.json(data[userIndex]);
  } catch (error: any) {
    logger.error('Failed to update lottery tickets', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId
    });
    res.status(500).json({ error: 'Failed to update lottery tickets' });
  }
});

// 고유닉(tag)으로 사용자 검색
router.get('/user-by-tag/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    logger.debug('Finding user by tag', { tag });
    
    const data = await getDataFile('fanscore');
    const user = data.find((item: any) => item.tag === tag);
    
    if (!user) {
      logger.warn('User not found by tag', { tag });
      return res.status(404).json({ error: 'User not found' });
    }
    
    logger.info('User found by tag', { tag, user_id: user.user_id });
    res.json(user);
  } catch (error: any) {
    logger.error('Failed to find user by tag', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      tag: req.params.tag
    });
    res.status(500).json({ error: 'Failed to find user' });
  }
});

export default router;