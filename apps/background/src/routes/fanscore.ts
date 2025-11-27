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

/**
 * 순위 재정렬 함수
 * 레벨 우선, 경험치 차순으로 정렬하여 rank 값 업데이트
 */
async function recalculateRanks(): Promise<void> {
  try {
    const data = await getDataFile('fanscore');

    // 레벨 우선, 경험치 차순으로 정렬
    const sortedData = data.sort((a: any, b: any) => {
      // 1. 레벨 비교 (높은 레벨이 우선)
      if (b.level !== a.level) {
        return b.level - a.level;
      }
      // 2. 레벨이 같으면 경험치 비교 (높은 경험치가 우선)
      return b.exp - a.exp;
    });

    // 랭킹 업데이트
    sortedData.forEach((item: any, index: number) => {
      item.rank = index + 1;
    });

    await saveDataFile('fanscore', sortedData);
    logger.debug('Ranks recalculated successfully', { totalUsers: sortedData.length });
  } catch (error: any) {
    logger.error('Failed to recalculate ranks', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
  }
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
    if (rouletteData.tickets) {
      for (const { user_id: userId, tickets } of rouletteData.tickets) {
        const userIdNum = parseInt(userId);
        if (!isNaN(userIdNum) && typeof tickets === 'object' && tickets !== null) {
          const totalTickets = Object.values(tickets as Record<string, number>)
            .reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
          rouletteTickets.set(userIdNum, totalTickets);
        }
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

// 사용자 삭제 (선택적)
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { categories } = req.body || {}; // ['fanscore', 'roulette']

    logger.debug('Deleting user data', { userId, categories });

    const userIdNum = parseInt(userId);
    const deleteCategories = categories || ['fanscore', 'roulette'];

    let deletedItems = { fanscore: false, roulette: false };

    // Fanscore 데이터 삭제
    if (deleteCategories.includes('fanscore')) {
      const fanscoreData = await getDataFile('fanscore');
      const userIndex = fanscoreData.findIndex((item: any) => item.user_id === userIdNum);

      if (userIndex !== -1) {
        const deletedUser = fanscoreData.splice(userIndex, 1)[0];
        await saveDataFile('fanscore', fanscoreData);
        deletedItems.fanscore = true;
        logger.info('Fanscore data deleted', { userId, nickname: deletedUser.nickname });
      }
    }

    // Roulette 데이터 삭제
    if (deleteCategories.includes('roulette')) {
      const rouletteData = await getDataFile('roulette');
      let rouletteModified = false;

      if (rouletteData.keepItems) {
        const keepItemsIndex = rouletteData.keepItems.findIndex((k: any) => k.user_id === userIdNum);
        if (keepItemsIndex !== -1) {
          rouletteData.keepItems.splice(keepItemsIndex, 1);
          rouletteModified = true;
        }
      }

      if (rouletteData.tickets) {
        const ticketsIndex = rouletteData.tickets.findIndex((t: any) => t.user_id === userIdNum);
        if (ticketsIndex !== -1) {
          rouletteData.tickets.splice(ticketsIndex, 1);
          rouletteModified = true;
        }
      }

      if (rouletteModified) {
        await saveDataFile('roulette', rouletteData);
      }

      const historyData = await getDataFile('roulette-history');
      const originalLength = historyData.length;
      const filteredHistory = historyData.filter((record: any) => record.user_id !== userIdNum);

      if (filteredHistory.length !== originalLength) {
        await saveDataFile('roulette-history', filteredHistory);
        rouletteModified = true;
      }

      if (rouletteModified) {
        deletedItems.roulette = true;
        logger.info('Roulette data deleted', { userId });
      }
    }

    logger.info('User data deletion completed', { userId, deletedItems });
    res.json({ message: 'User data deleted successfully', deletedItems });
  } catch (error: any) {
    logger.error('Failed to delete user data', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId
    });
    res.status(500).json({ error: 'Failed to delete user data' });
  }
});

