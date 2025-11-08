import { Router } from 'express';
import path from 'path';
import { app } from 'electron';
import CfgLite from 'cfg-lite';
import { getDataFile, saveDataFile } from '../utils/fileManager';
import logger from '../utils/logger';

const router = Router();

// 공통 타입 정의
interface MigrationPreviewResult {
  success: boolean;
  bundleFound: boolean;
  template?: any;
  templates?: any[];
  historyCount?: number;
  historyPreview?: any[];
  error?: string;
}

// 마이그레이션 실행 결과
interface MigrationExecuteResult {
  success: boolean;
  templatesAdded: number;
  historyAdded: number;
  error?: string;
}

// User ID 조회 함수
async function fetchUserIdByTag(tag: string): Promise<number | null> {
  try {
    const response = await fetch(`https://kr-gw.spooncast.net/search/user?keyword=${tag}&page_size=30`);
    const data = await response.json();
    const user = data.results?.find((u: any) => u.tag === tag);
    return user?.id || null;
  } catch (error: any) {
    logger.error('Failed to fetch user ID', { tag, error: error?.message });
    return null;
  }
}

// 500ms 딜레이
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// #1 공식 룰렛 프리뷰
function previewType1(): MigrationPreviewResult {
  try {
    const bundlePath = path.join(app.getPath('userData'), 'bundles', 'roulette');
    const configPath = path.join(bundlePath, 'config.cfg');

    const cfg = new CfgLite(configPath);
    const config = cfg.get();

    if (!config || Object.keys(config).length === 0) {
      return { success: false, bundleFound: false, error: '번들이 설치되어 있지 않습니다.' };
    }

    const template = {
      template_id: `migrated-type1-${Date.now()}`,
      name: 'roulette에서 가져온 설정',
      mode: config.options?.type === 'min' ? 'spoon' : 'sticker',
      sticker: config.options?.present?.name || '',
      spoon: parseInt(config.options?.min) || 0,
      division: config.options?.rule === 'division' || config.options?.rule === 'combo',
      auto_run: config.options?.auto || false,
      enabled: config.enable || false,
      items: (config.list || []).map((item: any) => ({
        type: 'custom',
        label: item.value,
        percentage: item.percentage,
      })),
    };

    return {
      success: true,
      bundleFound: true,
      template,
      historyCount: 0,
    };
  } catch (error: any) {
    logger.error('Preview Type 1 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, bundleFound: false, error: '공식 룰렛 번들이 설치되어 있지 않습니다.' };
    }
    return { success: false, bundleFound: false, error: '번들 설정 파일을 읽는 중 오류가 발생했습니다.' };
  }
}

// #4 [crown] 룰렛과 기록 프리뷰
function previewType4(): MigrationPreviewResult {
  try {
    const bundlePath = path.join(app.getPath('userData'), 'bundles', '[crown] roulette and record');
    const configPath = path.join(bundlePath, 'config.cfg');

    const cfg = new CfgLite(configPath);
    const config = cfg.get();

    if (!config || Object.keys(config).length === 0) {
      return { success: false, bundleFound: false, error: '번들이 설치되어 있지 않습니다.' };
    }

    const template = {
      template_id: `migrated-type4-${Date.now()}`,
      name: '[crown] roulette에서 가져온 설정',
      mode: config.options?.type === 'min' ? 'spoon' : 'sticker',
      sticker: config.options?.present?.name || '',
      spoon: parseInt(config.options?.min) || 0,
      division: config.options?.rule === 'division' || config.options?.rule === 'combo',
      auto_run: config.options?.auto || false,
      enabled: config.enable || false,
      items: (config.list || []).map((item: any) => ({
        type: 'custom',
        label: item.value,
        percentage: item.percentage,
      })),
    };

    return {
      success: true,
      bundleFound: true,
      template,
      historyCount: 0,
    };
  } catch (error: any) {
    logger.error('Preview Type 4 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, bundleFound: false, error: '[crown] 룰렛과 기록 번들이 설치되어 있지 않습니다.' };
    }
    return { success: false, bundleFound: false, error: '번들 설정 파일을 읽는 중 오류가 발생했습니다.' };
  }
}

