import express from 'express';
import logger from '../utils/logger';
import { getDataFile, saveDataFile } from '../utils/fileManager';

const router = express.Router();

// 퀴즈 목록 조회
router.get('/', (req, res) => {
  try {
    logger.debug('Fetching quiz list');
    let data;
    try {
      data = getDataFile('quiz');
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
router.post('/', (req, res) => {
  try {
    logger.debug('Creating new quiz', { body: req.body });
    const { question, answer } = req.body;
    logger.debug('Creating new quiz', { question, answer });
    
    if (!question || !answer) {
      logger.warn('Quiz creation failed: missing required fields', { question, answer });
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    
    const data = getDataFile('quiz');
    const newQuiz = {
      id: `quiz-${Date.now()}`,
      question: question.trim(),
      answer: answer.trim(),
      created_at: new Date().toISOString()
    };
    
    data.push(newQuiz);
    saveDataFile('quiz', data);
    
    logger.info('Quiz created successfully', {
      id: newQuiz.id,
      question: newQuiz.question
    });
    
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
router.put('/:quizId', (req, res) => {
  try {
    const { quizId } = req.params;
    const { question, answer } = req.body;
    logger.debug('Updating quiz', { quizId, question, answer });
    
    if (!question || !answer) {
      logger.warn('Quiz update failed: missing required fields', { quizId, question, answer });
      return res.status(400).json({ error: 'Question and answer are required' });
    }
    
    const data = getDataFile('quiz');
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
    
    saveDataFile('quiz', data);
    
    logger.info('Quiz updated successfully', {
      quizId,
      oldQuestion: oldQuiz.question,
      newQuestion: data[quizIndex].question
    });
    
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
router.delete('/:quizId', (req, res) => {
  try {
    const { quizId } = req.params;
    logger.debug('Deleting quiz', { quizId });
    
    const data = getDataFile('quiz');
    const quizIndex = data.findIndex((quiz: any) => quiz.id === quizId);
    
    if (quizIndex === -1) {
      logger.warn('Quiz not found for deletion', { quizId });
      return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const deletedQuiz = data[quizIndex];
    data.splice(quizIndex, 1);
    saveDataFile('quiz', data);
    
    logger.info('Quiz deleted successfully', {
      quizId,
      question: deletedQuiz.question
    });
    
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
