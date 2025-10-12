import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const { BrowserWindow } = require('electron');
const router = express.Router();

// 워커에 퀴즈 업데이트 알림
function notifyWorkerQuizUpdate() {
  try {
    const window = BrowserWindow.getAllWindows()[0];
    if (window) {
      window.webContents.send('starter-pack.sopia.dev', {
        channel: 'quiz-updated'
      });
      logger.debug('Worker notified of quiz update');
    }
  } catch (error: any) {
    logger.warn('Failed to notify worker of quiz update', {
      error: error?.message || 'Unknown error'
    });
  }
}

// 퀴즈 목록 조회
router.get('/', async (req, res) => {
  try {
    logger.debug('Fetching quiz list');
    let data;
    try {
      data = await getDataFile('quiz');
    } catch (fileError) {
      // 파일이 없거나 읽기 실패 시 빈 배열 반환
      logger.warn('Quiz file not found or empty, returning empty array');
      data = [];
    }
    logger.info('Quiz list fetched successfully', { count: data.length });
    res.json(data);
  } catch (error: any) {
    logger.error('Failed to fetch quiz list', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined
    });
    res.status(500).json({ error: 'Failed to read quiz data' });
  }
});

// 퀴즈 추가
router.post('/', async (req, res) => {
  try {
    logger.debug('Creating new quiz', { body: req.body });
    const { question, answer } = req.body;
    logger.debug('Creating new quiz', { question, answer });
    
    if (!question || !answer) {
      logger.warn('Quiz creation failed: missing required fields', { question, answer });
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    
    const data = await getDataFile('quiz');
    const newQuiz = {
      id: `quiz-${Date.now()}`,
      question: question.trim(),
      answer: answer.trim(),
      created_at: new Date().toISOString()
    };
    
    data.push(newQuiz);
    await saveDataFile('quiz', data);
    
    logger.info('Quiz created successfully', {
      id: newQuiz.id,
      question: newQuiz.question
    });
    
    // 워커에 알림
    notifyWorkerQuizUpdate();
    
    res.json(newQuiz);
  } catch (error: any) {
    logger.error('Failed to create quiz', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

// 퀴즈 수정
router.put('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { question, answer } = req.body;
    logger.debug('Updating quiz', { quizId, question, answer });
    
    if (!question || !answer) {
      logger.warn('Quiz update failed: missing required fields', { quizId, question, answer });
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    
    const data = await getDataFile('quiz');
    const quizIndex = data.findIndex((quiz: any) => quiz.id === quizId);
    
    if (quizIndex === -1) {
      logger.warn('Quiz not found for update', { quizId });
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const oldQuiz = { ...data[quizIndex] };
    data[quizIndex] = {
      ...data[quizIndex],
      question: question.trim(),
      answer: answer.trim(),
      updated_at: new Date().toISOString()
    };
    
    await saveDataFile('quiz', data);
    
    logger.info('Quiz updated successfully', {
      quizId,
      oldQuestion: oldQuiz.question,
      newQuestion: data[quizIndex].question
    });
    
    // 워커에 알림
    notifyWorkerQuizUpdate();
    
    res.json(data[quizIndex]);
  } catch (error: any) {
    logger.error('Failed to update quiz', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      quizId: req.params.quizId,
      body: req.body
    });
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

// 퀴즈 삭제
router.delete('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    logger.debug('Deleting quiz', { quizId });
    
    const data = await getDataFile('quiz');
    const quizIndex = data.findIndex((quiz: any) => quiz.id === quizId);
    
    if (quizIndex === -1) {
      logger.warn('Quiz not found for deletion', { quizId });
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const deletedQuiz = data[quizIndex];
    data.splice(quizIndex, 1);
    await saveDataFile('quiz', data);
    
    logger.info('Quiz deleted successfully', {
      quizId,
      question: deletedQuiz.question
    });
    
    // 워커에 알림
    notifyWorkerQuizUpdate();
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error: any) {
    logger.error('Failed to delete quiz', {
      error: error?.message || 'Unknown error',
      stack: error?.stack || undefined,
      quizId: req.params.quizId
    });
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

export default router;
