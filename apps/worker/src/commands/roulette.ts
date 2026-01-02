// apps/worker/src/commands/roulette.ts

import { User } from '@sopia-bot/core';
import type { CommandContext } from '../utils/command-parser';
import type { RouletteManager } from '../managers/roulette-manager';
import type { RouletteTemplate } from '../types/roulette';
import type { FanscoreUser } from '../types/fanscore';

const DOMAIN = 'starter-pack.sopia.dev';

/**
 * 현재 방의 모든 청취자 가져오기
 */
async function getAllListeners(liveId: number): Promise<User[]> {
  let members: User[] = [];
  const liveInfo = await window.$sopia.api.lives.info(liveId);
  const authorInfo = liveInfo.res.results[0].author as User;
  members.push(authorInfo);
  let req = await window.$sopia.api.lives.listeners(liveId);
  members.push(...req.res.results);
  while (req.res.next) {
    req = await window.$sopia.api.lives.listeners(liveId, { next: req.res.next });
    members.push(...req.res.results);
  }
  return members;
}

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
  rouletteManager: RouletteManager,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  try {
    const templates = rouletteManager.getAllTemplates().map((t: RouletteTemplate, idx) => ({
      ...t,
      idx: idx + 1
    }));
    const enabledTemplates = templates.filter((t: any) => t.enabled !== false);

    if (enabledTemplates.length === 0) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛', 'error_no_templates', variables, '활성화된 룰렛이 없습니다.')
        : '활성화된 룰렛이 없습니다.';
      await socket.message(message);
      return;
    }

    // 템플릿 사용
    if (commandTemplateManager) {
      const header = commandTemplateManager.getMessage('룰렛', 'list_header', variables, '[룰렛 목록]');
      const itemTemplateRaw = commandTemplateManager.getMessage('룰렛', 'list_item', {}, '{idx}. {name} ({description})');
      
      const lines = [header];
      enabledTemplates.forEach((template: RouletteTemplate) => {
        const description = getTemplateDescription(template);
        const itemVars: Record<string, any> = {
          ...variables,
          template_index: (template as any).idx,
          template_name: template.name,
          template_description: description
        };
        let itemText = itemTemplateRaw;
        Object.keys(itemVars).forEach(key => {
          itemText = itemText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(itemVars[key]));
        });
        lines.push(itemText);
      });
      await socket.message(lines.join('\\n'));
    } else {
      // 기본값 (하위 호환성)
      const lines = ['[룰렛 목록]'];
      enabledTemplates.forEach((template: RouletteTemplate) => {
        const description = getTemplateDescription(template);
        lines.push(`${(template as any).idx}. ${template.name} (${description})`);
      });
      await socket.message(lines.join('\\n'));
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error in showRouletteList:', error?.message);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛', 'error_failed', variables, '룰렛 목록 조회 중 오류가 발생했습니다.')
      : '룰렛 목록 조회 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

/**
 * !룰렛 목록 [템플릿 번호] - 템플릿 아이템 목록 표시
 */
