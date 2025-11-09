import { LiveSocket, User } from '@sopia-bot/core';

const DOMAIN = 'starter-pack.sopia.dev';

/**
 * 실드 조회 API 호출
 * @returns 실드 데이터
 */
async function getShield(): Promise<any> {
  const response = await fetch(`stp://${DOMAIN}/shield`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Failed to get shield');
  }
  
  return response.json();
}

/**
 * 실드 변경 API 호출
 * @param change 변경량 (+는 증가, -는 감소)
 * @param reason 변경 사유
 * @returns 변경된 실드 데이터
 */
async function changeShield(change: number, reason: string): Promise<any> {
  const response = await fetch(`stp://${DOMAIN}/shield/change`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      change,
      reason,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to change shield');
  }
  
  return response.json();
}

/**
 * 실드 명령어 핸들러
 * !실드 -> 현재 실드 개수 조회 (모든 사용자)
 * !실드 + 10 -> 실드 10개 증가 (관리자만)
 * !실드 - 5 -> 실드 5개 감소 (관리자만)
 */
export async function handleShieldCommand(
  args: string[],
  context: { user: User; socket: LiveSocket; isAdmin: boolean },
  commandTemplateManager?: any
): Promise<void> {
  const { user, socket, isAdmin } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };
  
  // 인자가 없는 경우 - 실드 조회 (모든 사용자 가능)
  if (args.length === 0) {
    try {
      const result = await getShield();
      const vars = { ...variables, shield_count: result.shield_count };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('실드', 'template', vars, `🛡️ 현재 실드: ${result.shield_count}개`)
        : `🛡️ 현재 실드: ${result.shield_count}개`;
      await socket.message(message);
      console.log(`[실드 조회] ${user.nickname}(${user.id})가 실드 조회 (현재: ${result.shield_count}개)`);
    } catch (error: any) {
      console.error('[실드 조회] 실패:', error);
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('실드', 'error_failed', variables, '❌ 실드 조회에 실패했습니다. 잠시 후 다시 시도해주세요.')
        : '❌ 실드 조회에 실패했습니다. 잠시 후 다시 시도해주세요.';
      await socket.message(message);
    }
    return;
  }
  
  // 실드 변경은 관리자만 가능
  if (!isAdmin) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('실드_변경', 'error_not_admin', variables, '❌ 실드 관리는 방송 관리자만 사용할 수 있습니다.')
      : '❌ 실드 관리는 방송 관리자만 사용할 수 있습니다.';
    // await socket.message(message); // 주석 처리되어 있었음
    return;
  }
  
  // 인자 개수 확인: !실드 + 10 또는 !실드 - 5
  if (args.length < 2) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('실드_변경', 'error_usage', variables, '❌ 사용법: !실드 + 숫자 또는 !실드 - 숫자')
      : '❌ 사용법: !실드 + 숫자 또는 !실드 - 숫자';
    await socket.message(message);
    return;
  }
  
  const operator = args[0].trim();
  const amountStr = args[1].trim();
  
  // 연산자 확인
  if (operator !== '+' && operator !== '-') {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('실드_변경', 'error_invalid_format', variables, '❌ 올바른 형식이 아닙니다. 예: !실드 + 10 또는 !실드 - 5')
      : '❌ 올바른 형식이 아닙니다. 예: !실드 + 10 또는 !실드 - 5';
    await socket.message(message);
    return;
  }
  
  // 숫자 확인
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('실드_변경', 'error_invalid_number', variables, '❌ 숫자는 1 이상의 양수여야 합니다.')
      : '❌ 숫자는 1 이상의 양수여야 합니다.';
    await socket.message(message);
    return;
  }
  
  const change = operator === '+' ? amount : -amount;
  
  try {
    // 실드 변경 API 호출
    const result = await changeShield(change, `관리자(${user.nickname})가 명령어로 변경`);
    
    // 결과 메시지
    const emoji = change > 0 ? '✅' : '⚠️';
    const action = change > 0 ? '증가' : '감소';
    const vars = {
      ...variables,
      emoji,
      change: Math.abs(change),
      action,
      shield_count: result.shield_count
    };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('실드_변경', 'success', vars, `${emoji} 실드가 ${Math.abs(change)}개 ${action}되었습니다. (현재: ${result.shield_count}개)`)
      : `${emoji} 실드가 ${Math.abs(change)}개 ${action}되었습니다. (현재: ${result.shield_count}개)`;
    await socket.message(message);
    
    console.log(`[실드 명령어] ${user.nickname}(${user.id})가 실드를 ${change > 0 ? '+' : ''}${change}개 변경 (현재: ${result.shield_count}개)`);
  } catch (error: any) {
    console.error('[실드 명령어] 실패:', error);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('실드_변경', 'error_failed', variables, '❌ 실드 변경에 실패했습니다. 잠시 후 다시 시도해주세요.')
      : '❌ 실드 변경에 실패했습니다. 잠시 후 다시 시도해주세요.';
    await socket.message(message);
  }
}

