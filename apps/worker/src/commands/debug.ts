import { LiveSocket, User } from '@sopia-bot/core';
import { FanscoreConfig } from '../types/fanscore';

const DOMAIN = 'starter-pack.sopia.dev';

/**
 * !설정 애청지수 - 현재 애청지수 설정 확인 (디버깅용)
 */
export async function handleShowFanscoreConfig(
  args: string[],
  context: { user: User; socket: LiveSocket }
): Promise<void> {
  if ( context.user.tag !== 'raravel' ) {
    return;
  }
  
  const { socket } = context;

  try {
    const response = await fetch(`stp://${DOMAIN}/fanscore/config`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch config');
    }

    const config: FanscoreConfig = await response.json();

    const message = 
      `⚙️ 애청지수 설정 정보\\n\\n` +
      `📌 시스템 활성화: ${config.enabled ? 'ON ✅' : 'OFF ❌'}\\n\\n` +
      `💯 점수 설정:\\n` +
      `  - 출석: ${config.attendance_score}점\\n` +
      `  - 채팅: ${config.chat_score}점\\n` +
      `  - 좋아요: ${config.like_score}점\\n` +
      `  - 스푼: ${config.spoon_score}점\\n\\n` +
      `🎲 퀴즈:\\n` +
      `  - 활성화: ${config.quiz_enabled ? 'ON ✅' : 'OFF ❌'}\\n` +
      `  - 보너스: ${config.quiz_bonus}점\\n` +
      `  - 실행 간격: ${config.quiz_interval}초\\n` +
      `  - 입력 시간: ${config.quiz_timeout}초\\n\\n` +
      `🎫 복권:\\n` +
      `  - 활성화: ${config.lottery_enabled ? 'ON ✅' : 'OFF ❌'}\\n` +
      `  - 지급 기준: 스푼 ${config.lottery_spoon_required}개당 1장`;

    await socket.message(message);
    console.log('[!설정 애청지수] Config displayed');
  } catch (error) {
    console.error('[!설정 애청지수] Error:', error);
    await socket.message('❌ 설정 조회에 실패했습니다.');
  }
}

