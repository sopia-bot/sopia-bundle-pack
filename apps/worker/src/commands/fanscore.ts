import { LiveSocket, User } from '@sopia-bot/core';
import { FanscoreUser } from '../types/fanscore';
import { calculateLevel } from '../utils/level-system';
import { FanscoreManager } from '../managers/fanscore-manager';

const DOMAIN = 'starter-pack.sopia.dev';

/**
 * !내정보 생성 - 애청지수 시스템 등록
 */
export async function handleCreateProfile(
  args: string[],
  context: { user: User; socket: LiveSocket },
): Promise<void> {
  const { user, socket } = context;

  try {
    const response = await fetch(`stp://${DOMAIN}/fanscore/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        nickname: user.nickname,
        tag: user.tag || user.nickname
      })
    });

    if (response.status === 409) {
      await socket.message('⚠️ 이미 등록된 사용자입니다.');
      return;
    }

    if (response.ok) {
      await socket.message('✅ 애청지수 시스템에 등록되었습니다!');
      console.log(`[!내정보 생성] ${user.nickname}(${user.id}) registered`);
    } else {
      throw new Error('Failed to create profile');
    }
  } catch (error) {
    console.error('[!내정보 생성] Error:', error);
    await socket.message('❌ 등록에 실패했습니다.');
  }
}

/**
 * !내정보 삭제 - 애청지수 시스템 탈퇴
 */
export async function handleDeleteProfile(
  args: string[],
  context: { user: User; socket: LiveSocket }
): Promise<void> {
  const { user, socket } = context;

  try {
    const response = await fetch(`stp://${DOMAIN}/fanscore/user/${user.id}`, {
      method: 'DELETE'
    });

    if (response.status === 404) {
      await socket.message('⚠️ 등록되지 않은 사용자입니다.');
      return;
    }

    if (response.ok) {
      await socket.message('✅ 애청지수 시스템에서 탈퇴되었습니다.');
      console.log(`[!내정보 삭제] ${user.nickname}(${user.id}) deleted`);
    } else {
      throw new Error('Failed to delete profile');
    }
  } catch (error) {
    console.error('[!내정보 삭제] Error:', error);
    await socket.message('❌ 탈퇴에 실패했습니다.');
  }
}

/**
 * !내정보 - 본인 정보 조회
 */
export async function handleViewProfile(
  args: string[],
  context: { user: User; socket: LiveSocket },
  fanscoreManager: FanscoreManager
): Promise<void> {
  const { user, socket } = context;

  try {
    const profile: FanscoreUser|null = await fanscoreManager.loadUser(user.id);
    if ( profile === null ) {
      await socket.message('⚠️ 등록되지 않은 사용자입니다. "!내정보 생성"으로 등록해주세요.');
      return;
    }
    const levelInfo = calculateLevel(profile.exp);

    // 룰렛 티켓 정보 가져오기
    let rouletteTicketCount = 0;
    try {
      const ticketResponse = await fetch(`stp://${DOMAIN}/roulette/tickets/${user.id}`);
      if (ticketResponse.ok) {
        const ticketData = await ticketResponse.json();
        // tickets 객체의 모든 값을 합산
        if (ticketData.tickets) {
          rouletteTicketCount = Object.values(ticketData.tickets).reduce(
            (sum: number, count: any) => sum + (typeof count === 'number' ? count : 0),
            0
          );
        }
      }
    } catch (error) {
      console.error('[!내정보] Failed to fetch roulette tickets:', error);
      // 룰렛 티켓 조회 실패 시에도 나머지 정보는 표시
    }

    const progress = (profile.level + (levelInfo.currentExp / levelInfo.requiredExp)).toFixed(2);
    const message = 
      `📊 ${profile.nickname.replace(/‮/g, '')}님의 정보\\n\\n` +
      `🏆 순위: ${profile.rank}위\\n` +
      `⭐ 레벨: Lv.${progress}\\n` +
      `💬 채팅: ${profile.chat_count}회\\n` +
      `❤️ 좋아요: ${profile.like_count}회\\n` +
      `🥄 스푼: ${profile.spoon_count}개\\n` +
      `🎟️ 룰렛: ${rouletteTicketCount}장\\n` +
      `🎫 복권: ${profile.lottery_tickets}장`;

    await socket.message(message);
    console.log(`[!내정보] ${user.nickname}(${user.id}) viewed profile`);
  } catch (error) {
    console.error('[!내정보] Error:', error);
    await socket.message('❌ 정보 조회에 실패했습니다.');
  }
}

/**
 * !상점 [고유닉] [점수] - DJ 전용, 점수 부여
 */