async function handleShowRouletteItems(
  context: CommandContext,
  rouletteManager: RouletteManager,
  templateNumber: number,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  try {
    const templates = rouletteManager.getAllTemplates();

    if (templateNumber < 1 || templateNumber > templates.length) {
      const vars = { ...variables, max: templates.length };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛_목록', 'error_invalid_number', vars, `템플릿 번호는 1부터 ${templates.length}까지 입니다.`)
        : `템플릿 번호는 1부터 ${templates.length}까지 입니다.`;
      await socket.message(message);
      return;
    }

    const template = templates[templateNumber - 1];

    // 템플릿 사용
    if (commandTemplateManager) {
      const headerVars = {
        ...variables,
        template_name: template.name,
        template_id: template.template_id
      };
      const header = commandTemplateManager.getMessage('룰렛_목록', 'list_header', headerVars, `[룰렛 아이템: ${template.name}]\\n템플릿 ID: ${template.template_id}\\n`);
      
      if (template.items.length === 0) {
        const emptyMessage = commandTemplateManager.getMessage('룰렛_목록', 'error_no_items', variables, '아이템이 없습니다.');
        await socket.message(header + emptyMessage);
      } else {
        const itemTemplateRaw = commandTemplateManager.getMessage('룰렛_목록', 'item', {}, '{item_index}. {item_label}{item_detail}');
        
        const lines = [header.replace(/\\n$/, '')]; // 마지막 줄바꿈 제거
        template.items.forEach((item, index) => {
          let extra = '';
          if (item.type === 'shield' && item.value !== undefined) {
            const sign = item.value >= 0 ? '+' : '';
            extra = ` [실드 ${sign}${item.value}]`;
          } else if (item.type === 'ticket' && item.value !== undefined) {
            extra = ` [복권 ${item.value}장]`;
          }
          
          const itemVars: Record<string, any> = {
            ...variables,
            template_name: template.name,
            template_id: template.template_id,
            item_index: index + 1,
            item_label: item.label,
            item_detail: extra,
          };
          let itemText = itemTemplateRaw;
          Object.keys(itemVars).forEach(key => {
            itemText = itemText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(itemVars[key]));
          });
          lines.push(itemText);
        });
        await socket.message(lines.join('\\n'));
      }
    } else {
      // 기본값 (하위 호환성)
      const lines = [
        `[룰렛 아이템: ${template.name}]`,
        `템플릿 ID: ${template.template_id}`,
        ''
      ];

      if (template.items.length === 0) {
        lines.push('아이템이 없습니다.');
      } else {
        template.items.forEach((item, index) => {
          let itemInfo = `${index + 1}. ${item.label}`;
          
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
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleShowRouletteItems:', error?.message);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛_목록', 'error_failed', variables, '룰렛 아이템 조회 중 오류가 발생했습니다.')
      : '룰렛 아이템 조회 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

/**
 * !룰렛 - 템플릿 리스트 표시
 * !룰렛 [템플릿 번호] [횟수]
 * !룰렛 [템플릿 번호]
 * !룰렛 전체
 * !룰렛 자동
 */
export async function handleRouletteCommand(
  args: string[],
  context: CommandContext,
  rouletteManager: RouletteManager,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  // 인자 없이 입력하면 템플릿 리스트 표시
  if (!args || args.length === 0) {
    await showRouletteList(context, rouletteManager, commandTemplateManager);
    return;
  }

  try {
    // !룰렛 지급 [템플릿 번호] [고유닉] [갯수]
    if (args[0] === '지급') {
      await handleGiveRouletteTickets(args.slice(1), context as CommandContext & { liveId: number }, rouletteManager, commandTemplateManager);
      return;
    }

    // !룰렛 목록 [템플릿 번호]
    if (args[0] === '목록') {
      if (args.length < 2) {
        const message = commandTemplateManager
          ? commandTemplateManager.getMessage('룰렛_목록', 'error_usage', variables, '사용법: !룰렛 목록 [템플릿 번호]')
          : '사용법: !룰렛 목록 [템플릿 번호]';
        await socket.message(message);
        return;
      }
      
      const templateNumber = parseInt(args[1]);
      if (isNaN(templateNumber)) {
        const message = commandTemplateManager
          ? commandTemplateManager.getMessage('룰렛_목록', 'error_invalid_number_format', variables, '올바른 템플릿 번호를 입력해주세요.')
          : '올바른 템플릿 번호를 입력해주세요.';
        await socket.message(message);
        return;
      }
      
      await handleShowRouletteItems(context, rouletteManager, templateNumber, commandTemplateManager);
      return;
    }

    // !룰렛 전체
    if (args[0] === '전체') {
      await handleRouletteAll(context, rouletteManager, commandTemplateManager);
      return;
    }

    // !룰렛 자동
    if (args[0] === '자동') {
      await handleRouletteAuto(context, rouletteManager, commandTemplateManager);
      return;
    }

    // 템플릿 번호 파싱
    const templateIdx = parseInt(args[0]);
    if (isNaN(templateIdx)) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛', 'error_invalid_template_format', variables, '올바른 템플릿 번호를 입력해주세요.')
        : '올바른 템플릿 번호를 입력해주세요.';
      await socket.message(message);
      return;
    }

    // 템플릿 조회 (idx는 1부터 시작)
    const templates = rouletteManager.getAllTemplates();
    if (templateIdx < 1 || templateIdx > templates.length) {
      const vars = { ...variables, max: templates.length };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛', 'error_invalid_template_number', vars, `템플릿 번호는 1부터 ${templates.length}까지 입니다.`)
        : `템플릿 번호는 1부터 ${templates.length}까지 입니다.`;
      await socket.message(message);
      return;
    }

    const template = templates[templateIdx - 1];
    const tickets = await rouletteManager.getUserTickets(user.id);
    const availableTickets = tickets[template.template_id] || 0;

    if (availableTickets <= 0) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛', 'error_no_tickets', variables, `${user.nickname}님, 해당 템플릿의 티켓이 없습니다.`)
        : `${user.nickname}님, 해당 템플릿의 티켓이 없습니다.`;
      await socket.message(message);
      return;
    }

    // 횟수 파싱 (없으면 전체 사용)
    let count = availableTickets;
    if (args.length >= 2) {
      count = parseInt(args[1]);
      if (isNaN(count) || count <= 0) {
        const message = commandTemplateManager
          ? commandTemplateManager.getMessage('룰렛', 'error_invalid_count', variables, '올바른 횟수를 입력해주세요.')
          : '올바른 횟수를 입력해주세요.';
        await socket.message(message);
        return;
      }

      if (count > availableTickets) {
        const vars = { ...variables, available: availableTickets };
        const message = commandTemplateManager
          ? commandTemplateManager.getMessage('룰렛', 'error_insufficient_tickets', vars, `티켓이 부족합니다. (보유: ${availableTickets}개)`)
          : `티켓이 부족합니다. (보유: ${availableTickets}개)`;
        await socket.message(message);
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
      // 템플릿을 사용하여 결과 포맷
      if (commandTemplateManager) {
        const headerVars = {
          ...variables,
          total_spins: result.totalSpins,
          template_name: result.template.name
        };
        const header = commandTemplateManager.getMessage('룰렛_자동', 'header', headerVars, `[${user.nickname}님 룰렛 결과]\\n${result.template.name}\\n`);
        const itemTemplateRaw = commandTemplateManager.getMessage('룰렛_자동', 'item', {}, '- {item_label} x{item_count}');
        
        // 결과를 배열로 변환하여 정렬 (꽝은 마지막)
        const sortedResults = Array.from(result.results.entries() as any).sort((a: any, b: any) => {
          const [labelA] = a;
          const [labelB] = b;
          if (labelA === '꽝') return 1;
          if (labelB === '꽝') return -1;
          return 0;
        });

        const lines = [header.replace(/\\n$/, '')];
        for (const [label, { count: itemCount }] of sortedResults as any) {
          const itemVars: Record<string, any> = {
            ...variables,
            item_label: label,
            item_count: itemCount,
            total_spins: result.totalSpins,
          };
          let itemText = itemTemplateRaw;
          Object.keys(itemVars).forEach(key => {
            itemText = itemText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(itemVars[key]));
          });
          lines.push(itemText);
        }
        await socket.message(lines.join('\\n'));
      } else {
        // 기본값 (하위 호환성)
        const message = rouletteManager.formatResult(user.nickname, result);
        await socket.message(message);
      }
    } else {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛', 'error_spin_failed', variables, '룰렛 실행에 실패했습니다.')
        : '룰렛 실행에 실패했습니다.';
      await socket.message(message);
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error:', error?.message);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛', 'error_exception', variables, '룰렛 실행 중 오류가 발생했습니다.')
      : '룰렛 실행 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

/**
 * !룰렛 전체 - 모든 템플릿의 티켓 사용
 */
async function handleRouletteAll(
  context: CommandContext,
  rouletteManager: RouletteManager,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

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
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛_전체', 'error_no_tickets', variables, `${user.nickname}님, 사용 가능한 티켓이 없습니다.`)
        : `${user.nickname}님, 사용 가능한 티켓이 없습니다.`;
      await socket.message(message);
      return;
    }

    // 모든 결과 출력
    for (const result of allResults) {
      if (commandTemplateManager) {
        const headerVars = {
          ...variables,
          total_spins: result.totalSpins,
          template_name: result.template.name
        };
        const header = commandTemplateManager.getMessage('룰렛_자동', 'header', headerVars, `[${user.nickname}님 룰렛 결과]\\n${result.template.name}\\n`);
        const itemTemplateRaw = commandTemplateManager.getMessage('룰렛_자동', 'item', {}, '- {item_label} x{item_count}');
        
        // 결과를 배열로 변환하여 정렬 (꽝은 마지막)
        const sortedResults = Array.from(result.results.entries() as any).sort((a: any, b: any) => {
          const [labelA] = a;
          const [labelB] = b;
          if (labelA === '꽝') return 1;
          if (labelB === '꽝') return -1;
          return 0;
        });

        const lines = [header.replace(/\\n$/, '')];
        for (const [label, { count: itemCount }] of sortedResults as any) {
          const itemVars: Record<string, any> = {
            ...variables,
            item_label: label,
            item_count: itemCount,
            total_spins: result.totalSpins
          };
          let itemText = itemTemplateRaw;
          Object.keys(itemVars).forEach(key => {
            itemText = itemText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(itemVars[key]));
          });
          lines.push(itemText);
        }
        await socket.message(lines.join('\\n'));
      } else {
        // 기본값 (하위 호환성)
        const message = rouletteManager.formatResult(user.nickname, result);
        await socket.message(message);
      }
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleRouletteAll:', error?.message);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛_전체', 'error_failed', variables, '룰렛 실행 중 오류가 발생했습니다.')
      : '룰렛 실행 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

/**
 * !룰렛 자동 - 모든 템플릿의 티켓을 사용하고 결과를 합산하여 표시
 */
async function handleRouletteAuto(
  context: CommandContext,
  rouletteManager: RouletteManager,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  try {
    const tickets = await rouletteManager.getUserTickets(user.id);
    const templates = rouletteManager.getAllTemplates();

    let totalSpins = 0;
    // 합산된 결과를 저장할 Map (아이템 label을 키로 사용)
    const combinedResults = new Map<string, number>();

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
        
        // 각 결과를 합산
        for (const [label, { count: itemCount }] of result.results.entries()) {
          const currentCount = combinedResults.get(label) || 0;
          combinedResults.set(label, currentCount + itemCount);
        }
      }
    }

    if (totalSpins === 0) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛_자동', 'error_no_tickets', variables, `${user.nickname}님, 사용 가능한 티켓이 없습니다.`)
        : `${user.nickname}님, 사용 가능한 티켓이 없습니다.`;
      await socket.message(message);
      return;
    }

    // 합산된 결과 출력
    const sortedResults = Array.from(combinedResults.entries()).sort(([labelA], [labelB]) => {
      if (labelA === '꽝') return 1;
      if (labelB === '꽝') return -1;
      return 0;
    });

    if (commandTemplateManager) {
      const headerVars = {
        ...variables,
        total_spins: totalSpins
      };
      const header = commandTemplateManager.getMessage('룰렛_자동', 'list_header', headerVars, `[${user.nickname}님 룰렛 자동 실행 결과]\\n총 ${totalSpins}회 실행\\n`);
      const itemTemplateRaw = commandTemplateManager.getMessage('룰렛_자동', 'list_item', {}, '- {label} x{count}');
      
      const lines = [header.replace(/\\n$/, '')];
      for (const [label, count] of sortedResults) {
        const itemVars: Record<string, any> = {
          ...variables,
          label: label,
          count: count
        };
        let itemText = itemTemplateRaw;
        Object.keys(itemVars).forEach(key => {
          itemText = itemText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(itemVars[key]));
        });
        lines.push(itemText);
      }
      await socket.message(lines.join('\\n'));
    } else {
      // 기본값 (하위 호환성)
      const lines = [`[${user.nickname}님 룰렛 자동 실행 결과]`, `총 ${totalSpins}회 실행`, ''];
      for (const [label, count] of sortedResults) {
        lines.push(`- ${label} x${count}`);
      }
      await socket.message(lines.join('\\n'));
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleRouletteAuto:', error?.message);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛_자동', 'error_failed', variables, '룰렛 실행 중 오류가 발생했습니다.')
      : '룰렛 실행 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

/**
 * !킵 - 킵 아이템 목록 조회
 */
export async function handleKeepCommand(
  args: string[],
  context: CommandContext,
  rouletteManager: RouletteManager,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  try {
    const items = await rouletteManager.getUserKeepItems(user.id);

    if (items.length === 0) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('킵', 'error_empty', variables, `${user.nickname}님, 킵 목록이 비어있습니다.`)
        : `${user.nickname}님, 킵 목록이 비어있습니다.`;
      await socket.message(message);
      return;
    }

    let lines: string[];
    
    if (commandTemplateManager) {
      const header = commandTemplateManager.getMessage('킵', 'header', variables, `[${user.nickname}님 킵 목록]`);
      const itemTemplateRaw = commandTemplateManager.getMessage('킵', 'item', {}, '{item_index}. {item_label} x{item_count}');
      
      lines = [header];
      items.forEach((item: any, index: number) => {
        const itemVars: Record<string, any> = {
          ...variables,
          item_index: index + 1,
          item_label: item.label,
          item_count: item.count
        };
        let itemText = itemTemplateRaw;
        Object.keys(itemVars).forEach(key => {
          itemText = itemText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(itemVars[key]));
        });
        lines.push(itemText);
      });
    } else {
      // 기본값 (하위 호환성)
      lines = [`[${user.nickname}님 킵 목록]`];
      items.forEach((item: any, index: number) => {
        lines.push(`${index + 1}. ${item.label} x${item.count}`);
      });
    }

    // 200글자 제한에 맞춰서 메시지 분할
    const MAX_MESSAGE_LENGTH = 200;
    let currentMessage = '';
    const messages: string[] = [];

    for (const line of lines) {
      const testMessage = currentMessage ? `${currentMessage}\\n${line}` : line;

      if (testMessage.length > MAX_MESSAGE_LENGTH) {
        // 현재 메시지를 저장하고 새 메시지 시작
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = line;
      } else {
        currentMessage = testMessage;
      }
    }

    // 마지막 메시지 추가
    if (currentMessage) {
      messages.push(currentMessage);
    }

    // 메시지 전송 (500ms 텀)
    for (let i = 0; i < messages.length; i++) {
      await socket.message(messages[i]);

      // 마지막 메시지가 아니면 500ms 대기
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleKeepCommand:', error?.message);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('킵', 'error_failed', variables, '킵 목록 조회 중 오류가 발생했습니다.')
      : '킵 목록 조회 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

/**
 * !사용 [숫자] - 킵 아이템 사용
 */
export async function handleUseCommand(
  args: string[],
  context: CommandContext,
  rouletteManager: RouletteManager,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  if (args.length === 0) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('사용', 'error_usage', variables, '사용법: !사용 [숫자]')
      : '사용법: !사용 [숫자]';
    await socket.message(message);
    return;
  }

  try {
    const itemNumber = parseInt(args[0]);
    if (isNaN(itemNumber) || itemNumber < 1) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('사용', 'error_invalid_number', variables, '올바른 숫자를 입력해주세요.')
        : '올바른 숫자를 입력해주세요.';
      await socket.message(message);
      return;
    }

    const itemIndex = itemNumber - 1;
    const item = await rouletteManager.useKeepItem(user.id, itemIndex);

    if (!item) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('사용', 'error_failed', variables, '아이템 사용에 실패했습니다. 킵 목록을 확인해주세요.')
        : '아이템 사용에 실패했습니다. 킵 목록을 확인해주세요.';
      await socket.message(message);
      return;
    }

    const successVars = { ...variables, item_label: item.label };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('사용', 'success', successVars, `${user.nickname}님이 ${item.label}을(를) 사용했습니다.`)
      : `${user.nickname}님이 ${item.label}을(를) 사용했습니다.`;
    await socket.message(message);
  } catch (error: any) {
    console.error('[RouletteCommand] Error in handleUseCommand:', error?.message);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('사용', 'error_exception', variables, '아이템 사용 중 오류가 발생했습니다.')
      : '아이템 사용 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

/**
 * !룰렛 지급 [템플릿 번호] [고유닉] [갯수] - DJ 전용, 특정 유저에게 룰렛 티켓 지급
 * !룰렛 지급 [템플릿 번호] 전체 [갯수] - DJ 전용, 현재 방에 있는 등록된 청취자에게 룰렛 티켓 지급
 */
export async function handleGiveRouletteTickets(
  args: string[],
  context: CommandContext & { liveId: number },
  rouletteManager: RouletteManager,
  commandTemplateManager?: any
): Promise<void> {
  const { user, socket, liveId } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  // DJ만 사용 가능 (매니저 제외)
  if (!user.is_dj) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛지급', 'error_not_admin', variables, '❌ 이 명령어는 DJ만 사용할 수 있습니다.')
      : '❌ 이 명령어는 DJ만 사용할 수 있습니다.';
    await socket.message(message);
    return;
  }

  // args: [템플릿 번호] [고유닉 또는 전체] [갯수]
  if (args.length < 3) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛지급', 'error_usage', variables, '❌ 사용법: !룰렛 지급 [템플릿 번호] [고유닉] [갯수] 또는 !룰렛 지급 [템플릿 번호] 전체 [갯수]')
      : '❌ 사용법: !룰렛 지급 [템플릿 번호] [고유닉] [갯수] 또는 !룰렛 지급 [템플릿 번호] 전체 [갯수]';
    await socket.message(message);
    return;
  }

  const templateNumber = parseInt(args[0]);
  const target = args[1];
  const count = parseInt(args[2]);

  // 템플릿 번호 유효성 검사
  if (isNaN(templateNumber)) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛지급', 'error_invalid_template', variables, '❌ 올바른 템플릿 번호를 입력해주세요.')
      : '❌ 올바른 템플릿 번호를 입력해주세요.';
    await socket.message(message);
    return;
  }

  const templates = rouletteManager.getAllTemplates();
  if (templateNumber < 1 || templateNumber > templates.length) {
    const vars = { ...variables, max: templates.length };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛지급', 'error_template_range', vars, `❌ 템플릿 번호는 1부터 ${templates.length}까지 입니다.`)
      : `❌ 템플릿 번호는 1부터 ${templates.length}까지 입니다.`;
    await socket.message(message);
    return;
  }

  const template = templates[templateNumber - 1];

  // 갯수 유효성 검사
  if (isNaN(count) || count <= 0) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛지급', 'error_invalid_count', variables, '❌ 갯수는 1 이상의 숫자여야 합니다.')
      : '❌ 갯수는 1 이상의 숫자여야 합니다.';
    await socket.message(message);
    return;
  }

  try {
    // 전체 지급 (현재 방에 있는 등록된 청취자만)
    if (target === '전체') {
      // 1. 현재 방의 모든 청취자 가져오기
      const listeners = await getAllListeners(liveId);
      console.log(`[!룰렛 지급 전체] Found ${listeners.length} listeners in the room`);

      // 2. 등록된 사용자 목록 가져오기
      const response = await fetch(`stp://${DOMAIN}/fanscore/ranking`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const registeredUsers: FanscoreUser[] = await response.json();
      const registeredUserIds = new Set(registeredUsers.map(u => u.user_id));

      // 3. 방에 있는 청취자 중 등록된 사용자만 필터링
      const targetUsers = listeners.filter(listener => registeredUserIds.has(listener.id));

      if (targetUsers.length === 0) {
        const message = commandTemplateManager
          ? commandTemplateManager.getMessage('룰렛지급', 'error_no_listeners', variables, '⚠️ 현재 방에 등록된 청취자가 없습니다.')
          : '⚠️ 현재 방에 등록된 청취자가 없습니다.';
        await socket.message(message);
        return;
      }

      // 4. 필터링된 유저들에게 룰렛 티켓 지급
      for (const listener of targetUsers) {
        await rouletteManager.giveTickets(
          listener.id,
          listener.nickname,
          listener.tag || listener.nickname,
          template.template_id,
          count
        );
      }

      const successVars = { ...variables, user_count: targetUsers.length, count, template_name: template.name };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛지급', 'success_all', successVars, `✅ 현재 방에 있는 ${targetUsers.length}명에게 ${template.name} 룰렛 티켓 ${count}장씩 지급했습니다.`)
        : `✅ 현재 방에 있는 ${targetUsers.length}명에게 ${template.name} 룰렛 티켓 ${count}장씩 지급했습니다.`;
      await socket.message(message);
      console.log(`[!룰렛 지급 전체] ${user.nickname} gave ${count} ${template.name} tickets to ${targetUsers.length} users`);
      return;
    }

    // 특정 유저 지급
    const targetTag = target;

    const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user-by-tag/${encodeURIComponent(targetTag)}`);

    if (userResponse.status === 404) {
      const vars = { ...variables, target_tag: targetTag };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('룰렛지급', 'error_user_not_found', vars, `⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`)
        : `⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`;
      await socket.message(message);
      return;
    }

    const targetUser: FanscoreUser = await userResponse.json();

    // 룰렛 티켓 지급
    await rouletteManager.giveTickets(
      targetUser.user_id,
      targetUser.nickname,
      targetUser.tag,
      template.template_id,
      count
    );

    const successVars = { ...variables, target_nickname: targetUser.nickname, count, template_name: template.name };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛지급', 'success', successVars, `✅ ${targetUser.nickname}님에게 ${template.name} 룰렛 티켓 ${count}장을 지급했습니다.`)
      : `✅ ${targetUser.nickname}님에게 ${template.name} 룰렛 티켓 ${count}장을 지급했습니다.`;
    await socket.message(message);
    console.log(`[!룰렛 지급] ${user.nickname} gave ${count} ${template.name} tickets to ${targetUser.nickname}`);
  } catch (error) {
    console.error('[!룰렛 지급] Error:', error);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('룰렛지급', 'error_failed', variables, '❌ 룰렛 티켓 지급에 실패했습니다.')
      : '❌ 룰렛 티켓 지급에 실패했습니다.';
    await socket.message(message);
  }
}