// 애청지수 업데이트 (단일)
router.put('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    logger.debug('Updating user account', { userId, updates });

    const oldUserId = parseInt(userId);
    const newUserId = updates.user_id ? parseInt(updates.user_id) : oldUserId;
    const newNickname = updates.nickname;
    const newTag = updates.tag;

    // 계정 변경인 경우 (user_id가 변경됨)
    const isAccountChange = newUserId !== oldUserId;

    if (isAccountChange) {
      // 새 user_id가 이미 사용 중인지 확인 (fanscore, roulette 모두 확인)
      const fanscoreData = await getDataFile('fanscore');
      const rouletteData = await getDataFile('roulette');

      const fanscoreExists = fanscoreData.some((u: any) => u.user_id === newUserId);
      if (fanscoreExists) {
        logger.warn('New user ID already in use', { newUserId });
        return res.status(400).json({ error: '선택한 사용자 ID가 이미 사용 중입니다.' });
      }

      // fanscore 업데이트
      const userIndex = fanscoreData.findIndex((item: any) => item.user_id === oldUserId);
      if (userIndex === -1) {
        logger.warn('User not found for update', { userId: oldUserId });
        return res.status(404).json({ error: 'User not found' });
      }

      const oldData = { ...fanscoreData[userIndex] };
      fanscoreData[userIndex] = {
        ...fanscoreData[userIndex],
        ...updates
      };
      await saveDataFile('fanscore', fanscoreData);

      // roulette keepItems 업데이트
      if (rouletteData.keepItems) {
        const keepItemsIndex = rouletteData.keepItems.findIndex((k: any) => k.user_id === oldUserId);
        if (keepItemsIndex !== -1) {
          rouletteData.keepItems[keepItemsIndex] = {
            ...rouletteData.keepItems[keepItemsIndex],
            user_id: newUserId,
            nickname: newNickname || rouletteData.keepItems[keepItemsIndex].nickname,
            tag: newTag || rouletteData.keepItems[keepItemsIndex].tag,
          };
        }
      }

      // roulette tickets 업데이트
      if (rouletteData.tickets) {
        const ticketsIndex = rouletteData.tickets.findIndex((t: any) => t.user_id === oldUserId);
        if (ticketsIndex !== -1) {
          rouletteData.tickets[ticketsIndex] = {
            ...rouletteData.tickets[ticketsIndex],
            user_id: newUserId,
            nickname: newNickname || rouletteData.tickets[ticketsIndex].nickname,
            tag: newTag || rouletteData.tickets[ticketsIndex].tag,
          };
        }
      }

      await saveDataFile('roulette', rouletteData);

      // roulette-history 업데이트
      const historyData = await getDataFile('roulette-history');
      let historyUpdated = 0;
      historyData.forEach((record: any) => {
        if (record.user_id === oldUserId) {
          record.user_id = newUserId;
          if (newNickname) {
            record.nickname = newNickname;
          }
          historyUpdated++;
        }
      });

      if (historyUpdated > 0) {
        await saveDataFile('roulette-history', historyData);
      }

      logger.info('Account changed successfully', {
        oldUserId,
        newUserId,
        newNickname,
        historyUpdated,
        oldScore: oldData.score,
        newScore: fanscoreData[userIndex].score
      });

      res.json({
        ...fanscoreData[userIndex],
        rouletteHistoryUpdated: historyUpdated
      });
    } else {
      // 일반 업데이트 (user_id 변경 없음)
      const data = await getDataFile('fanscore');
      const userIndex = data.findIndex((item: any) => item.user_id === oldUserId);

      if (userIndex === -1) {
        logger.warn('User not found for update', { userId: oldUserId });
        return res.status(404).json({ error: 'User not found' });
      }

      const oldData = { ...data[userIndex] };
      data[userIndex] = {
        ...data[userIndex],
        ...updates
      };

      await saveDataFile('fanscore', data);

      logger.info('User fanscore updated successfully', {
        userId: oldUserId,
        oldScore: oldData.score,
        newScore: data[userIndex].score
      });

      res.json(data[userIndex]);
    }
  } catch (error: any) {
    logger.error('Failed to update user account', {
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

    // 모든 업데이트 완료 후 순위 재정렬
    await recalculateRanks();

    logger.info('Batch update completed with rank recalculation', { requested: updates.length, updated });
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

    // Worker에 복권 업데이트 알림
    try {
      const { BrowserWindow } = require('electron');
      const window = BrowserWindow.getAllWindows()[0];
      if (window) {
        window.webContents.send('starter-pack.sopia.dev', {
          channel: 'lottery-updated',
          data: {
            userId: parseInt(userId),
            lottery_tickets: data[userIndex].lottery_tickets
          }
        });
        window.webContents.send('starter-pack.sopia.dev', {
          channel: 'send-chat-message',
          data: {
            userId: parseInt(userId),
            message: `[복권] ${data[userIndex].nickname}님, 복권이 ${change}개 지급되었습니다. (보유: ${data[userIndex].lottery_tickets}개)`
          }
        });
        logger.debug('Worker notified of lottery update', { userId });
      }
    } catch (notifyError: any) {
      logger.warn('Failed to notify worker of lottery update', {
        error: notifyError?.message || 'Unknown error'
      });
    }

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

// 전체 기록 초기화
router.post('/reset', async (req, res) => {
  try {
    const { categories } = req.body; // ['fanscore', 'chat', 'like', 'lottery', 'spoon', 'users']

    logger.debug('Resetting user records', { categories });

    let data = await getDataFile('fanscore');
    let updatedCount = 0;

    // 청취자 정보 전체 삭제
    if (categories.includes('users')) {
      logger.warn('Deleting all user data');
      updatedCount = data.length;
      data = [];
      await saveDataFile('fanscore', data);

      logger.info('All user data deleted', { deletedCount: updatedCount });

      res.json({
        success: true,
        updatedCount,
        categories,
        message: 'All user data deleted'
      });
      return;
    }

    // 부분 초기화
    data.forEach((user: any) => {
      if (categories.includes('fanscore')) {
        user.score = 0;
        user.exp = 0;
        user.level = 1;
        user.rank = 0;
        user.attendance_live_id = null;
        user.last_activity_at = null;
      }
      if (categories.includes('chat')) {
        user.chat_count = 0;
      }
      if (categories.includes('like')) {
        user.like_count = 0;
      }
      if (categories.includes('lottery')) {
        user.lottery_tickets = 0;
      }
      if (categories.includes('spoon')) {
        user.spoon_count = 0;
      }
      updatedCount++;
    });

    await saveDataFile('fanscore', data);

    // 애청지수 초기화가 포함되어 있으면 순위 재정렬
    if (categories.includes('fanscore')) {
      await recalculateRanks();
    }

    logger.info('User records reset successfully', {
      categories,
      updatedCount
    });

    res.json({
      success: true,
      updatedCount,
      categories
    });
  } catch (error: any) {
    logger.error('Failed to reset user records', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to reset user records' });
  }
});

export default router;