// apps/worker/src/commands/roulette-debug.ts

import type { CommandContext } from '../utils/command-parser';
import type { RouletteManager } from '../managers/roulette-manager';
import type { RouletteTemplate } from '../types/roulette';

/**
 * !설정 룰렛 - 모든 템플릿 설정 표시
 */
export async function handleShowRouletteConfig(
  context: CommandContext,
  rouletteManager: RouletteManager
): Promise<void> {
  const { socket, user } = context;

  // raravel 전용 명령어
  if (user.tag !== 'raravel') {
    return;
  }

  try {
    const templates = rouletteManager.getAllTemplates();

    if (templates.length === 0) {
      await socket.message('[룰렛 설정]\\n등록된 템플릿이 없습니다.');
      return;
    }

    const lines = ['[룰렛 설정]'];
    templates.forEach((template: RouletteTemplate, index: number) => {
      const modeText = template.mode === 'sticker' 
        ? `스티커(${template.sticker})`
        : template.mode === 'spoon'
        ? `스푼(${template.spoon})`
        : '좋아요';

      const divisionText = (template.mode === 'sticker' || template.mode === 'spoon') 
        ? (template.division ? '분배' : '미분배')
        : '-';

      const autoRunText = template.auto_run ? 'O' : 'X';
      const enabledText = template.enabled ? '활성' : '비활성';

      lines.push(
        `${index + 1}. ${template.name}`,
        `   모드: ${modeText} / ${divisionText}`,
        `   자동실행: ${autoRunText} / 상태: ${enabledText}`,
        `   아이템: ${template.items.length}개`,
        ''
      );
    });

    await socket.message(lines.join('\\n'));
  } catch (error: any) {
    console.error('[RouletteDebug] Error in handleShowRouletteConfig:', error?.message);
    await socket.message('룰렛 설정 조회 중 오류가 발생했습니다.');
  }
}

/**
 * !설정 룰렛 [템플릿 번호] - 특정 템플릿의 아이템 표시
 */
export async function handleShowRouletteItems(
  context: CommandContext,
  rouletteManager: RouletteManager,
  templateNumber: number
): Promise<void> {
  const { socket, user } = context;

  // raravel 전용 명령어
  if (user.tag !== 'raravel') {
    return;
  }

  try {
    const templates = rouletteManager.getAllTemplates();

    if (templateNumber < 1 || templateNumber > templates.length) {
      await socket.message(`템플릿 번호는 1부터 ${templates.length}까지 입니다.`);
      return;
    }

    const template = templates[templateNumber - 1];
    const lines = [
      `[룰렛 아이템: ${template.name}]`,
      `템플릿 ID: ${template.template_id}`,
      ''
    ];

    if (template.items.length === 0) {
      lines.push('아이템이 없습니다.');
    } else {
      template.items.forEach((item, index) => {
        let itemInfo = `${index + 1}. ${item.label} (${item.percentage}%)`;
        
        if (item.type === 'shield' && item.value !== undefined) {
          const sign = item.value >= 0 ? '+' : '';
          itemInfo += ` [실드 ${sign}${item.value}]`;
        } else if (item.type === 'ticket' && item.value !== undefined) {
          itemInfo += ` [복권 ${item.value}장]`;
        }
        
        lines.push(itemInfo);
      });
    }

    await socket.message(lines.join('\\n'));
  } catch (error: any) {
    console.error('[RouletteDebug] Error in handleShowRouletteItems:', error?.message);
    await socket.message('룰렛 아이템 조회 중 오류가 발생했습니다.');
  }
}

/**
 * !설정 룰렛 티켓 [템플릿 번호] [숫자] - raravel에게 티켓 지급
 */
export async function handleGiveDebugTicket(
  context: CommandContext,
  rouletteManager: RouletteManager,
  templateNumber: number,
  count: number
): Promise<void> {
  const { socket, user } = context;

  // raravel 전용 명령어
  if (user.tag !== 'raravel') {
    return;
  }

  try {
    const templates = rouletteManager.getAllTemplates();

    if (templateNumber < 1 || templateNumber > templates.length) {
      await socket.message(`템플릿 번호는 1부터 ${templates.length}까지 입니다.`);
      return;
    }

    const template = templates[templateNumber - 1];

    await rouletteManager.giveTickets(
      user.id,
      user.nickname,
      user.tag,
      template.template_id,
      count
    );

    await socket.message(
      `[티켓 지급]\\n${template.name}: ${count > 0 ? '+' : ''}${count}개`
    );
  } catch (error: any) {
    console.error('[RouletteDebug] Error in handleGiveDebugTicket:', error?.message);
    await socket.message('티켓 지급 중 오류가 발생했습니다.');
  }
}

