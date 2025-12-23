// apps/worker/src/managers/roulette-manager.ts

import type { LiveSocket } from '@sopia-bot/core';
import type {
  RouletteTemplate,
  TemplateItem,
  RouletteSpinResult,
  RouletteResult
} from '../types/roulette';
import type { FanscoreManager } from './fanscore-manager';

const API_BASE = 'stp://starter-pack.sopia.dev';

/**
 * 룰렛 매니저
 * - 티켓 지급
 * - 룰렛 실행
 * - 당첨 아이템 관리
 */
export class RouletteManager {
  private templates: RouletteTemplate[] = [];
  private fanscoreManager: FanscoreManager | null = null;

  constructor(fanscoreManager?: FanscoreManager) {
    if (fanscoreManager) {
      this.fanscoreManager = fanscoreManager;
    }
  }

  /**
   * 소켓
   */
  get socket(): LiveSocket {
    return window.$sopia.liveMap.values().next().value?.socket as LiveSocket;
  }

  /**
   * 템플릿 로드 (성공할 때까지 재시도)
   */
  async loadTemplates(): Promise<void> {
    while (true) {
      try {
        const response = await fetch(`${API_BASE}/templates`);

        if (!response.ok) {
          console.log(`[RouletteManager] Templates API not ready (${response.status}), retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const data = await response.json();

        // 배열인지 확인 (에러 응답이 객체일 수 있음)
        if (!Array.isArray(data)) {
          console.log('[RouletteManager] Invalid templates response, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        this.templates = data;
        console.log('[RouletteManager] Templates loaded:', this.templates.length);
        break;
      } catch (error: any) {
        console.error('[RouletteManager] Failed to load templates, retrying in 1 second...', error?.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * 템플릿 조회
   */
  getTemplate(templateId: string): RouletteTemplate | undefined {
    return this.templates.find(t => t.template_id === templateId);
  }

  /**
   * 모든 템플릿 조회
   */
  getAllTemplates(): RouletteTemplate[] {
    return this.templates;
  }

  /**
   * 티켓 지급
   * @param userId 사용자 ID
   * @param nickname 닉네임
   * @param tag 고유닉
   * @param templateId 템플릿 ID
   * @param count 티켓 개수
   */
  async giveTickets(
    userId: number,
    nickname: string,
    tag: string,
    templateId: string,
    count: number
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/roulette/tickets/${userId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, count, nickname, tag })
      });

      if (!response.ok) {
        throw new Error(`Failed to give tickets: ${response.statusText}`);
      }

      console.log('[RouletteManager] Tickets given:', { userId, templateId, count });
    } catch (error: any) {
      console.error('[RouletteManager] Failed to give tickets:', error?.message);
    }
  }

  /**
   * 사용자 티켓 조회
   */
  async getUserTickets(userId: number): Promise<{ [templateId: string]: number }> {
    try {
      const response = await fetch(`${API_BASE}/roulette/tickets/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to get user tickets: ${response.statusText}`);
      }
      const data = await response.json();
      return data.tickets || {};
    } catch (error: any) {
      console.error('[RouletteManager] Failed to get user tickets:', error?.message);
      return {};
    }
  }

  /**
   * 룰렛 실행 (단일)
   * @param template 템플릿
   * @returns 당첨 아이템
   */
  private spinOnce(template: RouletteTemplate): TemplateItem {
    const random = Math.random() * 100;
    let cumulativePercentage = 0;

    for (const item of template.items) {
      cumulativePercentage += item.percentage;
      if (random <= cumulativePercentage) {
        return item;
      }
    }

    // 꽝
    return {
      type: 'custom',
      label: '꽝',
      percentage: 0
    };
  }

  /**
   * 룰렛 실행 (여러 번)
   * @param template 템플릿
   * @param count 실행 횟수
   * @returns 통합 결과
   */
  private spinMultiple(template: RouletteTemplate, count: number): RouletteSpinResult {
    const resultsMap = new Map<string, RouletteResult>();
    let hasRareItem = false;

    for (let i = 0; i < count; i++) {
      const item = this.spinOnce(template);
      const key = item.label;

      if (item.percentage < 1 && item.percentage > 0) {
        hasRareItem = true;
      }

      if (resultsMap.has(key)) {
        resultsMap.get(key)!.count++;
      } else {
        resultsMap.set(key, { item, count: 1 });
      }
    }

    return {
      template,
      results: resultsMap,
      totalSpins: count,
      hasRareItem
    };
  }

  /**
   * 룰렛 실행 및 결과 저장
   * @param userId 사용자 ID
   * @param nickname 닉네임
   * @param tag 고유닉
   * @param templateId 템플릿 ID
   * @param count 실행 횟수
   * @returns 실행 결과
   */
  async spinRoulette(
    userId: number,
    nickname: string,
    tag: string,
    templateId: string,
    count: number
  ): Promise<RouletteSpinResult | null> {
    try {
      // 템플릿 조회
      const template = this.getTemplate(templateId);
      if (!template) {
        console.error('[RouletteManager] Template not found:', templateId);
        return null;
      }

      // 티켓 확인
      const tickets = await this.getUserTickets(userId);
      const availableTickets = tickets[templateId] || 0;

      if (availableTickets < count) {
        console.warn('[RouletteManager] Insufficient tickets:', {
          userId,
          templateId,
          available: availableTickets,
          required: count
        });
        return null;
      }

      // 룰렛 실행
      const result = this.spinMultiple(template, count);

      // 티켓 차감
      await this.giveTickets(userId, nickname, tag, templateId, -count);

      // 당첨 아이템 저장
      await this.saveWinnings(userId, nickname, tag, result);

      return result;
    } catch (error: any) {
      console.error('[RouletteManager] Failed to spin roulette:', error?.message);
      return null;
    }
  }

  /**
   * 당첨 아이템 저장 (roulette-history 및 keep-items)
   */
  private async saveWinnings(
    userId: number,
    nickname: string,
    tag: string,
    result: RouletteSpinResult
  ): Promise<void> {
    try {
      // roulette-history에 저장 (꽝은 제외)
      for (const [label, { item, count }] of result.results.entries()) {
        if (label === '꽝') continue; // 꽝은 히스토리에 저장하지 않음

        for (let i = 0; i < count; i++) {
          const historyRecord = {
            id: `roulette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            template_id: result.template.template_id,
            user_id: userId,
            nickname,
            item: {
              type: item.type,
              label: item.label,
              percentage: item.percentage
            },
            // 실드와 복권, 상점은 즉시 사용되므로 used: true, 커스텀은 false
            used: item.type === 'shield' || item.type === 'ticket' || item.type === 'shop',
            timestamp: new Date().toISOString()
          };

          const historyResponse = await fetch(`${API_BASE}/roulette/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(historyRecord)
          });

          if (!historyResponse.ok) {
            console.error('[RouletteManager] Failed to save history record');
          }
        }
      }

      // 아이템 처리 (실드, 복권, 커스텀)
      for (const [label, { item, count }] of result.results.entries()) {
        if (label === '꽝') continue;

        if (item.type === 'shield' && item.value !== undefined) {
          // 실드: 즉시 적용 (킵에 저장하지 않음)
          const totalChange = item.value * count;
          await this.applyShieldChange(totalChange, `룰렛 당첨: ${label} x${count}`);
        } else if (item.type === 'ticket' && item.value !== undefined) {
          // 복권: 즉시 지급 (킵에 저장하지 않음)
          const totalTickets = item.value * count;
          await this.giveLotteryTickets(userId, totalTickets, `룰렛 당첨: ${label} x${count}`);
        } else if (item.type === 'shop' && item.value !== undefined) {
          // 상점: 즉시 애청지수 반영 (킵에 저장하지 않음)
          const totalScore = item.value * count;
          await this.applyShopScore(userId, nickname, tag, totalScore, `룰렛 당첨: ${label} x${count}`);
        } else {
          // 커스텀 아이템: 킵에 저장
          const keepItem = {
            type: item.type,
            label: item.label,
            count,
            percentage: item.percentage,
            template_id: result.template.template_id,
            template_name: result.template.name
          };

          const keepResponse = await fetch(`${API_BASE}/roulette/keep-items/${userId}/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: keepItem, nickname, tag })
          });

          if (!keepResponse.ok) {
            console.error('[RouletteManager] Failed to save keep item');
          }
        }
      }
    } catch (error: any) {
      console.error('[RouletteManager] Failed to save winnings:', error?.message);
    }
  }

  /**
   * 실드 변경 적용
   */
  private async applyShieldChange(change: number, reason: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/shield/change`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change, reason })
      });

      if (!response.ok) {
        throw new Error(`Failed to apply shield change: ${response.statusText}`);
      }

      const data = await response.json();
      const currentShield = data.shield_count;

      // 채팅으로 알림
      if (this.socket) {
        const sign = change >= 0 ? '+' : '';
        await this.socket.message(`[실드] ${sign}${change} (현재: ${currentShield})`);
      }

      console.log('[RouletteManager] Shield changed:', { change, reason, currentShield });
    } catch (error: any) {
      console.error('[RouletteManager] Failed to apply shield change:', error?.message);
    }
  }

  /**
   * 복권 지급 (pendingUpdates 사용)
   */
  /**
   * 복권 지급 (pendingUpdates 사용)
   */
  private async giveLotteryTickets(userId: number, count: number, reason: string): Promise<void> {
    try {
      if (!this.fanscoreManager) {
        console.error('[RouletteManager] FanscoreManager not available for lottery tickets');
        return;
      }

      // 사용자 정보 조회 (캐시 사용)
      const userData = await this.fanscoreManager.loadUser(userId);
      if (!userData) {
        throw new Error('User not found');
      }

      // 복권 지급 (pendingUpdates 사용 및 캐시 즉시 업데이트)
      this.fanscoreManager.updateLotteryTickets(userId, count, userData.nickname, userData.tag);

      // 업데이트된 캐시 데이터 다시 조회 (또는 예측값 계산)
      // updateLotteryTickets는 캐시를 즉시 업데이트하므로 loadUser로 다시 가져오면 반영되어 있음
      const updatedUser = await this.fanscoreManager.loadUser(userId);
      const newTickets = updatedUser?.lottery_tickets || 0;

      // 채팅으로 알림
      if (this.socket) {
        if (count >= 0) {
          await this.socket.message(`[복권] ${userData.nickname}님에게 복권 ${count}장 지급되었습니다. (보유: ${newTickets}개)`);
        } else {
          await this.socket.message(`[복권] ${userData.nickname}님의 복권 ${Math.abs(count)}장 차감되었습니다. (보유: ${newTickets}개)`);
        }
      }

      console.log('[RouletteManager] Lottery tickets scheduled:', { userId, count, reason, expectedTickets: newTickets });
    } catch (error: any) {
      console.error('[RouletteManager] Failed to give lottery tickets:', error?.message);
    }
  }

  /**
   * 상점 점수 적용
   */
  private async applyShopScore(
    userId: number,
    nickname: string,
    tag: string,
    score: number,
    reason: string
  ): Promise<void> {
    try {
      if (!this.fanscoreManager) {
        console.error('[RouletteManager] FanscoreManager not available for shop score');
        return;
      }

      // User 객체 구성 (addExpDirect에 필요)
      const user = {
        id: userId,
        nickname: nickname,
        tag: tag
      } as any;

      this.fanscoreManager.addExpDirect(user, score);

      // 채팅으로 알림
      if (this.socket) {
        const sign = score >= 0 ? '+' : '';
        await this.socket.message(`[상점] ${nickname}님, 애청지수 ${sign}${score}점`);
      }

      console.log('[RouletteManager] Shop score applied:', { userId, score, reason });
    } catch (error: any) {
      console.error('[RouletteManager] Failed to apply shop score:', error?.message);
    }
  }

  /**
   * 수동 룰렛 실행 (티켓 검증 없이)
   * @param userId 사용자 ID
   * @param nickname 닉네임
   * @param tag 고유닉
   * @param templateId 템플릿 ID
   * @param count 실행 횟수
   * @param saveHistory 히스토리 저장 여부
   * @returns 실행 결과
   */
  async spinManual(
    userId: number,
    nickname: string,
    tag: string,
    templateId: string,
    count: number,
    saveHistory: boolean
  ): Promise<RouletteSpinResult | null> {
    try {
      // 템플릿 조회
      const template = this.getTemplate(templateId);
      if (!template) {
        console.error('[RouletteManager] Template not found:', templateId);
        return null;
      }

      // 룰렛 실행 (티켓 검증 없이)
      const result = this.spinMultiple(template, count);

      // 히스토리 저장 (옵션)
      if (saveHistory) {
        await this.saveWinnings(userId, nickname, tag, result);
      }

      return result;
    } catch (error: any) {
      console.error('[RouletteManager] Failed to spin manual roulette:', error?.message);
      return null;
    }
  }

  /**
   * 룰렛 결과 메시지 생성
   */
  formatResult(nickname: string, result: RouletteSpinResult): string {
    const lines = [`[${nickname}님 룰렛 결과]`, result.template.name, ''];

    // 결과를 배열로 변환하여 정렬 (꽝은 마지막)
    const sortedResults = Array.from(result.results.entries()).sort(([labelA], [labelB]) => {
      if (labelA === '꽝') return 1;
      if (labelB === '꽝') return -1;
      return 0;
    });

    for (const [label, { count }] of sortedResults) {
      lines.push(`- ${label} x${count}`);
    }

    return lines.join('\\n');
  }

  /**
   * 사용자 킵 아이템 조회
   */
  async getUserKeepItems(userId: number): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE}/roulette/keep-items/${userId}`);
      if (!response.ok) {
        throw new Error(`Failed to get keep items: ${response.statusText}`);
      }
      const data = await response.json();
      return data.items || [];
    } catch (error: any) {
      console.error('[RouletteManager] Failed to get keep items:', error?.message);
      return [];
    }
  }

  /**
   * 킵 아이템 사용
   */
  async useKeepItem(userId: number, itemIndex: number): Promise<any | null> {
    try {
      const response = await fetch(`${API_BASE}/roulette/keep-items/${userId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex })
      });

      if (!response.ok) {
        throw new Error(`Failed to use keep item: ${response.statusText}`);
      }

      const data = await response.json();
      return data.item;
    } catch (error: any) {
      console.error('[RouletteManager] Failed to use keep item:', error?.message);
      return null;
    }
  }

  /**
   * Auto-run 룰렛 실행
   * 티켓 발급 시 자동으로 실행
   */
  async autoRunRoulette(
    userId: number,
    nickname: string,
    tag: string,
    templateId: string
  ): Promise<void> {
    const template = this.getTemplate(templateId);
    if (!template || !template.auto_run) {
      return;
    }

    const tickets = await this.getUserTickets(userId);
    const availableTickets = tickets[templateId] || 0;

    if (availableTickets <= 0) {
      return;
    }

    // 모든 티켓 사용
    const result = await this.spinRoulette(userId, nickname, tag, templateId, availableTickets);

    if (result && this.socket) {
      // 좋아요 모드일 경우, 꽝만 나오면 메시지를 보내지 않음
      if (template.mode === 'like') {
        // 꽝만 있는지 확인
        const hasOnlyMiss = result.results.size === 1 && result.results.has('꽝');
        if (hasOnlyMiss) {
          return; // 꽝만 나왔으면 채팅 안 보냄
        }
      }

      const message = this.formatResult(nickname, result);
      await this.socket.message(message);
    }
  }

  /**
   * 매니저 종료
   */
  destroy() {
    this.templates = [];
    console.log('[RouletteManager] Destroyed');
  }
}

