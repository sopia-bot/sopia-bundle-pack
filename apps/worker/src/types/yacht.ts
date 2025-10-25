/**
 * 야추 게임 타입 정의
 */

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export type YachtHand = 
  | 'top'           // 탑 (10점)
  | 'one_pair'      // 원페어 (20점)
  | 'two_pair'      // 투페어 (30점)
  | 'triple'        // 트리플 (40점)
  | 'four_card'     // 포카드 (50점)
  | 'full_house'    // 풀 하우스 (60점)
  | 'little_straight' // 리틀 스트레이트 (70점)
  | 'big_straight'  // 빅 스트레이트 (70점)
  | 'yacht';        // 야추 (150점)

export interface DiceResult {
  values: DiceValue[];
  hand: YachtHand;
  score: number;
}

export interface GameState {
  userId: number;
  nickname: string;
  tag: string;
  diceValues: DiceValue[];
  hand: YachtHand;
  score: number;
  rollsRemaining: number; // 남은 다시 굴리기 횟수 (0, 1, 2)
  startedAt: number; // 게임 시작 시간 (timestamp)
}

export interface YachtConfig {
  enabled: boolean;
  winning_score: number; // 승리 점수 (기본 40점)
  score_multiplier: number; // 점당 애청지수 포인트 (기본 100점)
  game_cooldown: number; // 게임 간격 (초, 기본 60초)
}

export interface PlayerCooldown {
  userId: number;
  lastGameEndTime: number; // 마지막 게임 종료 시간 (timestamp)
}
