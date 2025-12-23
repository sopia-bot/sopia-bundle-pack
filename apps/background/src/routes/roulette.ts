import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const { BrowserWindow } = require('electron');
const router = express.Router();

/**
 * Worker에 채팅 메시지 전송 요청
 */
function sendChatMessage(message: string) {
  try {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      window.webContents.send('starter-pack.sopia.dev', {
        channel: 'send-chat-message',
        data: { message }
      });
      logger.debug('Chat message sent to worker', { message });
    }
  } catch (error: any) {
    logger.warn('Failed to send chat message to worker', {
      error: error?.message || 'Unknown error'
    });
  }
}

// ==================== 티켓 관리 API ====================

// 사용자별 티켓 조회
router.get('/tickets/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await getDataFile('roulette');
    
    const userTickets = data.tickets.find((t: any) => t.user_id === parseInt(userId));
    
    if (!userTickets) {
      return res.json({ user_id: parseInt(userId), tickets: {} });
    }
    
    res.json(userTickets);
  } catch (error: any) {
    logger.error('Failed to fetch user tickets', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId
    });
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// 티켓 추가/차감
router.post('/tickets/:userId/add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { templateId, count, nickname, tag, sendNotification, templateName } = req.body;
    
    logger.debug('Adding tickets to user', { userId, templateId, count });
    
    const data = await getDataFile('roulette');
    let userTickets = data.tickets.find((t: any) => t.user_id === parseInt(userId));
    
    if (!userTickets) {
      userTickets = {
        user_id: parseInt(userId),
        nickname,
        tag,
        tickets: {}
      };
      data.tickets.push(userTickets);
    }
    
    // 티켓 추가
    if (!userTickets.tickets[templateId]) {
      userTickets.tickets[templateId] = 0;
    }
    userTickets.tickets[templateId] += count;
    
    // 음수 방지
    if (userTickets.tickets[templateId] < 0) {
      userTickets.tickets[templateId] = 0;
    }
    
    await saveDataFile('roulette', data);
    
    logger.info('Tickets added to user', {
      userId,
      templateId,
      count,
      newTotal: userTickets.tickets[templateId]
    });
    
    // 채팅 알림 전송 (요청 시)
    if (sendNotification && nickname && templateName) {
      const message = `🎫 ${nickname}님에게 "${templateName}" 룰렛 티켓 ${count}장이 지급되었습니다!`;
      sendChatMessage(message);
    }
    
    res.json(userTickets);
  } catch (error: any) {
    logger.error('Failed to add tickets', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to add tickets' });
  }
});

// ==================== 킵 아이템 관리 API ====================

// 사용자별 킵 아이템 조회
router.get('/keep-items/:userId', async (req, res) => {
  try {
    const { userId} = req.params;
    const data = await getDataFile('roulette');
    
    const userKeepItems = data.keepItems.find((k: any) => k.user_id === parseInt(userId));
    
    if (!userKeepItems) {
      return res.json({ user_id: parseInt(userId), items: [] });
    }
    
    res.json(userKeepItems);
  } catch (error: any) {
    logger.error('Failed to fetch keep items', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId
    });
    res.status(500).json({ error: 'Failed to fetch keep items' });
  }
});

