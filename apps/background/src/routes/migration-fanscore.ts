import express from 'express';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import logger from '../utils/logger';

const router = express.Router();
import CfgLite from 'cfg-lite';

interface OldConfig {
  options: {
    chatpoint: number;
    likepoint: number;
    attendpoint: number;
    lottospoon: number;
    lottodefpoint: number;
    quiz_enable: boolean;
    quiz_itv: string;
    quiz_point: string;
  };
  list: Array<{
    question: string;
    answer: string;
  }>;
}

interface OldUserInfo {
  nickname: string;
  tag: string;
  last_attend: number;
  level: number;
  point: number;
  attend_count: number;
  heart_count: number;
  chat_count: number;
  is_double: boolean;
  spoon: number[];
}

interface OldDataFile {
  help_message: string;
  user_info: OldUserInfo[];
}

interface PreviewData {
  config: {
    chat_score: number;
    like_score: number;
    attendance_score: number;
    lottery_spoon_required: number;
    quiz_enabled: boolean;
    quiz_interval: number;
    quiz_bonus: number;
  };
  quizzes: Array<{
    question: string;
    answer: string;
  }>;
  users: Array<{
    nickname: string;
    tag: string;
    score: number;
    exp: number;
    chat_count: number;
    like_count: number;
    spoon_count: number;
    lottery_tickets: number;
  }>;
}

/**
 * GET /migration/fanscore/preview
 * 마이그레이션할 데이터 미리보기 (번들 설치 확인 포함)
 */