// #2 [gloomy] 룰렛 프리뷰
function previewType2(): MigrationPreviewResult {
  try {
    const bundlePath = path.join(app.getPath('userData'), 'bundles', '[gloomy] roulette');
    const configPath = path.join(bundlePath, 'config.cfg');
    const recordPath = path.join(bundlePath, 'record.json');

    const cfg = new CfgLite(configPath);
    const config = cfg.get();

    if (!config || Object.keys(config).length === 0) {
      return { success: false, bundleFound: false, error: '번들이 설치되어 있지 않습니다.' };
    }

    const template = {
      template_id: `migrated-type2-${Date.now()}`,
      name: '[gloomy] roulette에서 가져온 설정',
      mode: config.options?.type === 'min' ? 'spoon' : 'sticker',
      sticker: config.options?.present?.name || '',
      spoon: parseInt(config.options?.min) || 0,
      division: config.options?.rule === 'division' || config.options?.rule === 'combo',
      auto_run: config.options?.auto || false,
      enabled: config.enable || false,
      items: (config.list || []).map((item: any) => ({
        type: 'custom',
        label: item.value,
        percentage: item.percentage,
      })),
    };

    // record.json 읽기
    let historyCount = 0;
    let historyPreview: any[] = [];

    try {
      const fs = require('fs');
      const recordData = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));

      for (const userTag in recordData) {
        const userData = recordData[userTag];
        
        if (userData.keepList?.length > 0) {
          userData.keepList.forEach((item: any) => {
            historyPreview.push({
              nickname: userData.nickname,
              tag: userTag,
              item_label: item.name,
              template_name: template.name,
            });
            historyCount++;
          });
        }
      }
    } catch (error: any) {
      logger.warn('Failed to read record.json', { error: error?.message });
    }

    return {
      success: true,
      bundleFound: true,
      template,
      historyCount,
      historyPreview,
    };
  } catch (error: any) {
    logger.error('Preview Type 2 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, bundleFound: false, error: '[gloomy] 룰렛 자동킵 버전 번들이 설치되어 있지 않습니다.' };
    }
    return { success: false, bundleFound: false, error: '번들 설정 파일을 읽는 중 오류가 발생했습니다.' };
  }
}

// #3 하늘 룰렛 프리뷰
function previewType3(): MigrationPreviewResult {
  try {
    const bundlePath = path.join(app.getPath('userData'), 'bundles', 'roulette88');
    const templates: any[] = [];

    // config1.cfg ~ config4.cfg 읽기
    for (let i = 1; i <= 4; i++) {
      const configPath = path.join(bundlePath, `config${i}.cfg`);
      try {
        const cfg = new CfgLite(configPath);
        const config = cfg.get();

        if (config && Object.keys(config).length > 0) {
          templates.push({
            template_id: `migrated-type3-${i}-${Date.now()}`,
            name: `하늘 룰렛 ${i}번`,
            mode: config.options?.type === 'min' ? 'spoon' : 'sticker',
            sticker: config.options?.present?.name || '',
            spoon: parseInt(config.options?.min) || 0,
            division: config.options?.rule === 'division' || config.options?.rule === 'combo',
            auto_run: config.options?.auto || false,
            enabled: config.enable || false,
            items: (config.list || []).map((item: any) => ({
              type: 'custom',
              label: item.value,
              percentage: item.percentage,
            })),
          });
        }
      } catch (error: any) {
        logger.warn(`Failed to read config${i}.cfg`, { error: error?.message });
      }
    }

    if (templates.length === 0) {
      return { success: false, bundleFound: false, error: '번들이 설치되어 있지 않습니다.' };
    }

    // viewer_history.json 읽기
    let historyCount = 0;
    let historyPreview: any[] = [];

    try {
      const fs = require('fs');
      const historyPath = path.join(bundlePath, 'viewer_history.json');
      const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));

      for (const userTag in historyData) {
        const userData = historyData[userTag];
        const records = userData.records || {};

        for (const itemLabel in records) {
          const count = records[itemLabel];
          historyCount += count;

          // 어느 템플릿에 속하는지 찾기
          const matchedTemplate = templates.find(t =>
            t.items.some((item: any) => item.label === itemLabel)
          );

          historyPreview.push({
            nickname: userData.nickname,
            tag: userTag,
            item_label: itemLabel,
            count,
            template_name: matchedTemplate?.name || '(매칭 안됨)',
          });
        }
      }
    } catch (error: any) {
      logger.warn('Failed to read viewer_history.json', { error: error?.message });
    }

    return {
      success: true,
      bundleFound: true,
      templates,
      historyCount,
      historyPreview,
    };
  } catch (error: any) {
    logger.error('Preview Type 3 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, bundleFound: false, error: '🎆하 늘 𝓂𝄞𝓇 룰렛🎆 번들이 설치되어 있지 않습니다.' };
    }
    return { success: false, bundleFound: false, error: '번들 설정 파일을 읽는 중 오류가 발생했습니다.' };
  }
}

