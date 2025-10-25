import { Router } from 'express';
import { getDataFile, saveDataFile } from '../utils/fileManager';
import logger from '../utils/logger';
const { BrowserWindow } = require('electron');

const router = Router();
const DOMAIN = 'starter-pack.sopia.dev';

const YACHT_CONFIG_DEFAULT = {
  enabled: true,
  winning_score: 50,
  score_multiplier: 100,
  game_cooldown: 60,
};

/**
 * GET /yacht/config - 야추 설정 조회
 */
router.get('/config', async (req, res) => {
  try {
    const config = await getDataFile('yacht-config').catch(() => YACHT_CONFIG_DEFAULT);
    res.json(config || YACHT_CONFIG_DEFAULT);
    logger.info('Yacht config retrieved');
  } catch (error: any) {
    logger.error('Failed to retrieve yacht config', error);
    res.status(500).json({ error: 'Failed to retrieve config' });
  }
});

/**
 * POST /yacht/config - 야추 설정 저장
 */
router.post('/config', async (req, res) => {
  try {
    const { enabled, winning_score, score_multiplier, game_cooldown } = req.body;

    const config = {
      enabled: typeof enabled === 'boolean' ? enabled : true,
      winning_score: typeof winning_score === 'number' ? winning_score : 50,
      score_multiplier: typeof score_multiplier === 'number' ? score_multiplier : 100,
      game_cooldown: typeof game_cooldown === 'number' ? game_cooldown : 60,
    };

    await saveDataFile('yacht-config', config);
    res.json({ success: true, config });
    logger.info('Yacht config saved', { config });
  } catch (error: any) {
    logger.error('Failed to save yacht config', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

/**
 * POST /yacht/cooldown/clear - 모든 플레이어 쿨타임 초기화
 */
router.post('/cooldown/clear', async (req, res) => {
  try {
    // Worker 프로세스에 쿨타임 초기화 메시지 전송
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send(DOMAIN, {
        channel: 'yacht-cooldown-clear',
        data: { timestamp: Date.now() }
      });
    }

    res.json({ success: true, message: 'All player cooldowns cleared' });
    logger.info('Yacht player cooldowns cleared');
  } catch (error: any) {
    logger.error('Failed to clear yacht cooldowns', error);
    res.status(500).json({ error: 'Failed to clear cooldowns' });
  }
});

export default router;
