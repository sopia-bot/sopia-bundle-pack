import { Request, Response } from 'express';
import { getDataFile, saveDataFile } from '../utils/fileManager';
import logger from '../utils/logger';
import { BrowserWindow } from 'electron';

/**
 * GET /command
 * 명령어 템플릿 설정 조회
 */
export async function getCommandTemplates(req: Request, res: Response): Promise<void> {
  try {
    const commandData = await getDataFile('command');
    logger.debug('Command templates retrieved');
    res.json(commandData);
  } catch (error) {
    logger.error('Failed to get command templates', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to get command templates' });
  }
}

/**
 * PUT /command
 * 명령어 템플릿 설정 업데이트
 */
export async function updateCommandTemplates(req: Request, res: Response): Promise<void> {
  try {
    const newCommandData = req.body;
    
    // 데이터 검증
    if (!newCommandData || typeof newCommandData !== 'object') {
      res.status(400).json({ error: 'Invalid command data' });
      return;
    }

    if (!newCommandData.commands || typeof newCommandData.commands !== 'object') {
      res.status(400).json({ error: 'Missing commands object' });
      return;
    }

    // 설정 저장
    await saveDataFile('command', newCommandData);
    
    logger.info('Command templates updated');

    // Worker에 업데이트 알림
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      window.webContents.send('starter-pack.sopia.dev', {
        channel: 'command-updated',
        data: 'command-updated'
      });
      logger.debug('Worker notified of command templates update');
    }

    res.json({ 
      success: true,
      message: 'Command templates updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update command templates', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to update command templates' });
  }
}

/**
 * PUT /command/:commandName
 * 특정 명령어 템플릿 업데이트
 */
export async function updateCommandTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { commandName } = req.params;
    const newTemplateData = req.body;
    
    // 데이터 검증
    if (!newTemplateData || typeof newTemplateData !== 'object') {
      res.status(400).json({ error: 'Invalid template data' });
      return;
    }

    // 기존 설정 가져오기
    const commandData = await getDataFile('command');
    
    // 명령어가 존재하는지 확인
    if (!commandData.commands[commandName]) {
      res.status(404).json({ error: 'Command not found' });
      return;
    }

    // 특정 명령어만 업데이트
    commandData.commands[commandName] = {
      ...commandData.commands[commandName],
      ...newTemplateData
    };

    // 설정 저장
    await saveDataFile('command', commandData);
    
    logger.info('Command template updated', { commandName });

    // Worker에 업데이트 알림
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      window.webContents.send('starter-pack.sopia.dev', {
        channel: 'command-updated',
        data: { commandName }
      });
      logger.debug('Worker notified of command template update', { commandName });
    }

    res.json({ 
      success: true,
      message: `Command template '${commandName}' updated successfully`,
      data: commandData.commands[commandName]
    });
  } catch (error) {
    logger.error('Failed to update command template', {
      commandName: req.params.commandName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to update command template' });
  }
}

/**
 * POST /command/:commandName/reset
 * 특정 명령어 템플릿을 기본값으로 리셋
 */
export async function resetCommandTemplate(req: Request, res: Response): Promise<void> {
  try {
    const { commandName } = req.params;
    
    // fileManager에서 기본값 가져오기
    const { defaultData } = await import('../utils/fileManager');
    
    if (!defaultData || !defaultData.command || !defaultData.command.commands[commandName]) {
      res.status(404).json({ error: 'Command not found in default data' });
      return;
    }

    // 기존 설정 가져오기
    const commandData = await getDataFile('command');
    
    // 기본값으로 리셋
    commandData.commands[commandName] = defaultData.command.commands[commandName];

    // 설정 저장
    await saveDataFile('command', commandData);
    
    logger.info('Command template reset to default', { commandName });

    // Worker에 업데이트 알림
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      window.webContents.send('starter-pack.sopia.dev', {
        channel: 'command-updated',
        data: { commandName }
      });
      logger.debug('Worker notified of command template reset', { commandName });
    }

    res.json({ 
      success: true,
      message: `Command template '${commandName}' reset to default`,
      data: commandData.commands[commandName]
    });
  } catch (error) {
    logger.error('Failed to reset command template', {
      commandName: req.params.commandName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to reset command template' });
  }
}

