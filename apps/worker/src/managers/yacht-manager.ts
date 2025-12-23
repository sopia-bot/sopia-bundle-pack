import { GameState, YachtConfig, YachtHand, DiceValue, PlayerCooldown } from '../types/yacht';
import { User } from '@sopia-bot/core';
import { FanscoreManager } from './fanscore-manager';

const DOMAIN = 'starter-pack.sopia.dev';

export class YachtManager {
  private gameStates: Map<number, GameState> = new Map();
  private playerCooldowns: Map<number, PlayerCooldown> = new Map();
  private config: YachtConfig = {
    enabled: true,
    winning_score: 50,
    score_multiplier: 100,
    game_cooldown: 60,
  };

  constructor(private fanscoreManager: FanscoreManager) {
  }

  /**
   * 설정 로드 (성공할 때까지 재시도)
   */
  async loadConfig(): Promise<YachtConfig> {
    while (true) {
      try {
        const response = await fetch(`stp://${DOMAIN}/yacht/config`);

        if (!response.ok) {
          console.log(`[YachtManager] Config API not ready (${response.status}), retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const data = await response.json();

        // 유효한 config 객체인지 확인
        if (!data || typeof data !== 'object' || 'error' in data) {
          console.log('[YachtManager] Invalid config response, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        this.config = data;
        console.log('[YachtManager] Config loaded successfully');
        break;
      } catch (error) {
        console.error('[YachtManager] Failed to load config, retrying in 1 second...', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return this.config;
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): YachtConfig {
    return this.config;
  }

  /**
   * 설정 업데이트 (외부에서 호출)
   */
  updateConfig(config: YachtConfig): void {
    this.config = config;
  }

  /**
   * 주사위 굴리기
   */
  private rollDice(): DiceValue {
    return (Math.floor(Math.random() * 6) + 1) as DiceValue;
  }

  /**
   * 여러 주사위 굴리기
   */
  private rollMultipleDice(count: number): DiceValue[] {
    return Array.from({ length: count }, () => this.rollDice());
  }

  /**
   * 족보 판정
   */
  private determineHand(dice: DiceValue[]): YachtHand {
    const sorted = [...dice].sort((a, b) => a - b);
    const counts = new Map<DiceValue, number>();

    // 개수 세기
    for (const die of sorted) {
      counts.set(die, (counts.get(die) || 0) + 1);
    }

    const countValues = Array.from(counts.values()).sort((a, b) => b - a);

    // 야추 (5개 동일)
    if (countValues[0] === 5) {
      return 'yacht';
    }

    // 포카드 (4개 동일)
    if (countValues[0] === 4) {
      return 'four_card';
    }

    // 풀 하우스 (3개 + 2개)
    if (countValues[0] === 3 && countValues[1] === 2) {
      return 'full_house';
    }

    // 트리플 (3개 동일)
    if (countValues[0] === 3) {
      return 'triple';
    }

    // 투페어 (2개 + 2개)
    if (countValues[0] === 2 && countValues[1] === 2) {
      return 'two_pair';
    }

    // 원페어 (2개만 있음)
    if (countValues[0] === 2) {
      return 'one_pair';
    }

    // 리틀 스트레이트 (1, 2, 3, 4, 5)
    if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) {
      return 'little_straight';
    }

    // 빅 스트레이트 (2, 3, 4, 5, 6)
    if (JSON.stringify(sorted) === JSON.stringify([2, 3, 4, 5, 6])) {
      return 'big_straight';
    }

    // 탑 (모두 다름)
    return 'top';
  }

  /**
   * 족보 점수 조회
   */
  private getHandScore(hand: YachtHand): number {
    const scores: Record<YachtHand, number> = {
      'top': 10,
      'one_pair': 20,
      'two_pair': 30,
      'triple': 40,
      'four_card': 50,
      'full_house': 60,
      'little_straight': 70,
      'big_straight': 70,
      'yacht': 150,
    };
    return scores[hand];
  }

  /**
   * 족보 이름 조회
   */
  getHandName(hand: YachtHand): string {
    const names: Record<YachtHand, string> = {
      'top': '탑',
      'one_pair': '원페어',
      'two_pair': '투페어',
      'triple': '트리플',
      'four_card': '포카드',
      'full_house': '풀 하우스',
      'little_straight': '리틀 스트레이트',
      'big_straight': '빅 스트레이트',
      'yacht': '야추',
    };
    return names[hand];
  }

  /**
   * 주사위 표기 문자열
   */
  private getDiceSymbol(value: DiceValue): string {
    const symbols = ['⚀¹', '⚁²', '⚂³', '⚃⁴', '⚄⁵', '⚅⁶'];
    return symbols[value - 1];
  }

  /**
   * 게임 시작
   */
  startGame(user: User): GameState {
    const diceValues = this.rollMultipleDice(5);
    const hand = this.determineHand(diceValues);
    const score = this.getHandScore(hand);

    const gameState: GameState = {
      userId: user.id,
      nickname: user.nickname,
      tag: user.tag || user.nickname,
      diceValues,
      hand,
      score,
      rollsRemaining: 2,
      startedAt: Date.now(),
    };

    this.gameStates.set(user.id, gameState);
    console.log(`[YachtManager] Game started for ${user.nickname}(${user.id})`);
    return gameState;
  }

  /**
   * 게임 상태 조회
   */
  getGameState(userId: number): GameState | null {
    return this.gameStates.get(userId) || null;
  }

  /**
   * 주사위 재굴림
   */
  rerollDice(userId: number, diceIndices: number[]): GameState | null {
    const gameState = this.gameStates.get(userId);
    if (!gameState || gameState.rollsRemaining === 0) {
      return null;
    }

    // 주사위 인덱스 검증 (1-5)
    const validIndices = diceIndices.filter(i => i >= 1 && i <= 5);
    if (validIndices.length === 0 || validIndices.length > 5) {
      return null;
    }

    // 새 주사위 값 생성
    const newDiceValues = [...gameState.diceValues];
    for (const index of validIndices) {
      newDiceValues[index - 1] = this.rollDice();
    }

    // 족보 재판정
    const hand = this.determineHand(newDiceValues);
    const score = this.getHandScore(hand);

    gameState.diceValues = newDiceValues;
    gameState.hand = hand;
    gameState.score = score;
    gameState.rollsRemaining -= 1;

    console.log(`[YachtManager] Reroll for ${gameState.nickname}, rolls remaining: ${gameState.rollsRemaining}`);
    return gameState;
  }

  /**
   * 게임 종료 및 점수 계산
   */
  endGame(user: User): { score: number; points: number; hand: YachtHand } | null {
    const userId = user.id;
    const gameState = this.gameStates.get(userId);
    if (!gameState) {
      return null;
    }

    const hand = gameState.hand;
    const score = gameState.score;
    let points = 0;

    // 승리 점수 이상이면 애청지수 부여
    if (score >= this.config.winning_score) {
      points = score * this.config.score_multiplier;

      this.fanscoreManager.addExpDirect(user, points);
    }

    // 쿨타임 설정
    this.playerCooldowns.set(userId, {
      userId,
      lastGameEndTime: Date.now(),
    });

    // 게임 상태 삭제
    this.gameStates.delete(userId);

    console.log(`[YachtManager] Game ended for user ${userId}, hand: ${hand}, score: ${score}, points: ${points}`);
    return { score, points, hand };
  }

  /**
   * 쿨타임 확인
   */
  canPlayGame(userId: number): boolean {
    const cooldown = this.playerCooldowns.get(userId);
    if (!cooldown) {
      return true;
    }

    const timeSinceLastGame = (Date.now() - cooldown.lastGameEndTime) / 1000;
    return timeSinceLastGame >= this.config.game_cooldown;
  }

  /**
   * 쿨타임까지 남은 시간
   */
  getRemainingCooldown(userId: number): number {
    const cooldown = this.playerCooldowns.get(userId);
    if (!cooldown) {
      return 0;
    }

    const timeSinceLastGame = (Date.now() - cooldown.lastGameEndTime) / 1000;
    const remaining = this.config.game_cooldown - timeSinceLastGame;
    return Math.max(0, Math.ceil(remaining));
  }

  /**
   * 모든 플레이어 쿨타임 초기화
   */
  clearAllCooldowns(): void {
    this.playerCooldowns.clear();
    console.log('[YachtManager] All player cooldowns cleared');
  }

  /**
   * 주사위 결과 메시지 포맷
   */
  formatGameResult(gameState: GameState): string {
    const diceSymbols = gameState.diceValues
      .map(value => this.getDiceSymbol(value))
      .join(' ');
    
    const handName = this.getHandName(gameState.hand);
    
    return (
      `[${gameState.nickname}님 주사위 결과]\\n\\n` +
      `${handName}\\n` +
      `${diceSymbols} = ${gameState.score}점\\n\\n` +
      `리롤 예시: \`!야추 굴리기 1 3 4\`\\n` +
      `결정: \`!야추 결정\`\\n`
    );
  }
}
