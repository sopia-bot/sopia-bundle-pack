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
  commandTemplateManager?: any
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

    const variables = {
      nickname: user.nickname,
      tag: user.tag || user.nickname
    };

    if (response.status === 409) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('내정보_생성', 'error_already_exists', variables, '⚠️ 이미 등록된 사용자입니다.')
        : '⚠️ 이미 등록된 사용자입니다.';
      await socket.message(message);
      return;
    }

    if (response.ok) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('내정보_생성', 'success', variables, '✅ 애청지수 시스템에 등록되었습니다!')
        : '✅ 애청지수 시스템에 등록되었습니다!';
      await socket.message(message);
      console.log(`[!내정보 생성] ${user.nickname}(${user.id}) registered`);
    } else {
      throw new Error('Failed to create profile');
    }
  } catch (error) {
    console.error('[!내정보 생성] Error:', error);
    const variables = { nickname: user.nickname, tag: user.tag || user.nickname };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('내정보_생성', 'error_failed', variables, '❌ 등록에 실패했습니다.')
      : '❌ 등록에 실패했습니다.';
    await socket.message(message);
  }
}

/**
 * !내정보 삭제 - 애청지수 시스템 탈퇴
 */
export async function handleDeleteProfile(
  args: string[],
  context: { user: User; socket: LiveSocket },
  commandTemplateManager?: any
): Promise<void> {
  const { user, socket } = context;

  try {
    const response = await fetch(`stp://${DOMAIN}/fanscore/user/${user.id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: ['fanscore']  // fanscore만 삭제, 룰렛 데이터는 유지
      })
    });

    const variables = {
      nickname: user.nickname,
      tag: user.tag || user.nickname
    };

    if (response.status === 404) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('내정보_삭제', 'error_not_found', variables, '⚠️ 등록되지 않은 사용자입니다.')
        : '⚠️ 등록되지 않은 사용자입니다.';
      await socket.message(message);
      return;
    }

    if (response.ok) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('내정보_삭제', 'success', variables, '✅ 애청지수 시스템에서 탈퇴되었습니다.')
        : '✅ 애청지수 시스템에서 탈퇴되었습니다.';
      await socket.message(message);
      console.log(`[!내정보 삭제] ${user.nickname}(${user.id}) deleted`);
    } else {
      throw new Error('Failed to delete profile');
    }
  } catch (error) {
    console.error('[!내정보 삭제] Error:', error);
    const variables = { nickname: user.nickname, tag: user.tag || user.nickname };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('내정보_삭제', 'error_failed', variables, '❌ 탈퇴에 실패했습니다.')
      : '❌ 탈퇴에 실패했습니다.';
    await socket.message(message);
  }
}

/**
 * !내정보 - 본인 정보 조회
 */
export async function handleViewProfile(
  args: string[],
  context: { user: User; socket: LiveSocket },
  fanscoreManager: FanscoreManager,
  commandTemplateManager?: any
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
    
    // 템플릿 변수 준비
    const variables = {
      nickname: profile.nickname.replace(/‮/g, ''),
      rank: profile.rank,
      score: profile.exp,
      level: progress,
      chat_count: profile.chat_count,
      like_count: profile.like_count,
      spoon_count: profile.spoon_count,
      roulette_tickets: rouletteTicketCount,
      lottery_tickets: profile.lottery_tickets
    };

    // 기본 메시지 (하위 호환성)
    const defaultMessage = 
      `📊 ${profile.nickname.replace(/‮/g, '')}님의 정보\\n\\n` +
      `🏆 순위: ${profile.rank}위\\n` +
      `⭐ 레벨: Lv.${progress}\\n` +
      `💬 채팅: ${profile.chat_count}회\\n` +
      `❤️ 좋아요: ${profile.like_count}회\\n` +
      `🥄 스푼: ${profile.spoon_count}개\\n` +
      `🎟️ 룰렛: ${rouletteTicketCount}장\\n` +
      `🎫 복권: ${profile.lottery_tickets}장`;

    // 템플릿 사용 (없으면 기본 메시지)
    const message = commandTemplateManager 
      ? commandTemplateManager.getMessage('내정보', 'template', variables, defaultMessage)
      : defaultMessage;

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
  fanscoreManager: FanscoreManager,
  commandTemplateManager?: any
): Promise<void> {
  const { user, socket, isAdmin } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  if (!isAdmin) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('상점', 'error_not_admin', variables, '❌ 이 명령어는 DJ만 사용할 수 있습니다.')
      : '❌ 이 명령어는 DJ만 사용할 수 있습니다.';
    await socket.message(message);
    return;
  }

  if (args.length < 2) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('상점', 'error_usage', variables, '❌ 사용법: !상점 [고유닉] [점수]')
      : '❌ 사용법: !상점 [고유닉] [점수]';
    await socket.message(message);
    return;
  }

  const targetTag = args[0];
  const scoreToAdd = parseInt(args[1]);

  if (isNaN(scoreToAdd) || scoreToAdd <= 0) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('상점', 'error_invalid_score', variables, '❌ 점수는 1 이상의 숫자여야 합니다.')
      : '❌ 점수는 1 이상의 숫자여야 합니다.';
    await socket.message(message);
    return;
  }

  try {
    // 고유닉으로 사용자 찾기
    const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user-by-tag/${encodeURIComponent(targetTag)}`);
    
    if (userResponse.status === 404) {
      const vars = { ...variables, target_tag: targetTag };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('상점', 'error_user_not_found', vars, `⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`)
        : `⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`;
      await socket.message(message);
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
      const vars = { ...variables, target_tag: targetTag };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('상점', 'error_not_registered', vars, `⚠️ "${targetTag}" 사용자가 등록되어 있지 않습니다.`)
        : `⚠️ "${targetTag}" 사용자가 등록되어 있지 않습니다.`;
      await socket.message(message);
      return;
    }
    fanscoreManager.addExpDirect(userData as User, scoreToAdd);

    const successVars = { ...variables, target_nickname: targetUser.nickname, score: scoreToAdd };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('상점', 'success', successVars, `✅ ${targetUser.nickname}님에게 ${scoreToAdd}점을 부여했습니다.`)
      : `✅ ${targetUser.nickname}님에게 ${scoreToAdd}점을 부여했습니다.`;
    await socket.message(message);
    console.log(`[!상점] ${user.nickname} gave ${scoreToAdd} points to ${targetUser.nickname}`);
  } catch (error) {
    console.error('[!상점] Error:', error);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('상점', 'error_failed', variables, '❌ 점수 부여에 실패했습니다.')
      : '❌ 점수 부여에 실패했습니다.';
    await socket.message(message);
  }
}

