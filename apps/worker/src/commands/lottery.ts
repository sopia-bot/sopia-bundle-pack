import { LiveSocket, User } from '@sopia-bot/core';
import { LotteryManager } from '../managers/lottery-manager';
import { FanscoreUser } from '../types/fanscore';

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
  let res = req.res;
  members = members.concat(req.res.results);
  while (res.next) {
    res = await req.next();
    members = members.concat(res.results);
  }
  return members;
}

/**
 * !복권 [숫자1] [숫자2] [숫자3] - 복권 실행
 * !복권 자동 - 자동 복권
 */
export async function handleLottery(
  args: string[],
  context: { user: User; socket: LiveSocket },
  lotteryManager: LotteryManager
): Promise<void> {
  const { user, socket } = context;

  if (args.length === 0) {
    await socket.message('❌ 사용법: !복권 [숫자1] [숫자2] [숫자3] 또는 !복권 자동');
    return;
  }

  // 자동 복권
  if (args[0] === '자동') {
    const result = await lotteryManager.playAuto(user.id);
    
    if (!result.success) {
      await socket.message(`❌ ${result.message}`);
      return;
    }

    await socket.message(result.message);
    console.log(`[!복권 자동] ${user.nickname}(${user.id}) played ${result.totalPlayed} tickets, got ${result.totalReward} points`);
    return;
  }

  // 일반 복권
  if (args.length < 3) {
    await socket.message('❌ 사용법: !복권 [숫자1] [숫자2] [숫자3] (0~9 사이의 숫자)');
    return;
  }

  const numbers = args.slice(0, 3).map(arg => parseInt(arg));

  // 숫자 유효성 검사
  if (numbers.some(n => isNaN(n) || n < 0 || n > 9)) {
    await socket.message('❌ 숫자는 0~9 사이여야 합니다.');
    return;
  }

  // 중복 검사
  if (new Set(numbers).size !== 3) {
    await socket.message('❌ 중복되지 않은 3개의 숫자를 입력해주세요.');
    return;
  }

  // 복권 실행
  const result = await lotteryManager.playSingle(user.id, numbers);

  if (!result.success) {
    await socket.message(`❌ ${result.message}`);
    return;
  }

  await socket.message(result.message);
  console.log(`[!복권] ${user.nickname}(${user.id}) played with ${numbers.join(',')}, got ${result.reward} points`);
}

/**
 * !복권지급 전체 [갯수] - DJ 전용, 현재 방에 있는 등록된 청취자에게 복권 지급
 * !복권지급 [고유닉] [갯수] - DJ 전용, 특정 유저에게 복권 지급
 */
export async function handleGiveLottery(
  args: string[],
  context: { user: User; socket: LiveSocket; isAdmin: boolean; liveId: number }
): Promise<void> {
  const { user, socket, isAdmin, liveId } = context;

  if (!isAdmin) {
    await socket.message('❌ 이 명령어는 DJ만 사용할 수 있습니다.');
    return;
  }

  if (args.length < 2) {
    await socket.message('❌ 사용법: !복권지급 전체 [갯수] 또는 !복권지급 [고유닉] [갯수]');
    return;
  }

  const target = args[0];
  const count = parseInt(args[1]);

  if (isNaN(count) || count <= 0) {
    await socket.message('❌ 갯수는 1 이상의 숫자여야 합니다.');
    return;
  }

  try {
    // 전체 지급 (현재 방에 있는 등록된 청취자만)
    if (target === '전체') {
      // 1. 현재 방의 모든 청취자 가져오기
      const listeners = await getAllListeners(liveId);
      console.log(`[!복권지급 전체] Found ${listeners.length} listeners in the room`);

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
        await socket.message('⚠️ 현재 방에 등록된 청취자가 없습니다.');
        return;
      }

      // 4. 필터링된 유저들에게 복권 지급
      const promises = targetUsers.map(listener =>
        fetch(`stp://${DOMAIN}/fanscore/user/${listener.id}/lottery`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ change: count })
        })
      );

      await Promise.all(promises);
      
      await socket.message(`✅ 현재 방에 있는 ${targetUsers.length}명에게 복권 ${count}장씩 지급했습니다.`);
      console.log(`[!복권지급 전체] ${user.nickname} gave ${count} lottery tickets to ${targetUsers.length} users in the room`);
      return;
    }

    // 특정 유저 지급
    const targetTag = target;
    
    const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user-by-tag/${encodeURIComponent(targetTag)}`);
    
    if (userResponse.status === 404) {
      await socket.message(`⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`);
      return;
    }

    const targetUser: FanscoreUser = await userResponse.json();

    // 복권 지급
    await fetch(`stp://${DOMAIN}/fanscore/user/${targetUser.user_id}/lottery`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: count })
    });

    await socket.message(`✅ ${targetUser.nickname}님에게 복권 ${count}장을 지급했습니다.`);
    console.log(`[!복권지급] ${user.nickname} gave ${count} lottery tickets to ${targetUser.nickname}`);
  } catch (error) {
    console.error('[!복권지급] Error:', error);
    await socket.message('❌ 복권 지급에 실패했습니다.');
  }
}

/**
 * !복권양도 [고유닉] [수량] - 복권 양도
 */
export async function handleTransferLottery(
  args: string[],
  context: { user: User; socket: LiveSocket }
): Promise<void> {
  const { user, socket } = context;

  if (args.length < 2) {
    await socket.message('❌ 사용법: !복권양도 [고유닉] [수량]');
    return;
  }

  const targetTag = args[0];
  const count = parseInt(args[1]);

  if (isNaN(count) || count <= 0) {
    await socket.message('❌ 수량은 1 이상의 숫자여야 합니다.');
    return;
  }

  try {
    // 본인 정보 확인
    const myResponse = await fetch(`stp://${DOMAIN}/fanscore/user/${user.id}`);
    
    if (myResponse.status === 404) {
      await socket.message('⚠️ 등록되지 않은 사용자입니다. "!내정보 생성"으로 등록해주세요.');
      return;
    }

    const myProfile: FanscoreUser = await myResponse.json();

    // 보유 복권 확인
    if (myProfile.lottery_tickets < count) {
      await socket.message(`❌ 복권이 부족합니다. (보유: ${myProfile.lottery_tickets}장, 필요: ${count}장)`);
      return;
    }

    // 대상 사용자 찾기
    const targetResponse = await fetch(`stp://${DOMAIN}/fanscore/user-by-tag/${encodeURIComponent(targetTag)}`);
    
    if (targetResponse.status === 404) {
      await socket.message(`⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`);
      return;
    }

    const targetUser: FanscoreUser = await targetResponse.json();

    // 자기 자신에게 양도 방지
    if (targetUser.user_id === user.id) {
      await socket.message('❌ 자기 자신에게는 양도할 수 없습니다.');
      return;
    }

    // 복권 차감
    await fetch(`stp://${DOMAIN}/fanscore/user/${user.id}/lottery`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: -count })
    });

    // 복권 지급
    await fetch(`stp://${DOMAIN}/fanscore/user/${targetUser.user_id}/lottery`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ change: count })
    });

    await socket.message(`✅ ${targetUser.nickname}님에게 복권 ${count}장을 양도했습니다.`);
    console.log(`[!복권양도] ${user.nickname} transferred ${count} lottery tickets to ${targetUser.nickname}`);
  } catch (error) {
    console.error('[!복권양도] Error:', error);
    await socket.message('❌ 복권 양도에 실패했습니다.');
  }
}

