import { FanscoreUser, FanscoreConfig, PendingUpdate } from '../types/fanscore';
import { calculateLevel, checkLevelUp } from '../utils/level-system';
import { LiveSocket, User } from '@sopia-bot/core';

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
  }

  /**
   * 사용자 캐시 로드
   */
  async loadUser(userId: number): Promise<FanscoreUser | null> {
    try {
      if ( this.userCache.has(userId) ) {
        return this.userCache.get(userId)!;
      }
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
   * 사용자 캐시 업데이트 (외부에서 호출)
   */
  updateUserCache(userId: number, updates: Partial<FanscoreUser>): void {
    const cachedUser = this.userCache.get(userId);
    if (cachedUser) {
      this.userCache.set(userId, {
        ...cachedUser,
        ...updates
      });
      console.log(`[FanscoreManager] User cache updated for ${userId}:`, updates);
    } else {
      console.warn(`[FanscoreManager] User ${userId} not found in cache, skipping update`);
    }
  }

  /**
   * 출석 체크 (채팅 시 자동)
   */
  async checkAttendance(user: User): Promise<boolean> {
    const userId = user.id;
    if (!this.config?.enabled) return false;

    const userData = this.userCache.get(userId);
    if (!userData) return false;

    if ( this.currentLiveId === 0 ) return false;

    // 이미 출석했는지 확인
    if (userData.attendance_live_id === this.currentLiveId) {
      return false;
    }

    // 출석 점수 추가
    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.attendance = this.config.attendance_score;
    pending.nickname = user.nickname;
    pending.tag = user.tag;
    this.pendingUpdates.set(userId, pending);

    // 캐시 업데이트
    this.userCache.set(userId, {
      ...userData,
      attendance_live_id: this.currentLiveId,
      nickname: user.nickname,
      tag: user.tag
    });

    console.log(`[FanscoreManager] Attendance checked for user ${userId} (Live: ${this.currentLiveId})`);
    return true;
  }

  /**
   * 채팅 점수 추가
   */
  addChatScore(user: User) {
    if (!this.config?.enabled) return;
    const userId = user.id;

    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.chat = (pending.chat || 0) + this.config.chat_score;
    pending.nickname = user.nickname;
    pending.tag = user.tag;
    this.pendingUpdates.set(userId, pending);
  }

  /**
   * 좋아요 점수 추가
   */
  addLikeScore(user: User) {
    if (!this.config?.enabled) return;
    const userId = user.id;

    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.like = (pending.like || 0) + this.config.like_score;
    pending.nickname = user.nickname;
    pending.tag = user.tag;
    this.pendingUpdates.set(userId, pending);
  }

  /**
   * 스푼 점수 추가
   */
  addSpoonScore(user: User, totalAmount: number) {
    if (!this.config?.enabled) return;
    const userId = user.id;

    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.spoon = (pending.spoon || 0) + (totalAmount * this.config.spoon_score);
    pending.nickname = user.nickname;
    pending.tag = user.tag;
    this.pendingUpdates.set(userId, pending);
  }

  /**
   * 경험치 직접 추가 (복권, 퀴즈 등)
   */
  addExpDirect(user: User, exp: number) {
    if (!this.config?.enabled) return;
    const userId = user.id;

    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.expDirect = (pending.expDirect || 0) + exp;
    pending.nickname = user.nickname;
    pending.tag = user.tag;
    this.pendingUpdates.set(userId, pending);
  }

  /**
   * 복권 티켓 변경 (pendingUpdates 사용)
   */
  updateLotteryTickets(userId: number, change: number, nickname: string, tag: string) {
    const pending = this.pendingUpdates.get(userId) || { user_id: userId };
    pending.lotteryChange = (pending.lotteryChange || 0) + change;
    pending.nickname = nickname;
    pending.tag = tag;
    this.pendingUpdates.set(userId, pending);

    // 캐시 즉시 업데이트 (동기화)
    const user = this.userCache.get(userId);
    if (user) {
      this.userCache.set(userId, {
        ...user,
        lottery_tickets: Math.max(0, (user.lottery_tickets || 0) + change),
        nickname,
        tag
      });
    }
  }

  /**
   * 캐시된 사용자들의 rank 업데이트
   */
  private async updateUserRanksInCache() {
    try {
      const userIds = Array.from(this.userCache.keys());
      
      // 캐시에 사용자가 없으면 리턴
      if (userIds.length === 0) return;

      // 각 사용자의 최신 데이터를 가져와서 rank만 업데이트
      for (const userId of userIds) {
        try {
          const response = await fetch(`stp://${DOMAIN}/fanscore/user/${userId}`);
          if (response.ok) {
            const updatedUser = await response.json();
            const cachedUser = this.userCache.get(userId);
            
            if (cachedUser) {
              // rank 값만 업데이트 (다른 값은 캐시 유지)
              this.userCache.set(userId, {
                ...cachedUser,
                rank: updatedUser.rank
              });
            }
          }
        } catch (error) {
          console.error(`[FanscoreManager] Failed to update rank for user ${userId}:`, error);
        }
      }
      
      console.log(`[FanscoreManager] Updated ranks for ${userIds.length} cached users`);
    } catch (error) {
      console.error('[FanscoreManager] Failed to update user ranks in cache:', error);
    }
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
        const addedExpDirect = pending.expDirect || 0; // 복권, 퀴즈, 상점, 감점 등 직접 경험치
        const newExp = Math.max(0, user.exp + addedScore + addedExpDirect); // 음수 방지
        const newScore = Math.max(0, user.score + addedScore + addedExpDirect); // 음수 방지

        // 레벨 계산
        const levelInfo = calculateLevel(newExp);
        const oldLevel = user.level;

        // 카운트 업데이트
        const newChatCount = user.chat_count + (pending.chat ? Math.floor(pending.chat / (this.config?.chat_score || 1)) : 0);
        const newLikeCount = user.like_count + (pending.like ? Math.floor(pending.like / (this.config?.like_score || 1)) : 0);
        const newSpoonCount = user.spoon_count + (pending.spoon ? Math.floor(pending.spoon / (this.config?.spoon_score || 1)) : 0);
        
        // 복권 티켓 업데이트
        const newLotteryTickets = pending.lotteryChange 
          ? Math.max(0, user.lottery_tickets + pending.lotteryChange) 
          : user.lottery_tickets;

        const update = {
          user_id: userId,
          score: newScore,
          exp: newExp,
          level: levelInfo.level,
          chat_count: newChatCount,
          like_count: newLikeCount,
          spoon_count: newSpoonCount,
          lottery_tickets: newLotteryTickets,
          attendance_live_id: user.attendance_live_id,
          nickname: pending.nickname || '',
          tag: pending.tag || '',
          last_activity_at: new Date().toISOString(), // 활동 시각 업데이트
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
          
          // 배치 업데이트 후 rank 업데이트를 위해 캐시된 사용자 데이터 다시 로드
          await this.updateUserRanksInCache();
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
   * 복권 티켓 지급 (pendingUpdates 사용)
   */
  async giveLotteryTickets(userId: number, count: number, reason: string): Promise<void> {
    try {
      const user = this.userCache.get(userId);
      if (!user) {
        console.error(`[FanscoreManager] User ${userId} not found in cache for lottery tickets`);
        return;
      }

      // pendingUpdates에 추가 (processBatchUpdate에서 처리됨)
      this.updateLotteryTickets(userId, count, user.nickname, user.tag);
      
      console.log(`[FanscoreManager] Lottery tickets scheduled to give to user ${userId}: +${count} (${reason})`);
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

