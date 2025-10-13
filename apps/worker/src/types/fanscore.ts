/**
 * 애청지수 관련 타입 정의
 */

export interface FanscoreUser {
  user_id: number;
  nickname: string;
  tag: string;
  score: number;
  rank: number;
  level: number;
  exp: number;
  chat_count: number;
  like_count: number;
  spoon_count: number;
  lottery_tickets: number;
  attendance_live_id: number | null;
  last_activity_at?: string; // ISO 8601 timestamp
}

export interface FanscoreConfig {
  enabled: boolean;
  attendance_score: number;
  chat_score: number;
  like_score: number;
  spoon_score: number;
  quiz_enabled: boolean;
  quiz_bonus: number;
  quiz_interval: number;
  quiz_timeout: number;
  lottery_enabled: boolean;
  lottery_spoon_required: number;
}

export interface Quiz {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at?: string;
}

export interface PendingUpdate {
  user_id: number;
  nickname?: string;
  tag?: string;
  attendance?: number;
  chat?: number;
  like?: number;
  spoon?: number;
  expDirect?: number; // 복권, 퀴즈 등 직접 경험치
  lotteryChange?: number; // 복권 티켓 변경
}

