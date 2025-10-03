import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const router = express.Router();

// 룰렛 기록 조회
router.get('/history', (req, res) => {
  try {
    const data = getDataFile('roulette-history');
    res.json(data);
  } catch (error: any) {
    logger.error('Failed to fetch roulette history', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to read roulette history' });
  }
});

// 특정 템플릿의 룰렛 기록 조회
router.get('/history/:templateId', (req, res) => {
  try {
    const { templateId } = req.params;
    const data = getDataFile('roulette-history');
    const filteredData = data.filter((item: any) => item.template_id === templateId);
    res.json(filteredData);
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
router.post('/spin/:templateId', (req, res) => {
  try {
    const { templateId } = req.params;
    const { userId, nickname } = req.body;
    
    logger.debug('Spinning roulette', { templateId, userId, nickname });
    
    // 템플릿 조회
    const templates = getDataFile('templates');
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
      item: selectedItem,
      used: false,
      timestamp: new Date().toISOString()
    };
    
    // 기록 저장
    const history = getDataFile('roulette-history');
    history.push(newRecord);
    saveDataFile('roulette-history', history);
    
    logger.info('Roulette spun successfully', {
      templateId,
      userId,
      nickname,
      selectedItem: selectedItem.label,
      percentage: selectedItem.percentage,
      randomValue: random.toFixed(3)
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

// 룰렛 기록 사용 상태 변경
router.put('/history/:recordId/use', (req, res) => {
  try {
    const { recordId } = req.params;
    const { used } = req.body;
    
    logger.debug('Updating roulette record status', { recordId, used });
    
    const data = getDataFile('roulette-history');
    const recordIndex = data.findIndex((item: any) => item.id === recordId);
    
    if (recordIndex === -1) {
      logger.warn('Roulette record not found for status update', { recordId });
      return res.status(404).json({ error: 'Record not found' });
    }
    
    const oldStatus = data[recordIndex].used;
    data[recordIndex].used = used;
    saveDataFile('roulette-history', data);
    
    logger.info('Roulette record status updated successfully', {
      recordId,
      oldStatus,
      newStatus: used,
      nickname: data[recordIndex].nickname
    });
    
    res.json(data[recordIndex]);
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

export default router;