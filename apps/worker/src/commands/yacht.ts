import { LiveSocket, User } from '@sopia-bot/core';
import { YachtManager } from '../managers/yacht-manager';

interface CommandContext {
  user: User;
  socket: LiveSocket;
}

/**
 * !야추 - 현재 상태 확인
 */
export async function handleYachtStatus(
  context: CommandContext,
  yachtManager: YachtManager
): Promise<void> {
  const { socket } = context;
  const config = yachtManager.getConfig();

  const statusText = config.enabled ? '활성화' : '비활성화';
  await socket.message(
    `현재 야추 게임은 [${statusText}] 입니다. 플레이 방법은 \`!야추 설명\`을 참고해주세요.`
  );
}

/**
 * !야추 설명 - 게임 설명
 */
export async function handleYachtGuide(
  context: CommandContext,
  yachtManager: YachtManager
): Promise<void> {
  const { socket } = context;
  const config = yachtManager.getConfig();

  const message = (
    `야추는 보드게임 주사위 Yacht(요트) 게임의 일부를 가져온 주사위 포커 게임입니다.\\n` +
    `주사위 5개를 굴려 높은 족보를 완성하면 됩니다. 한 게임당 다시 굴릴 수 있는 기회는 2번까지 있습니다.\\n\\n` +
    `게임을 시작하기 위해선 [\`!야추 굴리기\`] 명령어를 입력합니다.\\n` +
    `주사위 족보를 결정하려면 [\`!야추 결정\`] 명령어를 입력합니다.\\n\\n` +
    `족보가 결정되면 해당 족보 점수가 승리점수(현재 설정값: ${config.winning_score}점) 보다 높으면 애청지수 포인트를 부여합니다.\\n`
  );

  await socket.message(message);
}

/**
 * !야추 족보 - 족보 설명
 */
export async function handleYachtHands(
  context: CommandContext
): Promise<void> {
  const { socket } = context;

  const message = (
    `탑 - 10점\\n` +
    `원페어 - 20점\\n` +
    `투페어 - 30점\\n` +
    `트리플 - 40점\\n` +
    `포카드 - 50점\\n` +
    `풀 하우스 - 60점\\n` +
    `리틀 스트레이트 - 70점\\n` +
    `빅 스트레이트 - 70점\\n` +
    `야추 - 150점`
  );

  await socket.message(message);
}

/**
 * !야추 굴리기 - 게임 시작 또는 주사위 재굴림
 */
export async function handleYachtRoll(
  args: string[],
  context: CommandContext,
  yachtManager: YachtManager
): Promise<void> {
  const { user, socket } = context;
  const config = yachtManager.getConfig();

  if (!config.enabled) {
    await socket.message('야추 게임이 비활성화되어 있습니다.');
    return;
  }

  // 게임 중이 아닌 경우 (새로운 게임 시작)
  if (args.length === 0) {
    const existingGame = yachtManager.getGameState(user.id);
    if (existingGame) {
      await socket.message('이미 게임을 진행중입니다.');
      return;
    }

    // 쿨타임 확인
    if (!yachtManager.canPlayGame(user.id)) {
      const remaining = yachtManager.getRemainingCooldown(user.id);
      await socket.message(`게임 간격 쿨타임이 남아있습니다. (${remaining}초)`);
      return;
    }

    // 새로운 게임 시작
    const gameState = yachtManager.startGame(user);
    const result = yachtManager.formatGameResult(gameState);
    await socket.message(result);
    return;
  }

  // 게임이 진행중이지 않은 경우
  const gameState = yachtManager.getGameState(user.id);
  if (!gameState) {
    await socket.message('진행 중인 게임이 없습니다. 먼저 \`!야추 굴리기\`를 입력하세요.');
    return;
  }

  // 주사위 재굴림 처리
  let diceIndices: number[] = [];

  if (args[0] === '전체') {
    diceIndices = [1, 2, 3, 4, 5];
  } else {
    // 여러 숫자 파싱
    diceIndices = args
      .map(arg => parseInt(arg))
      .filter(num => !isNaN(num));
  }

  if (diceIndices.length === 0 || diceIndices.length > 5) {
    await socket.message('올바른 주사위 번호를 입력해주세요. (1-5)');
    return;
  }

  const rerolledState = yachtManager.rerollDice(user.id, diceIndices);
  if (!rerolledState) {
    await socket.message('더 이상 주사위를 굴릴 수 없습니다.');
    return;
  }

  const result = yachtManager.formatGameResult(rerolledState);

  await socket.message(result);

  if ( rerolledState.rollsRemaining === 0) {
    await handleYachtDecide(context, yachtManager);
  }
}

/**
 * !야추 결정 - 게임 종료
 */
export async function handleYachtDecide(
  context: CommandContext,
  yachtManager: YachtManager
): Promise<void> {
  const { user, socket } = context;

  const gameState = yachtManager.getGameState(user.id);
  if (!gameState) {
    await socket.message('진행 중인 게임이 없습니다.');
    return;
  }

  const result = yachtManager.endGame(user);
  if (!result) {
    await socket.message('게임 종료 처리 중 오류가 발생했습니다.');
    return;
  }

  const handName = yachtManager.getHandName(result.hand);
  let message = `[${user.nickname}님 게임 결과]\\n${handName} - ${result.score}점`;

  if (result.points > 0) {
    message += `\\n축하합니다! 승리점수를 달성했습니다.\\n+${result.points.toLocaleString()} 애청지수`;
  } else {
    message += `\\n승리점수에 도달하지 못했습니다.`;
  }

  await socket.message(message);
}