/**
 * !감점 [고유닉] [점수] - DJ 전용, 점수 감소
 */
export async function handleSubtractScore(
  args: string[],
  context: { user: User; socket: LiveSocket; isAdmin: boolean },
  fanscoreManager: FanscoreManager,
  commandTemplateManager?: any
): Promise<void> {
  const { user, socket, isAdmin } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  if (!isAdmin) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('감점', 'error_not_admin', variables, '❌ 이 명령어는 DJ만 사용할 수 있습니다.')
      : '❌ 이 명령어는 DJ만 사용할 수 있습니다.';
    await socket.message(message);
    return;
  }

  if (args.length < 2) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('감점', 'error_usage', variables, '❌ 사용법: !감점 [고유닉] [점수]')
      : '❌ 사용법: !감점 [고유닉] [점수]';
    await socket.message(message);
    return;
  }

  const targetTag = args[0];
  const scoreToSubtract = parseInt(args[1]);

  if (isNaN(scoreToSubtract) || scoreToSubtract <= 0) {
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('감점', 'error_invalid_score', variables, '❌ 점수는 1 이상의 숫자여야 합니다.')
      : '❌ 점수는 1 이상의 숫자여야 합니다.';
    await socket.message(message);
    return;
  }

  try {
    // 고유닉으로 사용자 찾기
    const userResponse = await fetch(`stp://${DOMAIN}/fanscore/user-by-tag/${encodeURIComponent(targetTag)}`);
    
    if (userResponse.status === 404) {
      const vars = { ...variables, target_tag: targetTag };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('감점', 'error_user_not_found', vars, `⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`)
        : `⚠️ "${targetTag}" 사용자를 찾을 수 없습니다.`;
      await socket.message(message);
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
      const vars = { ...variables, target_tag: targetTag };
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('감점', 'error_not_registered', vars, `⚠️ "${targetTag}" 사용자가 등록되어 있지 않습니다.`)
        : `⚠️ "${targetTag}" 사용자가 등록되어 있지 않습니다.`;
      await socket.message(message);
      return;
    }
    fanscoreManager.addExpDirect(userData as User, -scoreToSubtract);

    const successVars = { ...variables, target_nickname: targetUser.nickname, score: scoreToSubtract };
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('감점', 'success', successVars, `✅ ${targetUser.nickname}님의 점수를 ${scoreToSubtract}점 감소했습니다.`)
      : `✅ ${targetUser.nickname}님의 점수를 ${scoreToSubtract}점 감소했습니다.`;
    await socket.message(message);
    console.log(`[!감점] ${user.nickname} subtracted ${scoreToSubtract} points from ${targetUser.nickname}`);
  } catch (error) {
    console.error('[!감점] Error:', error);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('감점', 'error_failed', variables, '❌ 점수 감소에 실패했습니다.')
      : '❌ 점수 감소에 실패했습니다.';
    await socket.message(message);
  }
}

