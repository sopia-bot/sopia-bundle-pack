import { Quiz, FanscoreConfig } from '../types/fanscore';
import { LiveSocket } from '@sopia-bot/core';

const DOMAIN = 'starter-pack.sopia.dev';

/**
 * 퀴즈 관리자
 */
export class QuizManager {
  private quizzes: Quiz[] = [];
  private config: FanscoreConfig | null = null;
  private timer: NodeJS.Timeout | null = null;
  private currentQuiz: Quiz | null = null;
  private quizTimeout: NodeJS.Timeout | null = null;
  private waitingForAnswer: boolean = false;

  constructor() {}

  /**
   * 초기화
   */
  async initialize() {
    await this.loadQuizzes();
    await this.loadConfig();
    this.startTimer();
  }

  /**
   * 소켓
   */
  get socket(): LiveSocket {
    return window.$sopia.liveMap.values().next().value?.socket as LiveSocket;
  }

  /**
   * 퀴즈 목록 로드
   */
  private async loadQuizzes() {
    try {
      const response = await fetch(`stp://${DOMAIN}/quiz`);
      this.quizzes = await response.json();
      console.log(`[QuizManager] Loaded ${this.quizzes.length} quizzes`);
    } catch (error) {
      console.error('[QuizManager] Failed to load quizzes:', error);
      this.quizzes = [];
    }
  }

  /**
   * 설정 로드
   */
  private async loadConfig() {
    try {
      const response = await fetch(`stp://${DOMAIN}/fanscore/config`);
      this.config = await response.json();
    } catch (error) {
      console.error('[QuizManager] Failed to load config:', error);
    }
  }

  /**
   * 퀴즈 타이머 시작
   */
  private startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const interval = (this.config?.quiz_interval || 180) * 1000;
    
    this.timer = setInterval(() => {
      this.checkAndStartQuiz();
    }, interval);

    console.log(`[QuizManager] Timer started with interval ${this.config?.quiz_interval || 180}s`);
  }

  /**
   * 퀴즈 시작 조건 체크 및 시작
   */
  private async checkAndStartQuiz() {
    // 퀴즈 활성화 여부 확인
    if (!this.config?.quiz_enabled) {
      return;
    }

    // 이미 퀴즈 진행 중이면 무시
    if (this.waitingForAnswer) {
      return;
    }

    // 퀴즈가 없으면 무시
    if (this.quizzes.length === 0) {
      console.log('[QuizManager] No quizzes available');
      return;
    }

    // 랜덤 퀴즈 선택
    const randomIndex = Math.floor(Math.random() * this.quizzes.length);
    this.currentQuiz = this.quizzes[randomIndex];

    // 퀴즈 출제
    if (this.socket) {
      await this.socket.message(`[돌발 퀴즈]\\n${this.currentQuiz.question}`);
      console.log(`[QuizManager] Quiz started: ${this.currentQuiz.question}`);
    }

    this.waitingForAnswer = true;

    // 타임아웃 설정
    const timeout = (this.config?.quiz_timeout || 5) * 1000;
    this.quizTimeout = setTimeout(async () => {
      if (this.waitingForAnswer && this.currentQuiz && this.socket) {
        await this.socket.message(
          `[돌발 퀴즈]\\n아쉽지만 아무도 정답을 맞추지 못했습니다.\\n정답은 [${this.currentQuiz.answer}]입니다.`
        );
        console.log('[QuizManager] Quiz timeout - no correct answer');
      }
      this.resetQuiz();
    }, timeout);
  }

  /**
   * 퀴즈 정답 체크
   */
  checkAnswer(message: string): boolean {
    if (!this.waitingForAnswer || !this.currentQuiz) {
      return false;
    }

    const answer = message.trim();
    const correctAnswer = this.currentQuiz.answer.trim();

    if (answer === correctAnswer) {
      this.resetQuiz();
      console.log(`[QuizManager] Correct answer: ${answer}`);
      return true;
    }

    return false;
  }

  /**
   * 퀴즈 상태 리셋
   */
  private resetQuiz() {
    this.waitingForAnswer = false;
    this.currentQuiz = null;
    if (this.quizTimeout) {
      clearTimeout(this.quizTimeout);
      this.quizTimeout = null;
    }
  }

  /**
   * 설정 업데이트 (타이머 재시작)
   */
  async updateConfig(newConfig: FanscoreConfig) {
    this.config = newConfig;
    this.startTimer();
    console.log('[QuizManager] Config updated, timer restarted');
  }

  /**
   * 퀴즈 목록 새로고침
   */
  async refreshQuizzes() {
    await this.loadQuizzes();
  }

  /**
   * 종료
   */
  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.quizTimeout) {
      clearTimeout(this.quizTimeout);
      this.quizTimeout = null;
    }
    this.resetQuiz();
    console.log('[QuizManager] Destroyed');
  }
}