// 킵 아이템 추가
router.post('/keep-items/:userId/add', async (req, res) => {
  try {
    const { userId } = req.params;
    const { item, nickname, tag } = req.body;
    
    logger.debug('Adding keep item to user', { userId, item });
    
    const data = await getDataFile('roulette');
    let userKeepItems = data.keepItems.find((k: any) => k.user_id === parseInt(userId));
    
    if (!userKeepItems) {
      userKeepItems = {
        user_id: parseInt(userId),
        nickname,
        tag,
        items: []
      };
      data.keepItems.push(userKeepItems);
    }
    
    // 같은 아이템이 이미 있는지 확인 (label, template_id로 판단)
    const existingItem = userKeepItems.items.find(
      (i: any) => i.label === item.label && i.template_id === item.template_id
    );
    
    if (existingItem) {
      existingItem.count += item.count;
    } else {
      userKeepItems.items.push({
        id: `keep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...item,
        timestamp: new Date().toISOString()
      });
    }
    
    await saveDataFile('roulette', data);
    
    logger.info('Keep item added to user', { userId, item });
    
    res.json(userKeepItems);
  } catch (error: any) {
    logger.error('Failed to add keep item', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to add keep item' });
  }
});

// 킵 아이템 사용 (1개 감소)
router.post('/keep-items/:userId/use', async (req, res) => {
  try {
    const { userId } = req.params;
    const { itemIndex } = req.body;
    
    logger.debug('Using keep item', { userId, itemIndex });
    
    const rouletteData = await getDataFile('roulette');
    const historyData = await getDataFile('roulette-history');
    
    const userKeepItems = rouletteData.keepItems.find((k: any) => k.user_id === parseInt(userId));
    
    if (!userKeepItems) {
      return res.status(404).json({ error: 'User keep items not found' });
    }
    
    if (itemIndex < 0 || itemIndex >= userKeepItems.items.length) {
      return res.status(400).json({ error: 'Invalid item index' });
    }
    
    const item = userKeepItems.items[itemIndex];
    
    if (item.count <= 0) {
      return res.status(400).json({ error: 'Item count is already 0' });
    }
    
    item.count -= 1;
    
    // count가 0이 되면 아이템 제거
    if (item.count <= 0) {
      userKeepItems.items.splice(itemIndex, 1);
    }
    
    // history에서 가장 마지막에 추가된 해당 아이템 기록 찾기
    // 같은 label과 template_id를 가진 기록 중에서 used가 false인 것 중 가장 최신 것
    const matchingRecords = historyData
      .filter((record: any) => 
        record.user_id === parseInt(userId) &&
        record.item.label === item.label &&
        record.template_id === item.template_id &&
        record.used === false
      )
      .sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    
    if (matchingRecords.length > 0) {
      // 가장 마지막에 추가된 기록 (가장 최신 것)
      const latestRecord = matchingRecords[0];
      latestRecord.used = true;
      
      logger.debug('History record updated', {
        recordId: latestRecord.id,
        userId,
        itemLabel: item.label
      });
    }
    
    // 두 파일 모두 저장
    await saveDataFile('roulette', rouletteData);
    await saveDataFile('roulette-history', historyData);
    
    logger.info('Keep item used', { userId, itemIndex, itemLabel: item.label });
    
    res.json({ success: true, item });
  } catch (error: any) {
    logger.error('Failed to use keep item', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      userId: req.params.userId,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to use keep item' });
  }
});

// ==================== 기존 API ====================

// 룰렛 기록 추가 (Worker에서 사용)
router.post('/history', async (req, res) => {
  try {
    const record = req.body;
    
    logger.debug('Adding roulette history record', { record });
    
    const data = await getDataFile('roulette-history');
    data.push(record);
    await saveDataFile('roulette-history', data);
    
    logger.info('Roulette history record added', { recordId: record.id });
    
    res.json(record);
  } catch (error: any) {
    logger.error('Failed to add roulette history record', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to add history record' });
  }
});

// 룰렛 기록 조회 (시간 내림차순)
router.get('/history', async (req, res) => {
  try {
    const data = await getDataFile('roulette-history');
    // 시간 내림차순 정렬 (최신이 먼저)
    const sortedData = data.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    res.json(sortedData);
  } catch (error: any) {
    logger.error('Failed to fetch roulette history', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to read roulette history' });
  }
});

// 특정 템플릿의 룰렛 기록 조회 (시간 내림차순)
router.get('/history/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const data = await getDataFile('roulette-history');
    const filteredData = data.filter((item: any) => item.template_id === templateId);
    // 시간 내림차순 정렬 (최신이 먼저)
    const sortedData = filteredData.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    res.json(sortedData);
  } catch (error: any) {
    logger.error('Failed to fetch roulette history by template', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      templateId: req.params.templateId
    });
    res.status(500).json({ error: 'Failed to read roulette history' });
  }
});

// 룰렛 실행
router.post('/spin/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { userId, nickname, tag, isManual, recordHistory = true } = req.body;

    logger.debug('Spinning roulette', { templateId, userId, nickname, isManual, recordHistory });

    // 템플릿 조회
    const templates = await getDataFile('templates');
    const template = templates.find((t: any) => t.template_id === templateId);

    if (!template) {
      logger.warn('Template not found for roulette spin', { templateId });
      return res.status(404).json({ error: 'Template not found' });
    }

    // 랜덤 아이템 선택
    const random = Math.random() * 100;
    let cumulativePercentage = 0;
    let selectedItem = null;

    for (const item of template.items) {
      cumulativePercentage += item.percentage;
      if (random <= cumulativePercentage) {
        selectedItem = item;
        break;
      }
    }

    // 아이템이 선택되지 않으면 꽝
    if (!selectedItem) {
      selectedItem = { type: 'none', label: '꽝', percentage: 0 };
    }

    // 룰렛 기록 생성
    const historyId = `roulette-${Date.now()}`;
    const newRecord = {
      id: historyId,
      template_id: templateId,
      user_id: userId,
      nickname: nickname,
      tag: tag || nickname,
      item: selectedItem,
      used: false,
      is_manual: isManual || false,
      timestamp: new Date().toISOString()
    };

    // 기록 저장 (recordHistory가 true인 경우에만)
    if (recordHistory) {
      const history = await getDataFile('roulette-history');
      history.push(newRecord);
      await saveDataFile('roulette-history', history);
    }

    logger.info('Roulette spun successfully', {
      templateId,
      userId,
      nickname,
      selectedItem: selectedItem.label,
      percentage: selectedItem.percentage,
      randomValue: random.toFixed(3),
      isManual,
      recordHistory
    });

    res.json(newRecord);
  } catch (error: any) {
    logger.error('Failed to spin roulette', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      templateId: req.params.templateId,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to spin roulette' });
  }
});

// 수동 룰렛 실행 요청 (Worker에 전달)
router.post('/manual-spin', async (req, res) => {
  try {
    const { templateId, ticketCount, targetUserId, targetNickname, targetTag, applyEffects, sendNotification, isTargetInFanscore } = req.body;

    logger.debug('Manual roulette spin requested', {
      templateId, ticketCount, targetUserId, targetNickname, applyEffects
    });

    // Worker에 수동 룰렛 실행 요청 전송
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      window.webContents.send('starter-pack.sopia.dev', {
        channel: 'manual-roulette-spin',
        data: {
          templateId,
          ticketCount,
          targetUserId,
          targetNickname,
          targetTag,
          applyEffects,
          sendNotification,
          isTargetInFanscore
        }
      });

      logger.info('Manual roulette spin request sent to worker', { templateId, targetNickname });
      res.json({ success: true, message: 'Manual roulette spin request sent' });
    } else {
      logger.warn('No window available for manual roulette spin');
      res.status(500).json({ error: 'Worker window not available' });
    }
  } catch (error: any) {
    logger.error('Failed to request manual roulette spin', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to request manual roulette spin' });
  }
});

// 룰렛 기록 사용 상태 변경
router.put('/history/:recordId/use', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { used } = req.body;
    
    logger.debug('Updating roulette record status', { recordId, used });
    
    const historyData = await getDataFile('roulette-history');
    const rouletteData = await getDataFile('roulette');
    
    const recordIndex = historyData.findIndex((item: any) => item.id === recordId);
    
    if (recordIndex === -1) {
      logger.warn('Roulette record not found for status update', { recordId });
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const record = historyData[recordIndex];
    
    // keepItems 관리
    let userKeepItems = rouletteData.keepItems.find((k: any) => k.user_id === record.user_id);
    
    if (used) {
      // 사용됨으로 변경: keepItems에서 count -1 (0이면 제거), history의 used: true
      if (userKeepItems && userKeepItems.items) {
        const itemIndex = userKeepItems.items.findIndex(
          (i: any) => i.label === record.item.label && i.template_id === record.template_id
        );
        
        if (itemIndex !== -1) {
          const item = userKeepItems.items[itemIndex];
          if (item.count > 1) {
            item.count -= 1;
          } else {
            userKeepItems.items.splice(itemIndex, 1);
          }
          
          // 아이템이 모두 사라지면 사용자 keepItems 제거
          if (userKeepItems.items.length === 0) {
            const keepItemsIndex = rouletteData.keepItems.findIndex(
              (k: any) => k.user_id === record.user_id
            );
            if (keepItemsIndex !== -1) {
              rouletteData.keepItems.splice(keepItemsIndex, 1);
            }
          }
        }
      }
      
      // history의 used를 true로 변경
      record.used = true;
    } else {
      // 미사용으로 변경: keepItems에 추가 (count +1), history의 used: false
      if (!userKeepItems) {
        userKeepItems = {
          user_id: record.user_id,
          nickname: record.nickname,
          tag: record.nickname, // tag는 기본값으로 nickname 사용
          items: []
        };
        rouletteData.keepItems.push(userKeepItems);
      }
      
      // 같은 아이템이 이미 있는지 확인 (label, template_id로 판단)
      const existingItem = userKeepItems.items.find(
        (i: any) => i.label === record.item.label && i.template_id === record.template_id
      );
      
      if (existingItem) {
        existingItem.count += 1;
      } else {
        userKeepItems.items.push({
          id: `keep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: record.item.type || 'custom',
          label: record.item.label,
          count: 1,
          percentage: record.item.percentage,
          template_id: record.template_id,
          timestamp: new Date().toISOString()
        });
      }
      
      // history의 used를 false로 변경
      record.used = false;
    }
    
    // 두 파일 모두 저장
    await saveDataFile('roulette-history', historyData);
    await saveDataFile('roulette', rouletteData);
    
    logger.info('Roulette record status updated successfully', {
      recordId,
      newStatus: used,
      nickname: record.nickname
    });
    
    res.json(record);
  } catch (error: any) {
    logger.error('Failed to update roulette record status', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      recordId: req.params.recordId,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to update record status' });
  }
});

