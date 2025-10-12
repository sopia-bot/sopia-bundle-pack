import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';
const { BrowserWindow } = require('electron');

const router = express.Router();

/**
 * Worker에 템플릿 업데이트 알림
 */
function notifyWorkerTemplateUpdate() {
  try {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      window.webContents.send('starter-pack.sopia.dev', {
        channel: 'template-updated'
      });
      logger.debug('Worker notified of template update');
    }
  } catch (error: any) {
    logger.warn('Failed to notify worker of template update', {
      error: error?.message || 'Unknown error'
    });
  }
}

// 템플릿 목록 조회
router.get('/', async (req, res) => {
  try {
    logger.debug('Fetching templates list');
    const data = await getDataFile('templates');
    logger.info('Templates list fetched successfully', { count: data.length });
    res.json(data);
  } catch (error: any) {
    logger.error('Failed to fetch templates list', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to read templates data' });
  }
});

// 특정 템플릿 조회
router.get('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    logger.debug('Fetching template', { templateId });
    
    const data = await getDataFile('templates');
    const template = data.find((item: any) => item.template_id === templateId);
    
    if (!template) {
      logger.warn('Template not found', { templateId });
      return res.status(404).json({ error: 'Template not found' });
    }
    
    logger.info('Template fetched successfully', { templateId, name: template.name });
    res.json(template);
  } catch (error: any) {
    logger.error('Failed to fetch template', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      templateId: req.params.templateId
    });
    res.status(500).json({ error: 'Failed to read template data' });
  }
});

// 템플릿 생성
router.post('/', async (req, res) => {
  try {
    const template = req.body;
    logger.debug('Creating new template', { templateId: template.template_id, name: template.name });
    
    const data = await getDataFile('templates');
    
    // 아이템 총 확률 검증
    const totalPercentage = template.items.reduce((sum: number, item: any) => sum + item.percentage, 0);
    if (totalPercentage > 100) {
      logger.warn('Template creation failed: total percentage exceeds 100%', {
        templateId: template.template_id,
        totalPercentage
      });
      return res.status(400).json({ error: 'Total percentage cannot exceed 100%' });
    }
    
    data.push(template);
    await saveDataFile('templates', data);
    
    logger.info('Template created successfully', {
      templateId: template.template_id,
      name: template.name,
      itemCount: template.items.length,
      totalPercentage
    });
    
    // Worker에 템플릿 업데이트 알림
    notifyWorkerTemplateUpdate();
    
    res.json(template);
  } catch (error: any) {
    logger.error('Failed to create template', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      template: req.body
    });
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// 템플릿 업데이트
router.put('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const updatedTemplate = req.body;
    logger.debug('Updating template', { templateId, name: updatedTemplate.name });
    
    const data = await getDataFile('templates');
    const templateIndex = data.findIndex((item: any) => item.template_id === templateId);
    
    if (templateIndex === -1) {
      logger.warn('Template not found for update', { templateId });
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // 아이템 총 확률 검증
    const totalPercentage = updatedTemplate.items.reduce((sum: number, item: any) => sum + item.percentage, 0);
    if (totalPercentage > 100) {
      logger.warn('Template update failed: total percentage exceeds 100%', {
        templateId,
        totalPercentage
      });
      return res.status(400).json({ error: 'Total percentage cannot exceed 100%' });
    }
    
    const oldTemplate = { ...data[templateIndex] };
    data[templateIndex] = updatedTemplate;
    await saveDataFile('templates', data);
    
    logger.info('Template updated successfully', {
      templateId,
      name: updatedTemplate.name,
      itemCount: updatedTemplate.items.length,
      totalPercentage
    });
    
    // Worker에 템플릿 업데이트 알림
    notifyWorkerTemplateUpdate();
    
    res.json(updatedTemplate);
  } catch (error: any) {
    logger.error('Failed to update template', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      templateId: req.params.templateId,
      template: req.body
    });
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// 템플릿 삭제
router.delete('/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    logger.debug('Deleting template', { templateId });
    
    const data = await getDataFile('templates');
    const initialLength = data.length;
    const filteredData = data.filter((item: any) => item.template_id !== templateId);
    
    if (data.length === filteredData.length) {
      logger.warn('Template not found for deletion', { templateId });
      return res.status(404).json({ error: 'Template not found' });
    }
    
    await saveDataFile('templates', filteredData);
    
    logger.info('Template deleted successfully', { templateId });
    
    // Worker에 템플릿 업데이트 알림
    notifyWorkerTemplateUpdate();
    
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    logger.error('Failed to delete template', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      templateId: req.params.templateId
    });
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;