import { FanscoreUser, FanscoreConfig, PendingUpdate } from '../types/fanscore';
import { calculateLevel, checkLevelUp } from '../utils/level-system';
import { LiveSocket } from '@sopia-bot/core';

const DOMAIN = 'starter-pack.sopia.dev';

/**
 * 애청지수 관리자
 */
export class FanscoreManager {
  private pendingUpdates: Map<number, PendingUpdate> = new Map();
  private userCache: Map<number, FanscoreUser> = new Map();
  private config: FanscoreConfig | null = null;
  private batchInterval: NodeJS.Timeout | null = null;
  private currentLiveId: number = 0;

  constructor() {
    this.startBatchUpdate();
  }

  /**
   * Socket 설정
   */
  get socket(): LiveSocket {
    return window.$sopia.liveMap.values().next().value?.socket as LiveSocket;
  }

  /**
   * 5초마다 배치 업데이트 실행
   */
  private startBatchUpdate() {
    this.batchInterval = setInterval(async () => {
      await this.processBatchUpdate();
    }, 5000);
  }

  /**
   * 설정 로드
   */
  async loadConfig(): Promise<FanscoreConfig> {
    try {
      const response = await fetch(`stp://${DOMAIN}/fanscore/config`);
      this.config = await response.json();
      return this.config!;
    } catch (error) {
      console.error('[FanscoreManager] Failed to load config:', error);
      throw error;
    }
  }

  /**
   * 현재 라이브 ID 설정
   */
  setLiveId(liveId: number) {
    this.currentLiveId = liveId;
    console.log(`[FanscoreManager] Live ID set to ${liveId}`);
  }

  /**
   * 사용자 캐시 로드
   */
  async loadUser(userId: number): Promise<FanscoreUser | null> {
    try {
      const response = await fetch(`stp://${DOMAIN}/fanscore/user/${userId}`);
      if (!response.ok) {
        return null;
      }
      const user = await response.json();
      this.userCache.set(userId, user);
      return user;
    } catch (error) {
      console.error(`[FanscoreManager] Failed to load user ${userId}:`, error);
      return null;
    }
  }

  /**
   * 사용자가 등록되어 있는지 확인
   */
  async isUserRegistered(userId: number): Promise<boolean> {
    const user = await this.loadUser(userId);
    return user !== null;
  }

  /**
   * 출석 체크 (채팅 시 자동)
   */
  async checkAttendance(userId: number): Promise<boolean> {
    console.log('this.config?.enabled', this.config?.enabled);
    if (!this.config?.enabled) return false;

    const user = this.userCache.get(userId);
    console.log('user', user);
    if (!user) return false;

    // 이미 출석했는지 확인
    if (user.attendance_live_id === this.currentLiveId) {
      console.log('이미 출석했습니다.');
      return false;
    }

    // 출석 점수 추가
    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    console.log('pending', pending);
    pending.attendance = this.config.attendance_score;
    this.pendingUpdates.set(userId, pending);

    // 캐시 업데이트
    user.attendance_live_id = this.currentLiveId;
    this.userCache.set(userId, user);

    console.log(`[FanscoreManager] Attendance checked for user ${userId} (Live: ${this.currentLiveId})`);
    return true;
  }

  /**
   * 채팅 점수 추가
   */
  addChatScore(userId: number) {
    if (!this.config?.enabled) return;

    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.chat = (pending.chat || 0) + this.config.chat_score;
    this.pendingUpdates.set(userId, pending);
  }

  /**
   * 좋아요 점수 추가
   */
  addLikeScore(userId: number) {
    if (!this.config?.enabled) return;

    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.like = (pending.like || 0) + this.config.like_score;
    this.pendingUpdates.set(userId, pending);
  }

  /**
   * 스푼 점수 추가
   */
  addSpoonScore(userId: number, totalAmount: number) {
    if (!this.config?.enabled) return;

    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.spoon = (pending.spoon || 0) + (totalAmount * this.config.spoon_score);
    this.pendingUpdates.set(userId, pending);
  }

  /**
   * 배치 업데이트 처리
   */
  private async processBatchUpdate() {
    if (this.pendingUpdates.size === 0) return;

    try {
      const updates: any[] = [];

      for (const [userId, pending] of this.pendingUpdates.entries()) {
        const user = this.userCache.get(userId);
        if (!user) continue;

        // 점수 계산
        const addedScore = (pending.attendance || 0) + (pending.chat || 0) + (pending.like || 0) + (pending.spoon || 0);
        const newExp = user.exp + addedScore;
        const newScore = user.score + addedScore;

        // 레벨 계산
        const levelInfo = calculateLevel(newExp);
        const oldLevel = user.level;

        // 카운트 업데이트
        const newChatCount = user.chat_count + (pending.chat ? Math.floor(pending.chat / (this.config?.chat_score || 1)) : 0);
        const newLikeCount = user.like_count + (pending.like ? Math.floor(pending.like / (this.config?.like_score || 1)) : 0);
        const newSpoonCount = user.spoon_count + (pending.spoon ? Math.floor(pending.spoon / (this.config?.spoon_score || 1)) : 0);

        const update = {
          user_id: userId,
          score: newScore,
          exp: newExp,
          level: levelInfo.level,
          chat_count: newChatCount,
          like_count: newLikeCount,
          spoon_count: newSpoonCount,
          attendance_live_id: user.attendance_live_id
        };

        updates.push(update);

        // 캐시 업데이트
        this.userCache.set(userId, {
          ...user,
          ...update
        });

        // 레벨업 체크
        if (levelInfo.level > oldLevel) {
          // 레벨업 알림
          if (this.socket) {
            await this.socket.message(`🎉 ${user.nickname}님, 레벨업 하셨습니다! 현재 Lv.${levelInfo.level}`);
          }
          
          // 복권 티켓 지급
          if (this.config?.lottery_enabled) {
            const levelUpCount = levelInfo.level - oldLevel;
            await this.giveLotteryTickets(userId, levelUpCount, `레벨업 (Lv.${oldLevel} → Lv.${levelInfo.level})`);
          }
        }
      }

      // 배치 업데이트 API 호출
      if (updates.length > 0) {
        const response = await fetch(`stp://${DOMAIN}/fanscore/batch-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        });

        if (response.ok) {
          console.log(`[FanscoreManager] Batch updated ${updates.length} users`);
        } else {
          console.error('[FanscoreManager] Batch update failed');
        }
      }

      // 대기 중인 업데이트 초기화
      this.pendingUpdates.clear();
    } catch (error) {
      console.error('[FanscoreManager] Batch update error:', error);
    }
  }

  /**
   * 복권 티켓 지급
   */
  async giveLotteryTickets(userId: number, count: number, reason: string): Promise<void> {
    try {
      const response = await fetch(`stp://${DOMAIN}/fanscore/user/${userId}/lottery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change: count })
      });

      if (response.ok) {
        const user = await response.json();
        this.userCache.set(userId, user);
        console.log(`[FanscoreManager] Lottery tickets given to user ${userId}: +${count} (${reason})`);
      }
    } catch (error) {
      console.error(`[FanscoreManager] Failed to give lottery tickets to user ${userId}:`, error);
    }
  }

  /**
   * 종료
   */
  destroy() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    console.log('[FanscoreManager] Destroyed');
  }
}

