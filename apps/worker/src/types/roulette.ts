// apps/worker/src/types/roulette.ts

/**
 * 룰렛 템플릿 아이템
 */
export interface TemplateItem {
  type: 'shield' | 'ticket' | 'custom';
  label: string;
  percentage: number;
  value?: number; // 실드/복권의 증감값
}

/**
 * 룰렛 템플릿
 */
export interface RouletteTemplate {
  template_id: string;
  name: string;
  mode: 'sticker' | 'spoon' | 'like';
  sticker?: string;
  spoon?: number;
  division: boolean;
  auto_run: boolean;
  enabled: boolean;
  items: TemplateItem[];
}

/**
 * 사용자별 룰렛 티켓 정보
 */
export interface UserRouletteTickets {
  user_id: number;
  nickname: string;
  tag: string;
  tickets: {
    [templateId: string]: number; // 템플릿별 티켓 개수
  };
}

/**
 * 킵 아이템 (당첨된 아이템)
 */
export interface KeepItem {
  id: string;
  type: 'shield' | 'ticket' | 'custom';
  label: string;
  count: number;
  percentage: number;
  template_id: string;
  template_name: string;
  timestamp: string;
}

/**
 * 사용자별 킵 아이템 목록
 */
export interface UserKeepItems {
  user_id: number;
  nickname: string;
  tag: string;
  items: KeepItem[];
}

/**
 * 룰렛 기록 (roulette-history.json에 저장되는 형식)
 */
export interface RouletteRecord {
  id: string;
  template_id: string;
  user_id: number;
  nickname: string;
  item: {
    type: string;
    label: string;
    percentage: number;
  };
  used: boolean;
  timestamp: string;
}

/**
 * 룰렛 실행 결과
 */
export interface RouletteResult {
  item: TemplateItem;
  count: number; // 당첨 개수
}

/**
 * 룰렛 실행 통합 결과
 */
export interface RouletteSpinResult {
  template: RouletteTemplate;
  results: Map<string, RouletteResult>; // label -> result
  totalSpins: number;
  hasRareItem: boolean; // 1% 미만 아이템이 있는지
}