// 룰렛 기록 초기화
router.post('/history/reset', async (req, res) => {
  try {
    const { templateId } = req.body; // 'all' 또는 특정 template_id
    
    logger.debug('Resetting roulette history', { templateId });
    
    const historyData = await getDataFile('roulette-history');
    const rouletteData = await getDataFile('roulette');
    let deletedCount = 0;
    
    let newHistoryData;
    if (templateId === 'all') {
      // 전체 초기화
      deletedCount = historyData.length;
      newHistoryData = [];
      
      // tickets와 keepItems도 전체 초기화
      rouletteData.tickets = [];
      rouletteData.keepItems = [];
      
      logger.info('Resetting all tickets and keepItems');
    } else {
      // 특정 템플릿만 초기화
      newHistoryData = historyData.filter((record: any) => {
        if (record.template_id === templateId) {
          deletedCount++;
          return false;
        }
        return true;
      });
      
      // 특정 템플릿의 tickets 삭제
      rouletteData.tickets.forEach((userTickets: any) => {
        if (userTickets.tickets && userTickets.tickets[templateId]) {
          delete userTickets.tickets[templateId];
        }
      });
      
      // 특정 템플릿의 keepItems 삭제
      rouletteData.keepItems.forEach((userKeepItems: any) => {
        if (userKeepItems.items) {
          userKeepItems.items = userKeepItems.items.filter((item: any) => 
            item.template_id !== templateId
          );
        }
      });
      
      logger.info('Resetting tickets and keepItems for template', { templateId });
    }
    
    await saveDataFile('roulette-history', newHistoryData);
    await saveDataFile('roulette', rouletteData);
    
    logger.info('Roulette history reset successfully', {
      templateId,
      deletedCount,
      remainingCount: newHistoryData.length
    });
    
    res.json({
      success: true,
      deletedCount,
      remainingCount: newHistoryData.length
    });
  } catch (error: any) {
    logger.error('Failed to reset roulette history', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to reset roulette history' });
  }
});

export default router;