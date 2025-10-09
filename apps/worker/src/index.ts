// @ts-ignore
import { LiveMessageSocket, LivePresentSocket, LiveLikeSocket, LiveSocket, LiveUpdateSocket, User } from '@sopia-bot/core';
import { parseCommand, CommandRegistry } from './utils/command-parser';
import { handleShieldCommand } from './commands/shield';
import { handleCreateProfile, handleDeleteProfile, handleViewProfile, handleAddScore, handleSubtractScore, handleRanking } from './commands/fanscore';
import { handleLottery, handleGiveLottery, handleTransferLottery } from './commands/lottery';
import { handleShowFanscoreConfig } from './commands/debug';
import { FanscoreManager } from './managers/fanscore-manager';
import { QuizManager } from './managers/quiz-manager';
import { FanscoreConfig } from './types/fanscore';

const { ipcRenderer } = window.require('electron');

// 방송 관리자 저장
let managerIdList: number[] = []

// 방송 관리자 여부 확인
function isAdmin(author: User) {
    if (managerIdList.includes(author.id)) {
        return true;
    }
    return author.is_dj;
}

// 매니저 초기화
const fanscoreManager = new FanscoreManager();
let config: FanscoreConfig | null = null;
fanscoreManager.loadConfig().then((config_) => {
    config = config_;
});

// 퀴즈 매니저 초기화
const quizManager = new QuizManager();
quizManager.initialize();

// 명령어 레지스트리 초기화
const commandRegistry = new CommandRegistry();

// 실드 명령어
commandRegistry.register('실드', handleShieldCommand);

// 애청지수 명령어
commandRegistry.register('내정보', async (args, context) => {
    if (args.length === 0) {
        await handleViewProfile(args, context);
    } else if (args[0] === '생성') {
        await handleCreateProfile(args.slice(1), context);
    } else if (args[0] === '삭제') {
        await handleDeleteProfile(args.slice(1), context);
    } else {
        await handleViewProfile(args, context);
    }
});
commandRegistry.register('상점', handleAddScore);
commandRegistry.register('감점', handleSubtractScore);
commandRegistry.register('랭크', handleRanking);

// 복권 명령어
commandRegistry.register('복권', handleLottery);
commandRegistry.register('복권지급', handleGiveLottery);
commandRegistry.register('복권양도', handleTransferLottery);

// 디버깅 명령어
commandRegistry.register('설정', async (args, context) => {
    if (args.length > 0 && args[0] === '애청지수') {
        await handleShowFanscoreConfig(args.slice(1), context);
    }
});

// 라이브 메시지 핸들러
async function liveMessage(evt: LiveMessageSocket, socket: LiveSocket): Promise<void> {
    const message = evt.update_component.message.value.trim();
    const user = evt.data.user;
    
    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(user.id);

    if (isRegistered) {
        // 출석 체크
        const attended = await fanscoreManager.checkAttendance(user.id);
        if ( attended ) {
            await socket.message(`🎉 ${user.nickname}님이 출석했습니다! (+${config?.attendance_score}점)`);
        }
        
        // 채팅 점수 추가
        fanscoreManager.addChatScore(user.id);

        // 퀴즈 정답 체크
        if (quizManager.checkAnswer(message)) {
            // 퀴즈 보너스 지급
            const config = await fanscoreManager.loadConfig();
            if (config.quiz_bonus > 0) {
                // 즉시 점수 업데이트
                const userResponse = await fetch(`stp://starter-pack.sopia.dev/fanscore/user/${user.id}`);
                const userData = await userResponse.json();
                const newExp = userData.exp + config.quiz_bonus;
                const newScore = userData.score + config.quiz_bonus;
                
                await fetch(`stp://starter-pack.sopia.dev/fanscore/user/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ exp: newExp, score: newScore })
                });

                await socket.message(`🎉 ${user.nickname}님이 퀴즈 정답을 맞췄습니다! (+${config.quiz_bonus}점)`);
            }
        }
    }

    // 명령어 파싱
    const parsed = parseCommand(message);
    if (parsed) {
        try {
            // 명령어 실행
            const executed = await commandRegistry.execute(parsed.command, parsed.args, {
                user,
                socket,
                isAdmin: isAdmin(user),
            });
            
            if (!executed) {
                console.log(`[명령어] 알 수 없는 명령어: ${parsed.command}`);
            }
        } catch (error) {
            console.error(`[명령어] 실행 중 오류 발생:`, error);
        }
    }
}

// 라이브 선물 핸들러
async function livePresent(evt: LivePresentSocket, socket: LiveSocket): Promise<void> {
    const user = evt.data.author;
    const combo = evt.data.combo;
    const amount = evt.data.amount;
    const totalAmount = amount * combo;

    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(user.id);
    
    if (isRegistered) {
        // 스푼 점수 추가
        fanscoreManager.addSpoonScore(user.id, totalAmount);

        // 복권 티켓 지급 조건 확인
        const config = await fanscoreManager.loadConfig();
        if (config.lottery_enabled && config.lottery_spoon_required > 0) {
            const ticketCount = Math.floor(totalAmount / config.lottery_spoon_required);
            if (ticketCount > 0) {
                await fanscoreManager.giveLotteryTickets(user.id, ticketCount, `스푼 ${totalAmount}개 선물`);
                await socket.message(`[복권]\n${user.nickname}님, 복권이 ${ticketCount}개 지급되었습니다.`);
            }
        }
    }
}

// 라이브 좋아요 핸들러
async function liveLike(evt: LiveLikeSocket, socket: LiveSocket): Promise<void> {
    const user = evt.data.author;

    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(user.id);
    
    if (isRegistered) {
        // 좋아요 점수 추가
        fanscoreManager.addLikeScore(user.id);
    }
}

// 라이브 업데이트 핸들러
async function liveUpdate(evt: LiveUpdateSocket, socket: LiveSocket): Promise<void> {
    managerIdList = evt.data.live.manager_ids;
    
    // Live ID 설정
    const live = evt.data.live;
    if (live && live.id) {
        fanscoreManager.setLiveId(live.id);
        console.log(`[LiveUpdate] Live ID set to ${live.id}`);
    }
}

const DOMAIN = 'starter-pack.sopia.dev';
function backgroundListener(event: any, data: { channel: string; data?: any }): void {
    if (!data || !data.channel) return;
    
    switch (data.channel) {
        case 'message':
            break;
        case 'config-updated':
            // 설정이 변경되면 퀴즈 타이머 재시작
            fanscoreManager.loadConfig().then((config_) => {
                quizManager.updateConfig(config_);
                config = config_;
                console.log('[Worker] Config updated and quiz timer restarted');
            });
            break;
        case 'quiz-updated':
            // 퀴즈 목록이 변경되면 새로고침
            quizManager.refreshQuizzes().then(() => {
                console.log('[Worker] Quiz list refreshed');
            });
            break;
    }
}

ipcRenderer.on(DOMAIN, backgroundListener);

// 종료 핸들러
function onAbort(): void {
    ipcRenderer.removeAllListeners(DOMAIN);
    fanscoreManager.destroy();
    quizManager.destroy();
    console.log('애청지수 워커가 종료됩니다.');
}

export default {
    live_message: liveMessage,
    live_present: livePresent,
    live_like: liveLike,
    live_update: liveUpdate,
    onAbort,
}