router.get('/preview', async (req, res) => {
  try {
    const bundlePath = path.join(app.getPath('userData'), 'bundles/fan_level');
    
    // 번들 설치 여부 확인
    if (!fs.existsSync(bundlePath)) {
      return res.status(404).json({
        success: false,
        message: '애청지수 번들이 설치되어있지 않습니다.'
      });
    }

    logger.info('Migration preview started', { bundlePath });

    // 설정 파일 읽기
    const configPath = path.join(bundlePath, 'config.cfg');
    if (!fs.existsSync(configPath)) {
      throw new Error('설정 파일을 찾을 수 없습니다.');
    }

    const cfg = new CfgLite(configPath);
    const oldConfig: OldConfig = cfg.get();

    // 데이터 파일 읽기 (가장 최근 수정된 파일)
    const dataPath = path.join(bundlePath, 'data');
    if (!fs.existsSync(dataPath)) {
      throw new Error('데이터 폴더를 찾을 수 없습니다.');
    }

    const files = fs.readdirSync(dataPath)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(dataPath, file),
        mtime: fs.statSync(path.join(dataPath, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (files.length === 0) {
      throw new Error('데이터 파일을 찾을 수 없습니다.');
    }

    const latestFile = files[0];
    logger.info('Latest data file found', { file: latestFile.name });

    const oldData: OldDataFile = JSON.parse(fs.readFileSync(latestFile.path, 'utf-8'));

    // 미리보기 데이터 생성
    const previewData: PreviewData = {
      config: {
        chat_score: oldConfig.options.chatpoint || 1,
        like_score: oldConfig.options.likepoint || 10,
        attendance_score: oldConfig.options.attendpoint || 10,
        lottery_spoon_required: oldConfig.options.lottospoon || 50,
        quiz_enabled: oldConfig.options.quiz_enable || false,
        quiz_interval: (parseInt(oldConfig.options.quiz_itv) * 60) || 180,
        quiz_bonus: parseInt(oldConfig.options.quiz_point) || 10,
      },
      quizzes: oldConfig.list || [],
      users: oldData.user_info.map(user => ({
        nickname: user.nickname,
        tag: user.tag,
        score: user.point,
        exp: user.point,
        chat_count: user.chat_count || 0,
        like_count: user.heart_count || 0,
        spoon_count: (user.spoon && user.spoon.length > 0) ? user.spoon[0] : 0,
        lottery_tickets: (user.spoon && user.spoon.length > 2) ? user.spoon[2] : 0,
      }))
    };

    logger.info('Migration preview completed', {
      userCount: previewData.users.length,
      quizCount: previewData.quizzes.length
    });

    res.json({
      success: true,
      data: previewData
    });

  } catch (error: any) {
    logger.error('Migration preview failed', {
      error: error?.message,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      message: error?.message || '파일을 읽는 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /migration/fanscore/execute
 * 마이그레이션 실행
 */
router.post('/execute', async (req, res) => {
  try {
    const { data } = req.body as { data: PreviewData };

    if (!data) {
      return res.status(400).json({
        success: false,
        message: '마이그레이션 데이터가 없습니다.'
      });
    }

    logger.info('Migration execute started', {
      userCount: data.users.length,
      quizCount: data.quizzes.length
    });

    // 설정 파일 마이그레이션
    const { getDataFile, saveDataFile } = await import('../utils/fileManager');
    
    const newConfig = {
      enabled: true,
      attendance_score: data.config.attendance_score,
      chat_score: data.config.chat_score,
      like_score: data.config.like_score,
      spoon_score: 100, // 기본값 유지
      quiz_enabled: data.config.quiz_enabled,
      quiz_bonus: data.config.quiz_bonus,
      quiz_interval: data.config.quiz_interval,
      quiz_timeout: 5, // 기본값
      lottery_enabled: true, // 기본값
      lottery_spoon_required: data.config.lottery_spoon_required,
    };

    await saveDataFile('fanscore-config', newConfig);
    logger.info('Config migrated');

    // 퀴즈 마이그레이션
    const newQuizzes = data.quizzes.map(quiz => ({
      id: `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question: quiz.question,
      answer: quiz.answer,
      created_at: new Date().toISOString(),
    }));

    await saveDataFile('quiz', newQuizzes);
    logger.info('Quizzes migrated', { count: newQuizzes.length });

    // 사용자 데이터 마이그레이션 (user_id 조회 포함)
    const existingFanscore = await getDataFile('fanscore');
    const fanscoreMap = new Map(existingFanscore.map((u: any) => [u.tag, u]));

    const migratedUsers = [];
    const failedUsers = [];

    for (const user of data.users) {
      try {
        // 500ms 대기
        await new Promise(resolve => setTimeout(resolve, 500));

        // user_id 조회
        const response = await fetch(
          `https://kr-gw.spooncast.net/search/user?keyword=${encodeURIComponent(user.tag)}&page_size=30`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://www.spooncast.net/',
              'Origin': 'https://www.spooncast.net/',
            }
          }
        );

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const searchResult = await response.json();
        const foundUser = searchResult.results?.find((r: any) => r.tag === user.tag);

        if (!foundUser) {
          logger.warn('User not found', { tag: user.tag, nickname: user.nickname });
          failedUsers.push({ tag: user.tag, nickname: user.nickname, reason: 'User not found in API' });
          continue;
        }

        const userId = foundUser.id;

        // 레벨 계산 (exp 기반)
        let level = 1;
        let requiredExp = 100; // level^2 * 100
        let remainingExp = user.exp;

        while (remainingExp >= requiredExp) {
          remainingExp -= requiredExp;
          level++;
          requiredExp = level * level * 100;
        }

        // 기존 사용자 확인 및 업데이트/추가
        const newUserData = {
          user_id: userId,
          nickname: user.nickname,
          tag: user.tag,
          score: user.score,
          exp: user.exp,
          level: level,
          chat_count: user.chat_count,
          like_count: user.like_count,
          spoon_count: user.spoon_count,
          lottery_tickets: user.lottery_tickets,
          attendance_live_id: null,
        };

        fanscoreMap.set(user.tag, newUserData);
        migratedUsers.push({ tag: user.tag, nickname: user.nickname, user_id: userId });

        logger.info('User migrated', { tag: user.tag, user_id: userId, level });

      } catch (error: any) {
        logger.error('User migration failed', {
          tag: user.tag,
          nickname: user.nickname,
          error: error?.message
        });
        failedUsers.push({
          tag: user.tag,
          nickname: user.nickname,
          reason: error?.message || 'Unknown error'
        });
      }
    }

    // 최종 저장
    const finalFanscore = Array.from(fanscoreMap.values());
    await saveDataFile('fanscore', finalFanscore);

    logger.info('Migration completed', {
      total: data.users.length,
      success: migratedUsers.length,
      failed: failedUsers.length
    });

    res.json({
      success: true,
      message: '마이그레이션이 완료되었습니다.',
      result: {
        total: data.users.length,
        migrated: migratedUsers.length,
        failed: failedUsers.length,
        failedUsers: failedUsers
      }
    });

  } catch (error: any) {
    logger.error('Migration execute failed', {
      error: error?.message,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      message: error?.message || '마이그레이션 중 오류가 발생했습니다.'
    });
  }
});

export default router;