// GET /migration/roulette/preview?type=1|2|3|4
router.get('/preview', (req, res) => {
  try {
    const type = parseInt(req.query.type as string);

    if (![1, 2, 3, 4].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be 1, 2, 3, or 4.' });
    }

    let result: MigrationPreviewResult;

    switch (type) {
      case 1:
        result = previewType1();
        break;
      case 2:
        result = previewType2();
        break;
      case 3:
        result = previewType3();
        break;
      case 4:
        result = previewType4();
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Preview failed', { error: error?.message, stack: error?.stack });
    res.status(500).json({ error: error?.message || 'Preview failed' });
  }
});

// POST /migration/roulette/execute
router.post('/execute', async (req, res) => {
  try {
    const { type } = req.body;

    if (![1, 2, 3, 4].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be 1, 2, 3, or 4.' });
    }

    let result: MigrationExecuteResult;

    switch (type) {
      case 1:
        result = await executeType1();
        break;
      case 2:
        result = await executeType2();
        break;
      case 3:
        result = await executeType3();
        break;
      case 4:
        result = await executeType4();
        break;
      default:
        return res.status(400).json({ error: 'Invalid type' });
    }

    res.json(result);
  } catch (error: any) {
    logger.error('Execute failed', { error: error?.message, stack: error?.stack });
    res.status(500).json({ error: error?.message || 'Execute failed' });
  }
});

// #1 공식 룰렛 실행
async function executeType1(): Promise<MigrationExecuteResult> {
  try {
    const preview = previewType1();
    if (!preview.success || !preview.template) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: preview.error };
    }

    const templates = await getDataFile('templates');
    templates.push(preview.template);
    await saveDataFile('templates', templates);

    logger.info('Type 1 migration completed', { template_id: preview.template.template_id });

    return {
      success: true,
      templatesAdded: 1,
      historyAdded: 0,
    };
  } catch (error: any) {
    logger.error('Execute Type 1 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: '번들 파일을 찾을 수 없습니다.' };
    }
    return { success: false, templatesAdded: 0, historyAdded: 0, error: '마이그레이션 중 오류가 발생했습니다.' };
  }
}

// #4 [crown] 룰렛과 기록 실행
async function executeType4(): Promise<MigrationExecuteResult> {
  try {
    const preview = previewType4();
    if (!preview.success || !preview.template) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: preview.error };
    }

    const templates = await getDataFile('templates');
    templates.push(preview.template);
    await saveDataFile('templates', templates);

    logger.info('Type 4 migration completed', { template_id: preview.template.template_id });

    return {
      success: true,
      templatesAdded: 1,
      historyAdded: 0,
    };
  } catch (error: any) {
    logger.error('Execute Type 4 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: '번들 파일을 찾을 수 없습니다.' };
    }
    return { success: false, templatesAdded: 0, historyAdded: 0, error: '마이그레이션 중 오류가 발생했습니다.' };
  }
}

