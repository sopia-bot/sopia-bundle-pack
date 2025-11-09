// apps/worker/src/commands/user.ts

import type { CommandContext } from '../utils/command-parser';

/**
 * !고유닉 - 사용자의 고유닉(tag) 표시
 */
export async function handleShowTag(
  args: string[],
  context: CommandContext,
  commandTemplateManager?: any
): Promise<void> {
  const { socket, user } = context;

  try {
    const variables = {
      nickname: user.nickname,
      tag: user.tag || user.nickname
    };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('고유닉', 'template', variables, `${user.nickname}님의 고유닉: ${user.tag}`)
      : `${user.nickname}님의 고유닉: ${user.tag}`;
    await socket.message(message);
  } catch (error: any) {
    console.error('[UserCommand] Error in handleShowTag:', error?.message);
    const variables = { nickname: user.nickname, tag: user.tag || user.nickname };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('고유닉', 'error_failed', variables, '고유닉 조회 중 오류가 발생했습니다.')
      : '고유닉 조회 중 오류가 발생했습니다.';
    await socket.message(message);
  }
}