export async function handleAddScore(
  args: string[],
  context: { user: User; socket: LiveSocket; isAdmin: boolean },
  fanscoreManager: FanscoreManager
): Promise<void> {
  const { user, socket, isAdmin } = context;

  if (!isAdmin) {
    await socket.message('❌ 이 명령어는 DJ만 사용할 수 있습니다.');
    return;
  }

  if (args.length < 2) {
    await socket.message('❌ 사용법: !상점 [고유닉] [점수]');
    return;
  }

  const targetTag = args[0];
  const scoreToAdd = parseInt(args[1]);

  if (isNaN(scoreToAdd) || scoreToAdd <= 0) {
    await socket.message('❌ 점수는 1 이상의 숫자여야 합니다.');
    return;
  }

  try {
    // 고유닉으로 사용자 찾기
    const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user-by-tag/${encodeURIComponent(targetTag)}`);
    
    if (userResponse.status === 404) {
      await socket.message(`⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`);
      return;
    }

    const targetUser: FanscoreUser = await userResponse.json();

    const userData = {
      id: targetUser.user_id,
      nickname: targetUser.nickname,
      tag: targetUser.tag,
    }
    // FanscoreManager를 통해 배치 업데이트에 추가
    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(targetUser.user_id);
    if (!isRegistered) {
      await socket.message(`⚠️ "${targetTag}" 사용자가 등록되어 있지 않습니다.`);
      return;
    }
    fanscoreManager.addExpDirect(userData as User, scoreToAdd);

    await socket.message(`✅ ${targetUser.nickname}님에게 ${scoreToAdd}점을 부여했습니다.`);
    console.log(`[!상점] ${user.nickname} gave ${scoreToAdd} points to ${targetUser.nickname}`);
  } catch (error) {
    console.error('[!상점] Error:', error);
    await socket.message('❌ 점수 부여에 실패했습니다.');
  }
}

/**
 * !감점 [고유닉] [점수] - DJ 전용, 점수 감소
 */
export async function handleSubtractScore(
  args: string[],
  context: { user: User; socket: LiveSocket; isAdmin: boolean },
  fanscoreManager: FanscoreManager
): Promise<void> {
  const { user, socket, isAdmin } = context;

  if (!isAdmin) {
    await socket.message('❌ 이 명령어는 DJ만 사용할 수 있습니다.');
    return;
  }

  if (args.length < 2) {
    await socket.message('❌ 사용법: !감점 [고유닉] [점수]');
    return;
  }

  const targetTag = args[0];
  const scoreToSubtract = parseInt(args[1]);

  if (isNaN(scoreToSubtract) || scoreToSubtract <= 0) {
    await socket.message('❌ 점수는 1 이상의 숫자여야 합니다.');
    return;
  }

  try {
    // 고유닉으로 사용자 찾기
    const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user-by-tag/${encodeURIComponent(targetTag)}`);
    
    if (userResponse.status === 404) {
      await socket.message(`⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`);
      return;
    }

    const targetUser: FanscoreUser = await userResponse.json();

    const userData = {
      id: targetUser.user_id,
      nickname: targetUser.nickname,
      tag: targetUser.tag,
    }
    // FanscoreManager를 통해 배치 업데이트에 추가 (음수로 차감)
    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(targetUser.user_id);
    if (!isRegistered) {
      await socket.message(`⚠️ "${targetTag}" 사용자가 등록되어 있지 않습니다.`);
      return;
    }
    fanscoreManager.addExpDirect(userData as User, -scoreToSubtract);

    await socket.message(`✅ ${targetUser.nickname}님의 점수를 ${scoreToSubtract}점 감소했습니다.`);
    console.log(`[!감점] ${user.nickname} subtracted ${scoreToSubtract} points from ${targetUser.nickname}`);
  } catch (error) {
    console.error('[!감점] Error:', error);
    await socket.message('❌ 점수 감소에 실패했습니다.');
  }
}

/**
 * !랭크 - 상위 5명 랭킹 및 채팅/하트왕 표시
 */
export async function handleRanking(
  args: string[],
  context: { user: User; socket: LiveSocket }
): Promise<void> {
  const { socket } = context;

  try {
    const response = await fetch(`stp://${DOMAIN}/fanscore/ranking`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch ranking');
    }

    const ranking: FanscoreUser[] = await response.json();
    
    if (ranking.length === 0) {
      await socket.message('⚠️ 아직 등록된 사용자가 없습니다.');
      return;
    }

    // 상위 5명
    const top5 = ranking.slice(0, 5);
    
    // 채팅왕, 하트왕 찾기
    const chatKing = [...ranking].sort((a, b) => b.chat_count - a.chat_count)[0];
    const likeKing = [...ranking].sort((a, b) => b.like_count - a.like_count)[0];

    let message = '🏆 애청지수 TOP 5\\n\\n';
    
    top5.forEach((user, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      // 레벨 진행률 계산 (0~1 사이)
      const levelInfo = calculateLevel(user.exp);
      const progress = (user.level + (levelInfo.currentExp / levelInfo.requiredExp)).toFixed(2);
      message += `${medal} ${user.nickname.replace(/‮/g, '')} - Lv.${progress}\\n`;
    });

    message += `\\n💬 채팅왕: ${chatKing.nickname.replace(/‮/g, '')} - (${chatKing.chat_count}회)`;
    message += `\\n❤️ 하트왕: ${likeKing.nickname.replace(/‮/g, '')} - (${likeKing.like_count}회)`;

    await socket.message(message);
    console.log('[!랭크] Ranking displayed');
  } catch (error) {
    console.error('[!랭크] Error:', error);
    await socket.message('❌ 랭킹 조회에 실패했습니다.');
  }
}

