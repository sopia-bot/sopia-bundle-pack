import { FanscoreUser } from '../types/fanscore';
import { FanscoreManager } from './fanscore-manager';

const DOMAIN = 'starter-pack.sopia.dev';

/**
 * 복권 관리자
 */
export class LotteryManager {
  private fanscoreManager: FanscoreManager;

  constructor(fanscoreManager: FanscoreManager) {
    this.fanscoreManager = fanscoreManager;
  }
  /**
   * 복권 추첨 (0~9 중 서로 다른 3개 숫자)
   */
  private drawNumbers(): number[] {
    const numbers: number[] = [];
    while (numbers.length < 3) {
      const num = Math.floor(Math.random() * 10);
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  }

  /**
   * 적중 개수 계산
   */
  private countMatches(drawn: number[], guessed: number[]): number {
    let matches = 0;
    for (const num of guessed) {
      if (drawn.includes(num)) {
        matches++;
      }
    }
    return matches;
  }

  /**
   * 보상 계산
   */
  private calculateReward(matches: number): number {
    switch (matches) {
      case 0:
        return 0;
      case 1:
        return 10;
      case 2:
        return 100;
      case 3:
        return 1000;
      default:
        return 0;
    }
  }

  /**
   * 단일 복권 실행
   */
  async playSingle(userId: number, numbers: number[]): Promise<{
    success: boolean;
    drawn: number[];
    matches: number;
    reward: number;
    message: string;
  }> {
    try {
      // 사용자 정보 조회
      const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user/${userId}`);
      if (!userResponse.ok) {
        return {
          success: false,
          drawn: [],
          matches: 0,
          reward: 0,
          message: '사용자 정보를 찾을 수 없습니다.'
        };
      }

      const user: FanscoreUser = await userResponse.json();

      // 티켓 확인
      if (user.lottery_tickets < 1) {
        return {
          success: false,
          drawn: [],
          matches: 0,
          reward: 0,
          message: '복권이 없습니다.'
        };
      }

      // 티켓 소진
      await fetch(`stp://${DOMAIN}/fanscore/user/${userId}/lottery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change: -1 })
      });

      // 추첨
      const drawn = this.drawNumbers();
      const matches = this.countMatches(drawn, numbers);
      const reward = this.calculateReward(matches);

      // 경험치 지급 (배치 업데이트 시스템 사용)
      if (reward > 0) {
        this.fanscoreManager.addExpDirect(userId, reward);
      }

      return {
        success: true,
        drawn,
        matches,
        reward,
        message: this.formatResult(drawn, numbers, matches, reward)
      };
    } catch (error) {
      console.error('[LotteryManager] Play single error:', error);
      return {
        success: false,
        drawn: [],
        matches: 0,
        reward: 0,
        message: '복권 실행 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 자동 복권 (보유 티켓 전체 소진)
   */
  async playAuto(userId: number): Promise<{
    success: boolean;
    totalPlayed: number;
    totalReward: number;
    breakdown: { matches: number; count: number }[];
    message: string;
  }> {
    try {
      // 사용자 정보 조회
      const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user/${userId}`);
      if (!userResponse.ok) {
        return {
          success: false,
          totalPlayed: 0,
          totalReward: 0,
          breakdown: [],
          message: '사용자 정보를 찾을 수 없습니다.'
        };
      }

      const user: FanscoreUser = await userResponse.json();

      if (user.lottery_tickets < 1) {
        return {
          success: false,
          totalPlayed: 0,
          totalReward: 0,
          breakdown: [],
          message: '복권이 없습니다.'
        };
      }

      const ticketCount = user.lottery_tickets;
      const autoNumbers = [0, 1, 2];
      let totalReward = 0;
      const matchCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

      // 모든 티켓 소진
      for (let i = 0; i < ticketCount; i++) {
        const drawn = this.drawNumbers();
        const matches = this.countMatches(drawn, autoNumbers);
        const reward = this.calculateReward(matches);
        totalReward += reward;
        matchCounts[matches as keyof typeof matchCounts]++;
      }

      // 티켓 모두 소진
      await fetch(`stp://${DOMAIN}/fanscore/user/${userId}/lottery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change: -ticketCount })
      });

      // 경험치 지급 (배치 업데이트 시스템 사용)
      if (totalReward > 0) {
        this.fanscoreManager.addExpDirect(userId, totalReward);
      }

      const breakdown = [
        { matches: 0, count: matchCounts[0] },
        { matches: 1, count: matchCounts[1] },
        { matches: 2, count: matchCounts[2] },
        { matches: 3, count: matchCounts[3] }
      ].filter(b => b.count > 0);

      return {
        success: true,
        totalPlayed: ticketCount,
        totalReward,
        breakdown,
        message: this.formatAutoResult(ticketCount, totalReward, matchCounts)
      };
    } catch (error) {
      console.error('[LotteryManager] Play auto error:', error);
      return {
        success: false,
        totalPlayed: 0,
        totalReward: 0,
        breakdown: [],
        message: '자동 복권 실행 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 결과 포맷 (단일)
   */
  private formatResult(drawn: number[], guessed: number[], matches: number, reward: number): string {
    return `[복권 결과]\\n` +
           `당첨 번호: ${drawn.join(', ')}\\n` +
           `선택 번호: ${guessed.join(', ')}\\n` +
           `적중: ${matches}개\\n` +
           `획득 점수: ${reward}점`;
  }

  /**
   * 결과 포맷 (자동)
   */
  private formatAutoResult(
    played: number,
    totalReward: number,
    matchCounts: { 0: number; 1: number; 2: number; 3: number }
  ): string {
    let result = `[자동 복권 결과]\\n총 ${played}회 시행\\n\\n`;
    
    if (matchCounts[3] > 0) result += `✨ 3개 적중 x ${matchCounts[3]}\\n`;
    if (matchCounts[2] > 0) result += `🎯 2개 적중 x ${matchCounts[2]}\\n`;
    if (matchCounts[1] > 0) result += `🎲 1개 적중 x ${matchCounts[1]}\\n`;
    if (matchCounts[0] > 0) result += `❌ 꽝 x ${matchCounts[0]}\\n`;
    
    result += `\\n총 획득 점수: ${totalReward}점`;
    
    return result;
  }
}