// #2 [gloomy] 룰렛 실행
async function executeType2(): Promise<MigrationExecuteResult> {
  try {
    const preview = previewType2();
    if (!preview.success || !preview.template) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: preview.error };
    }

    // 템플릿 저장
    const templates = await getDataFile('templates');
    templates.push(preview.template);
    await saveDataFile('templates', templates);

    // roulette-history 마이그레이션
    const bundlePath = path.join(app.getPath('userData'), 'bundles', '[gloomy] roulette');
    const recordPath = path.join(bundlePath, 'record.json');

    let historyAdded = 0;

    try {
      const fs = require('fs');
      const recordData = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
      const rouletteHistory = await getDataFile('roulette-history');

      for (const userTag in recordData) {
        const userData = recordData[userTag];

        // 500ms 딜레이 후 user_id 조회
        await delay(500);
        const userId = await fetchUserIdByTag(userTag);

        if (!userId) {
          logger.warn('User ID not found, skipping', { tag: userTag });
          continue;
        }

        // keepList 처리
        for (const item of userData.keepList || []) {
          rouletteHistory.push({
            id: `roulette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            template_id: preview.template.template_id,
            user_id: userId,
            nickname: userData.nickname,
            item: {
              type: 'custom',
              label: item.name,
              percentage: 0,
            },
            used: false,
            timestamp: new Date().toISOString(),
          });
          historyAdded++;
        }
      }

      await saveDataFile('roulette-history', rouletteHistory);
    } catch (error: any) {
      logger.error('Failed to migrate history for Type 2', { error: error?.message, stack: error?.stack });
    }

    logger.info('Type 2 migration completed', {
      template_id: preview.template.template_id,
      historyAdded,
    });

    return {
      success: true,
      templatesAdded: 1,
      historyAdded,
    };
  } catch (error: any) {
    logger.error('Execute Type 2 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: '번들 파일을 찾을 수 없습니다.' };
    }
    return { success: false, templatesAdded: 0, historyAdded: 0, error: '마이그레이션 중 오류가 발생했습니다.' };
  }
}

// #3 하늘 룰렛 실행
async function executeType3(): Promise<MigrationExecuteResult> {
  try {
    const preview = previewType3();
    if (!preview.success || !preview.templates || preview.templates.length === 0) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: preview.error };
    }

    // 템플릿 저장
    const templates = await getDataFile('templates');
    preview.templates.forEach(t => templates.push(t));
    await saveDataFile('templates', templates);

    // roulette-history 마이그레이션
    const bundlePath = path.join(app.getPath('userData'), 'bundles', 'roulette88');
    const historyPath = path.join(bundlePath, 'viewer_history.json');

    let historyAdded = 0;

    try {
      const fs = require('fs');
      const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      const rouletteHistory = await getDataFile('roulette-history');

      for (const userTag in historyData) {
        const userData = historyData[userTag];

        // 500ms 딜레이 후 user_id 조회
        await delay(500);
        const userId = await fetchUserIdByTag(userTag);

        if (!userId) {
          logger.warn('User ID not found, skipping', { tag: userTag });
          continue;
        }

        // records 처리
        const records = userData.records || {};
        for (const itemLabel in records) {
          const count = records[itemLabel];

          // 어느 템플릿에 속하는지 찾기
          const matchedTemplate = preview.templates.find(t =>
            t.items.some((item: any) => item.label === itemLabel)
          );

          if (!matchedTemplate) {
            logger.warn('No matching template found for item', { itemLabel });
            continue;
          }

          // count 만큼 반복
          for (let i = 0; i < count; i++) {
            rouletteHistory.push({
              id: `roulette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              template_id: matchedTemplate.template_id,
              user_id: userId,
              nickname: userData.nickname,
              item: {
                type: 'custom',
                label: itemLabel,
                percentage: 0,
              },
              used: false,
              timestamp: new Date().toISOString(),
            });
            historyAdded++;
          }
        }
      }

      await saveDataFile('roulette-history', rouletteHistory);
    } catch (error: any) {
      logger.error('Failed to migrate history for Type 3', { error: error?.message, stack: error?.stack });
    }

    logger.info('Type 3 migration completed', {
      templatesAdded: preview.templates.length,
      historyAdded,
    });

    return {
      success: true,
      templatesAdded: preview.templates.length,
      historyAdded,
    };
  } catch (error: any) {
    logger.error('Execute Type 3 failed', { error: error?.message, stack: error?.stack });
    // 파일을 찾을 수 없는 경우
    if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('no such file')) {
      return { success: false, templatesAdded: 0, historyAdded: 0, error: '번들 파일을 찾을 수 없습니다.' };
    }
    return { success: false, templatesAdded: 0, historyAdded: 0, error: '마이그레이션 중 오류가 발생했습니다.' };
  }
}

