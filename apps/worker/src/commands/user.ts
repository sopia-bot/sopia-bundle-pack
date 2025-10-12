// apps/worker/src/commands/user.ts

import type { CommandContext } from '../utils/command-parser';

/**
 * !고유닉 - 사용자의 고유닉(tag) 표시
 */
export async function handleShowTag(
  args: string[],
  context: CommandContext
): Promise<void> {
  const { socket, user } = context;

  try {
    await socket.message(`${user.nickname}님의 고유닉: ${user.tag}`);
  } catch (error: any) {
    console.error('[UserCommand] Error in handleShowTag:', error?.message);
    await socket.message('고유닉 조회 중 오류가 발생했습니다.');
  }
}

