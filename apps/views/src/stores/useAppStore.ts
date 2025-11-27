import { create } from 'zustand';

interface FanscoreUser {
  user_id: number;
  nickname: string;
  score: number;
  rank: number;
  chat_count: number;
  like_count: number;
  spoon_count: number;
}

interface RouletteTemplate {
  template_id: string;
  name: string;
  mode: 'sticker' | 'spoon' | 'like';
  sticker?: string;
  spoon?: number;
  division: boolean;
  auto_run: boolean;
  enabled: boolean;
  items: Array<{
    type: 'shield' | 'ticket' | 'shop' | 'custom';
    label: string;
    percentage: number;
    value?: number;
  }>;
}

interface RouletteRecord {
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

interface ShieldData {
  shield_count: number;
  history: Array<{
    change: number;
    reason: string;
    time: string;
  }>;
}

interface AppState {
  // 애청지수 데이터
  fanscoreRanking: FanscoreUser[];
  shieldData: ShieldData | null;
  todayActiveCount: number; // 오늘 활동한 청취자 수
  
  // 템플릿 데이터
  templates: RouletteTemplate[];
  
  // 룰렛 기록
  rouletteHistory: RouletteRecord[];
  
  // 로딩 상태
  loading: boolean;
  
  // 액션들
  fetchFanscoreRanking: () => Promise<void>;
  fetchShieldData: () => Promise<void>;
  fetchTodayActiveCount: () => Promise<void>; // 오늘 활동 청취자 수 조회
  fetchTemplates: () => Promise<void>;
  fetchRouletteHistory: () => Promise<void>;
  updateRouletteRecord: (recordId: string, used: boolean) => Promise<void>;
  updateShield: (change: number, reason: string) => Promise<void>;
  resetShield: () => Promise<void>;
}

const API_BASE = 'stp://starter-pack.sopia.dev';

export const useAppStore = create<AppState>((set, get) => ({
  fanscoreRanking: [],
  shieldData: null,
  todayActiveCount: 0,
  templates: [],
  rouletteHistory: [],
  loading: false,

  fetchFanscoreRanking: async () => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_BASE}/fanscore/ranking`);
      const data = await response.json();
      set({ fanscoreRanking: data });
    } catch (error) {
      console.error('Failed to fetch fanscore ranking:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchTodayActiveCount: async () => {
    try {
      const response = await fetch(`${API_BASE}/fanscore/stats/today-active`);
      const data = await response.json();
      set({ todayActiveCount: data.count });
    } catch (error) {
      console.error('Failed to fetch today active count:', error);
    }
  },

  fetchShieldData: async () => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_BASE}/shield`);
      const data = await response.json();
      set({ shieldData: data });
    } catch (error) {
      console.error('Failed to fetch shield data:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchTemplates: async () => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_BASE}/templates`);
      const data = await response.json();
      set({ templates: data });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchRouletteHistory: async () => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_BASE}/roulette/history`);
      const data = await response.json();
      set({ rouletteHistory: data });
    } catch (error) {
      console.error('Failed to fetch roulette history:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateRouletteRecord: async (recordId: string, used: boolean) => {
    try {
      const response = await fetch(`${API_BASE}/roulette/history/${recordId}/use`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ used }),
      });
      
      if (response.ok) {
        // 로컬 상태 업데이트
        const { rouletteHistory } = get();
        const updatedHistory = rouletteHistory.map(record =>
          record.id === recordId ? { ...record, used } : record
        );
        set({ rouletteHistory: updatedHistory });
      }
    } catch (error) {
      console.error('Failed to update roulette record:', error);
    }
  },

  updateShield: async (change: number, reason: string) => {
    try {
      const response = await fetch(`${API_BASE}/shield/change`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ change, reason }),
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ shieldData: data });
      }
    } catch (error) {
      console.error('Failed to update shield:', error);
    }
  },

  resetShield: async () => {
    try {
      const response = await fetch(`${API_BASE}/shield/reset`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ shieldData: data });
      }
    } catch (error) {
      console.error('Failed to reset shield:', error);
    }
  },
}));

