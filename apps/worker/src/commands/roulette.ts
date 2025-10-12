// apps/worker/src/commands/roulette.ts

import type { CommandContext } from '../utils/command-parser';
import type { RouletteManager } from '../managers/roulette-manager';
import type { RouletteTemplate } from '../types/roulette';

/**
 * 템플릿 모드에 따른 설명 생성
 */
function getTemplateDescription(template: RouletteTemplate): string {
  if (template.mode === 'like') {
    return '좋아요';
  } else if (template.mode === 'sticker') {
    const divisionText = template.division ? '분배' : '미분배';
    return `스티커 ${template.sticker || '없음'} (${divisionText})`;
  } else if (template.mode === 'spoon') {
    const divisionText = template.division ? '분배' : '미분배';
    return `스푼 ${template.spoon || 0} (${divisionText})`;
  }
  return '알 수 없음';
}

/**
 * !룰렛 - 템플릿 리스트 표시
 */
async function showRouletteList(
  context: CommandContext,
  rouletteManager: RouletteManager
): Promise<void> {
  const { socket } = context;

  try {
    const templates = rouletteManager.getAllTemplates();
    const enabledTemplates = templates.filter((t: any) => t.enabled !== false);

    if (enabledTemplates.length === 0) {
      await socket.message('활성화된 룰렛이 없습니다.');
      return;
    }

    const lines = ['[룰렛 목록]'];
    enabledTemplates.forEach((template: RouletteTemplate, index: number) => {
      const description = getTemplateDescription(template);
      lines.push(`${index + 1}. ${template.name} (${description})`);
    });

    await socket.message(lines.join('\\n'));
  } catch (error: any) {
    console.error('[RouletteCommand] Error in showRouletteList:', error?.message);
    await socket.message('룰렛 목록 조회 중 오류가 발생했습니다.');
  }
}

/**
 * !룰렛 - 템플릿 리스트 표시
 * !룰렛 [템플릿 번호] [횟수]
 * !룰렛 [템플릿 번호]
 * !룰렛 전체
 */
export async function handleRouletteCommand(
  args: string[],
  context: CommandContext,
  rouletteManager: RouletteManager
): Promise<void> {
  const { socket, user } = context;

  // 인자 없이 입력하면 템플릿 리스트 표시
  if (!args || args.length === 0) {
    await showRouletteList(context, rouletteManager);
    return;
  }

  try {
    // !룰렛 전체
    if (args[0] === '전체') {
      await handleRouletteAll(context, rouletteManager);
      return;
    }

    // 템플릿 번호 파싱
    const templateIdx = parseInt(args[0]);
    if (isNaN(templateIdx)) {
      await socket.message('올바른 템플릿 번호를 입력해주세요.');
      return;
    }

    // 템플릿 조회 (idx는 1부터 시작)
    const templates = rouletteManager.getAllTemplates();
    if (templateIdx < 1 || templateIdx > templates.length) {
      await socket.message(`템플릿 번호는 1부터 ${templates.length}까지 입니다.`);
      return;
    }

    const template = templates[templateIdx - 1];
    const tickets = await rouletteManager.getUserTickets(user.id);
    const availableTickets = tickets[template.template_id] || 0;

    if (availableTickets <= 0) {
      await socket.message(`${user.nickname}님, 해당 템플릿의 티켓이 없습니다.`);
      return;
    }

    // 횟수 파싱 (없으면 전체 사용)
    let count = availableTickets;
    if (args.length >= 2) {
      count = parseInt(args[1]);
      if (isNaN(count) || count <= 0) {
        await socket.message('올바른 횟수를 입력해주세요.');
        return;
      }

      if (count > availableTickets) {
        await socket.message(`티켓이 부족합니다. (보유: ${availableTickets}개)`);
        return;
      }
    }

    // 룰렛 실행
    const result = await rouletteManager.spinRoulette(
      user.id,
      user.nickname,
      user.tag,
      template.template_id,
      count
    );

    if (result) {
      const message = rouletteManager.formatResult(user.nickname, result);
      await socket.message(message);
    } else {
      await socket.message('룰렛 실행에 실패했습니다.');
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error:', error?.message);
    await socket.message('룰렛 실행 중 오류가 발생했습니다.');
  }
}

/**
 * !룰렛 전체 - 모든 템플릿의 티켓 사용
 */
async function handleRouletteAll(
  context: CommandContext,
  rouletteManager: RouletteManager
): Promise<void> {
  const { socket, user } = context;

  try {
    const tickets = await rouletteManager.getUserTickets(user.id);
    const templates = rouletteManager.getAllTemplates();

    let totalSpins = 0;
    const allResults: any[] = [];

    for (const template of templates) {
      const count = tickets[template.template_id] || 0;
      if (count <= 0) continue;

      const result = await rouletteManager.spinRoulette(
        user.id,
        user.nickname,
        user.tag,
        template.template_id,
        count
      );

      if (result) {
        totalSpins += result.totalSpins;
        allResults.push(result);
      }
    }

    if (totalSpins === 0) {
      await socket.message(`${user.nickname}님, 사용 가능한 티켓이 없습니다.`);
      return;
    }

    // 모든 결과 출력
    for (const result of allResults) {
      const message = rouletteManager.formatResult(user.nickname, result);
      await socket.message(message);
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleRouletteAll:', error?.message);
    await socket.message('룰렛 실행 중 오류가 발생했습니다.');
  }
}

/**
 * !킵 - 킵 아이템 목록 조회
 */
export async function handleKeepCommand(
  args: string[],
  context: CommandContext,
  rouletteManager: RouletteManager
): Promise<void> {
  const { socket, user } = context;

  try {
    const items = await rouletteManager.getUserKeepItems(user.id);

    if (items.length === 0) {
      await socket.message(`${user.nickname}님, 킵 목록이 비어있습니다.`);
      return;
    }

    const lines = [`[${user.nickname}님 킵 목록]`];
    items.forEach((item: any, index: number) => {
      lines.push(`${index + 1}. ${item.label} x${item.count}`);
    });

    await socket.message(lines.join('\\n'));
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleKeepCommand:', error?.message);
    await socket.message('킵 목록 조회 중 오류가 발생했습니다.');
  }
}

/**
 * !사용 [숫자] - 킵 아이템 사용
 */
export async function handleUseCommand(
  args: string[],
  context: CommandContext,
  rouletteManager: RouletteManager
): Promise<void> {
  const { socket, user } = context;

  if (args.length === 0) {
    await socket.message('사용법: !사용 [숫자]');
    return;
  }

  try {
    const itemNumber = parseInt(args[0]);
    if (isNaN(itemNumber) || itemNumber < 1) {
      await socket.message('올바른 숫자를 입력해주세요.');
      return;
    }

    const itemIndex = itemNumber - 1;
    const item = await rouletteManager.useKeepItem(user.id, itemIndex);

    if (!item) {
      await socket.message('아이템 사용에 실패했습니다. 킵 목록을 확인해주세요.');
      return;
    }

    await socket.message(`${user.nickname}님이 ${item.label}을(를) 사용했습니다.`);
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleUseCommand:', error?.message);
    await socket.message('아이템 사용 중 오류가 발생했습니다.');
  }
}