// 계정 변경 시 룰렛 기록 업데이트 함수 (내부 사용)
export async function updateRouletteAccount(oldUserId: number, newUserId: number, newNickname?: string): Promise<{ success: boolean; historyUpdated: number }> {
  try {
    logger.debug('Updating roulette records for account change', { oldUserId, newUserId });

    const rouletteData = await getDataFile('roulette');
    const historyData = await getDataFile('roulette-history');

    let historyUpdated = 0;

    // roulette keepItems 업데이트
    if (rouletteData.keepItems) {
      const keepItemsIndex = rouletteData.keepItems.findIndex((k: any) => k.user_id === parseInt(oldUserId.toString()));
      if (keepItemsIndex !== -1) {
        rouletteData.keepItems[keepItemsIndex] = {
          ...rouletteData.keepItems[keepItemsIndex],
          user_id: parseInt(newUserId.toString()),
          nickname: newNickname || rouletteData.keepItems[keepItemsIndex].nickname,
          tag: rouletteData.keepItems[keepItemsIndex].tag,
        };
      }
    }

    // roulette tickets 업데이트
    if (rouletteData.tickets) {
      const ticketsIndex = rouletteData.tickets.findIndex((t: any) => t.user_id === parseInt(oldUserId.toString()));
      if (ticketsIndex !== -1) {
        rouletteData.tickets[ticketsIndex] = {
          ...rouletteData.tickets[ticketsIndex],
          user_id: parseInt(newUserId.toString()),
          nickname: newNickname || rouletteData.tickets[ticketsIndex].nickname,
          tag: rouletteData.tickets[ticketsIndex].tag,
        };
      }
    }

    await saveDataFile('roulette', rouletteData);

    // roulette-history 업데이트
    historyData.forEach((record: any) => {
      if (record.user_id === parseInt(oldUserId.toString())) {
        record.user_id = parseInt(newUserId.toString());
        if (newNickname) {
          record.nickname = newNickname;
        }
        historyUpdated++;
      }
    });

    if (historyUpdated > 0) {
      await saveDataFile('roulette-history', historyData);
    }

    logger.info('Roulette account updated successfully', {
      oldUserId,
      newUserId,
      historyUpdated
    });

    return {
      success: true,
      historyUpdated
    };
  } catch (error: any) {
    logger.error('Failed to update roulette account', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      oldUserId,
      newUserId
    });
    throw error;
  }
}

// POST /migration/roulette/update-account
// 계정 변경 시 룰렛 기록 업데이트 (fanscore 마이그레이션에서 사용)
router.post('/update-account', async (req, res) => {
  try {
    const { oldUserId, newUserId, newNickname } = req.body;

    if (!oldUserId || !newUserId) {
      return res.status(400).json({ error: 'oldUserId and newUserId are required' });
    }

    const result = await updateRouletteAccount(oldUserId, newUserId, newNickname);
    res.json(result);
  } catch (error: any) {
    logger.error('Failed to update roulette account', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to update roulette account' });
  }
});

export default router;