/**
 * !랭크 - 상위 5명 랭킹 및 채팅/하트왕 표시
 */
export async function handleRanking(
  args: string[],
  context: { user: User; socket: LiveSocket },
  commandTemplateManager?: any
): Promise<void> {
  const { user, socket } = context;

  const variables = {
    nickname: user.nickname,
    tag: user.tag || user.nickname
  };

  try {
    const response = await fetch(`stp://${DOMAIN}/fanscore/ranking`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch ranking');
    }

    const ranking: FanscoreUser[] = await response.json();
    
    if (ranking.length === 0) {
      const message = commandTemplateManager
        ? commandTemplateManager.getMessage('랭크', 'error_no_users', variables, '⚠️ 아직 등록된 사용자가 없습니다.')
        : '⚠️ 아직 등록된 사용자가 없습니다.';
      await socket.message(message);
      return;
    }

    // 상위 5명
    const top5 = ranking.slice(0, 5);
    
    // 채팅왕, 하트왕 찾기
    const chatKing = [...ranking].sort((a, b) => b.chat_count - a.chat_count)[0];
    const likeKing = [...ranking].sort((a, b) => b.like_count - a.like_count)[0];

    // 템플릿 변수 준비
    const templateVars: any = { ...variables };
    top5.forEach((rankUser, index) => {
      const levelInfo = calculateLevel(rankUser.exp);
      const progress = (rankUser.level + (levelInfo.currentExp / levelInfo.requiredExp)).toFixed(2);
      templateVars[`rank_${index + 1}_nickname`] = rankUser.nickname.replace(/‮/g, '');
      templateVars[`rank_${index + 1}_level`] = progress;
    });
    templateVars.chat_king_nickname = chatKing.nickname.replace(/‮/g, '');
    templateVars.chat_king_count = chatKing.chat_count;
    templateVars.like_king_nickname = likeKing.nickname.replace(/‮/g, '');
    templateVars.like_king_count = likeKing.like_count;

    // 기본 메시지 (하위 호환성)
    let defaultMessage = '🏆 애청지수 TOP 5\\n\\n';
    top5.forEach((rankUser, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      const levelInfo = calculateLevel(rankUser.exp);
      const progress = (rankUser.level + (levelInfo.currentExp / levelInfo.requiredExp)).toFixed(2);
      defaultMessage += `${medal} ${rankUser.nickname.replace(/‮/g, '')} - Lv.${progress}\\n`;
    });
    defaultMessage += `\\n💬 채팅왕: ${chatKing.nickname.replace(/‮/g, '')} - (${chatKing.chat_count}회)`;
    defaultMessage += `\\n❤️ 하트왕: ${likeKing.nickname.replace(/‮/g, '')} - (${likeKing.like_count}회)`;

    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('랭크', 'template', templateVars, defaultMessage)
      : defaultMessage;

    await socket.message(message);
    console.log('[!랭크] Ranking displayed');
  } catch (error) {
    console.error('[!랭크] Error:', error);
    const message = commandTemplateManager
      ? commandTemplateManager.getMessage('랭크', 'error_failed', variables, '❌ 랭킹 조회에 실패했습니다.')
      : '❌ 랭킹 조회에 실패했습니다.';
    await socket.message(message);
  }
}

