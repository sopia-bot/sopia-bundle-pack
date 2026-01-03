// @ts-ignore
import { LiveMessageSocket, LivePresentSocket, LiveLikeSocket, LiveSocket, LiveUpdateSocket, User } from '@sopia-bot/core';
import { parseCommand, CommandRegistry } from './utils/command-parser';
import { handleShieldCommand } from './commands/shield';
import { handleCreateProfile, handleDeleteProfile, handleViewProfile, handleAddScore, handleSubtractScore, handleRanking } from './commands/fanscore';
import { handleLottery, handleGiveLottery, handleTransferLottery } from './commands/lottery';
import { handleRouletteCommand, handleKeepCommand, handleUseCommand } from './commands/roulette';
import { handleShowRouletteConfig, handleShowRouletteItems, handleGiveDebugTicket } from './commands/roulette-debug';
import { handleShowFanscoreConfig } from './commands/debug';
import { handleShowTag } from './commands/user';
import { FanscoreManager } from './managers/fanscore-manager';
import { QuizManager } from './managers/quiz-manager';
import { LotteryManager } from './managers/lottery-manager';
import { RouletteManager } from './managers/roulette-manager';
import { YachtManager } from './managers/yacht-manager';
import { CommandTemplateManager } from './managers/command-template-manager';
import { FanscoreConfig } from './types/fanscore';
import type { RouletteTemplate } from './types/roulette';
import { handleYachtStatus, handleYachtGuide, handleYachtHands, handleYachtRoll, handleYachtDecide } from './commands/yacht';

const { ipcRenderer } = window.require('electron');

// 방송 관리자 저장
let managerIdList: number[] = []

// 현재 방송 ID 저장
let currentLiveId: number = 0;

// DJ 정보 저장
let currentDjInfo: User | null = null;

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

// 설정 로드 재시도 로직
async function loadConfigWithRetry() {
    while (true) {
        try {
            await new Promise((r) => setTimeout(r, 10000));
            const config_ = await fanscoreManager.loadConfig();
            // status: 404 체크
            if (config_ && typeof config_ === 'object' && 'status' in config_ && config_.status === 404) {
                console.log('[Worker] Config not found (404), retrying in 1 second...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            // 정상적인 config인 경우
            config = config_ as FanscoreConfig;
            console.log('[Worker] Config loaded successfully');
            break;
        } catch (error) {
            console.error('[Worker] Failed to load config:', error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

loadConfigWithRetry();
(window as any).fanscoreManager = fanscoreManager;

// 퀴즈 매니저 초기화
const quizManager = new QuizManager();
async function initializeQuizManagerWithRetry() {
    while (true) {
        try {
            await quizManager.initialize();
            console.log('[Worker] Quiz manager initialized successfully');
            break;
        } catch (error) {
            console.error('[Worker] Failed to initialize quiz manager:', error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
initializeQuizManagerWithRetry();

// 복권 매니저 초기화 (fanscoreManager 주입)
const lotteryManager = new LotteryManager(fanscoreManager);

// 룰렛 매니저 초기화 (fanscoreManager 주입)
const rouletteManager = new RouletteManager(fanscoreManager);
async function initializeRouletteManagerWithRetry() {
    while (true) {
        try {
            await rouletteManager.loadTemplates();
            console.log('[Worker] Roulette manager initialized successfully');
            break;
        } catch (error) {
            console.error('[Worker] Failed to initialize roulette manager:', error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
initializeRouletteManagerWithRetry();

// 야추 매니저 초기화
const yachtManager = new YachtManager(fanscoreManager);
async function initializeYachtManagerWithRetry() {
    while (true) {
        try {
            await yachtManager.loadConfig();
            console.log('[Worker] Yacht manager initialized successfully');
            break;
        } catch (error) {
            console.error('[Worker] Failed to initialize yacht manager:', error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
initializeYachtManagerWithRetry();
(window as any).yachtManager = yachtManager;

// 명령어 템플릿 매니저 초기화
const commandTemplateManager = new CommandTemplateManager();
async function initializeCommandTemplateManagerWithRetry() {
    while (true) {
        try {
            await commandTemplateManager.loadTemplates();
            console.log('[Worker] Command template manager initialized successfully');
            break;
        } catch (error) {
            console.error('[Worker] Failed to initialize command template manager:', error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}
initializeCommandTemplateManagerWithRetry();
(window as any).commandTemplateManager = commandTemplateManager;

// 명령어 레지스트리 초기화
const commandRegistry = new CommandRegistry();

// 실드 명령어
commandRegistry.register('실드', (args, context) => handleShieldCommand(args, context, commandTemplateManager));

// 애청지수 명령어
commandRegistry.register('내정보', async (args, context) => {
    // 애청지수 번들이 비활성화되어 있으면 명령어 무시
    console.log('starter_pack: 내정보', args, context, config);
    if (!config || !config.enabled) {
        return;
    }
    if (args.length === 0) {
        await handleViewProfile(args, context, fanscoreManager, commandTemplateManager);
    } else if (args[0] === '생성') {
        await handleCreateProfile(args.slice(1), context, commandTemplateManager);
    } else if (args[0] === '삭제') {
        await handleDeleteProfile(args.slice(1), context, commandTemplateManager);
    } else {
        await handleViewProfile(args, context, fanscoreManager, commandTemplateManager);
    }
});
commandRegistry.register('상점', async (args, context) => {
    if (!config || !config.enabled) return;
    await handleAddScore(args, context, fanscoreManager, commandTemplateManager);
});
commandRegistry.register('감점', async (args, context) => {
    if (!config || !config.enabled) return;
    await handleSubtractScore(args, context, fanscoreManager, commandTemplateManager);
});
commandRegistry.register('랭크', async (args, context) => {
    if (!config || !config.enabled) return;
    await handleRanking(args, context, commandTemplateManager);
});

// 복권 명령어
commandRegistry.register('복권', async (args, context) => {
    if (!config || !config.enabled) return;
    await handleLottery(args, context, lotteryManager, commandTemplateManager);
});
commandRegistry.register('복권지급', async (args, context) => {
    if (!config || !config.enabled) return;
    await handleGiveLottery(args, context as any, fanscoreManager, commandTemplateManager);
});
commandRegistry.register('복권양도', async (args, context) => {
    if (!config || !config.enabled) return;
    await handleTransferLottery(args, context, fanscoreManager, commandTemplateManager);
});

// 룰렛 명령어
commandRegistry.register('룰렛', (args, context) => handleRouletteCommand(args, context, rouletteManager, commandTemplateManager));
commandRegistry.register('킵', (args, context) => handleKeepCommand(args, context, rouletteManager, commandTemplateManager));
commandRegistry.register('사용', (args, context) => handleUseCommand(args, context, rouletteManager, commandTemplateManager));

// 사용자 정보 명령어
commandRegistry.register('고유닉', (args, context) => handleShowTag(args, context, commandTemplateManager));

// 야추 명령어
commandRegistry.register('야추', async (args, context) => {
    if (args.length === 0) {
        await handleYachtStatus(context, yachtManager);
    } else if (args[0] === '설명') {
        await handleYachtGuide(context, yachtManager);
    } else if (args[0] === '족보') {
        await handleYachtHands(context);
    } else if (args[0] === '굴리기') {
        await handleYachtRoll(args.slice(1), context, yachtManager);
    } else if (args[0] === '결정') {
        await handleYachtDecide(context, yachtManager);
    } else {
        await handleYachtStatus(context, yachtManager);
    }
});

// 디버깅 명령어
commandRegistry.register('설정', async (args, context) => {
    if (args.length > 0 && args[0] === '애청지수') {
        await handleShowFanscoreConfig(args.slice(1), context);
    } else if (args.length > 0 && args[0] === '룰렛') {
        // !설정 룰렛 티켓 [템플릿 번호] [숫자]
        if (args.length >= 4 && args[1] === '티켓') {
            const templateNumber = parseInt(args[2]);
            const count = parseInt(args[3]);
            if (!isNaN(templateNumber) && !isNaN(count)) {
                await handleGiveDebugTicket(context, rouletteManager, templateNumber, count);
            }
        }
        // !설정 룰렛 [템플릿 번호]
        else if (args.length >= 2) {
            const templateNumber = parseInt(args[1]);
            if (!isNaN(templateNumber)) {
                await handleShowRouletteItems(context, rouletteManager, templateNumber);
            }
        }
        // !설정 룰렛
        else {
            await handleShowRouletteConfig(context, rouletteManager);
        }
    }
});

// 라이브 메시지 핸들러
async function liveMessage(evt: LiveMessageSocket, socket: LiveSocket): Promise<void> {
    const message = evt.update_component.message.value.trim();
    const user = evt.data.user;
    console.log('starter_pack: liveMessage', user, message);

    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(user.id);

    if (isRegistered) {
        // 출석 체크
        const attended = await fanscoreManager.checkAttendance(user);
        if (attended) {
            await socket.message(`🎉 ${user.nickname}님이 출석했습니다! (+${config?.attendance_score}점)`);
        }

        // 채팅 점수 추가
        fanscoreManager.addChatScore(user);

        // 퀴즈 정답 체크
        if (quizManager.checkAnswer(message)) {
            // 퀴즈 보너스 지급
            const config = await fanscoreManager.loadConfig();
            if (config.quiz_bonus > 0) {
                // 배치 업데이트 시스템 사용
                fanscoreManager.addExpDirect(user, config.quiz_bonus);
                await socket.message(`🎉 ${user.nickname}님이 퀴즈 정답을 맞췄습니다! (+${config.quiz_bonus}점)`);
            }
        }
    }

    // 명령어 파싱
    const parsed = parseCommand(message);
    console.log('starter_pack: parsed command', parsed);
    if (parsed) {
        try {
            // 명령어 실행
            const executed = await commandRegistry.execute(parsed.command, parsed.args, {
                user,
                socket,
                isAdmin: isAdmin(user),
                liveId: currentLiveId,
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
    const sticker = evt.data.sticker;

    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(user.id);

    if (isRegistered) {
        // 스푼 점수 추가
        fanscoreManager.addSpoonScore(user, totalAmount);

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

    // 룰렛 티켓 지급 로직
    await processRouletteTicketGrant(user, sticker, totalAmount, combo, socket);
}

// 라이브 좋아요 핸들러
async function liveLike(evt: LiveLikeSocket, socket: LiveSocket): Promise<void> {
    const user = evt.data.author;

    // 사용자 등록 여부 확인
    const isRegistered = await fanscoreManager.isUserRegistered(user.id);

    if (isRegistered) {
        // 좋아요 점수 추가
        fanscoreManager.addLikeScore(user);
    }

    // 룰렛 티켓 지급 로직 (좋아요)
    await processRouletteTicketGrantForLike(user, socket);
}

/**
 * 룰렛 티켓 지급 처리 (선물 이벤트)
 */
async function processRouletteTicketGrant(
    user: User,
    sticker: any,
    totalAmount: number,
    combo: number,
    socket: LiveSocket
): Promise<void> {
    try {
        const templates = rouletteManager.getAllTemplates();

        for (const template of templates) {
            let ticketCount = 0;

            if (template.mode === 'sticker') {
                // 스티커 모드: 특정 스티커와 일치하는지 확인
                if (sticker && template.sticker === sticker) {
                    if (template.division) {
                        ticketCount = combo;
                    } else {
                        ticketCount = 1;
                    }
                }
            } else if (template.mode === 'spoon') {
                // 스푼 모드: totalAmount >= spoon
                if (template.spoon && totalAmount >= template.spoon) {
                    if (template.division) {
                        ticketCount = Math.floor(totalAmount / template.spoon);
                    } else {
                        ticketCount = 1;
                    }
                }
            }

            if (ticketCount > 0) {
                await rouletteManager.giveTickets(
                    user.id,
                    user.nickname,
                    user.tag,
                    template.template_id,
                    ticketCount
                );

                // auto_run이면 즉시 실행
                if (template.auto_run) {
                    await rouletteManager.autoRunRoulette(
                        user.id,
                        user.nickname,
                        user.tag,
                        template.template_id
                    );
                } else {
                    await socket.message(`[룰렛]\n${user.nickname}님, 룰렛 티켓이 ${ticketCount}개 지급되었습니다.`);
                }
            }
        }
    } catch (error: any) {
        console.error('[ProcessRouletteTicket] Error:', error?.message);
    }
}

/**
 * 수동 룰렛 실행 처리
 */
async function handleManualRouletteSpin(data: {
    templateId: string;
    ticketCount: number;
    targetUserId: number;
    targetNickname: string;
    targetTag: string;
    applyEffects: boolean;
    sendNotification: boolean;
    isTargetInFanscore: boolean;
}): Promise<void> {
    const socket = (window as any).$sopia?.liveMap?.values().next().value?.socket as LiveSocket;
    if (!socket) {
        console.error('[ManualRoulette] Socket not available');
        return;
    }

    try {
        const { templateId, ticketCount, targetUserId, targetNickname, targetTag, applyEffects, sendNotification, isTargetInFanscore } = data;

        console.log('[ManualRoulette] Starting manual roulette spin', {
            templateId, ticketCount, targetUserId, targetNickname, applyEffects
        });

        // 룰렛 실행 (한 번에 모두 돌림, fanscore에 있는 경우에만 기록)
        // applyEffects가 true이고 isTargetInFanscore가 true인 경우에만 saveHistory
        const shouldSaveHistory = applyEffects && isTargetInFanscore;
        const result = await rouletteManager.spinManual(
            targetUserId,
            targetNickname,
            targetTag,
            templateId,
            ticketCount,
            shouldSaveHistory
        );

        if (!result) {
            console.error('[ManualRoulette] Failed to spin roulette');
            if (sendNotification) {
                await socket.message(`[수동 룰렛]\\n룰렛 실행에 실패했습니다.`);
            }
            return;
        }

        // 채팅 알림 (결과 정리해서 한 번에)
        if (sendNotification) {
            const message = rouletteManager.formatResult(targetNickname, result);
            // "[닉네임님 룰렛 결과]" 를 "[수동 룰렛 - 닉네임님 결과]"로 변경
            const formattedMessage = message.replace(
                `[${targetNickname}님 룰렛 결과]`,
                `[수동 룰렛 - ${targetNickname}님 결과]`
            );
            await socket.message(formattedMessage);
        }

        console.log('[ManualRoulette] Manual roulette completed', {
            totalSpins: result.totalSpins,
            resultsCount: result.results.size
        });
    } catch (error: any) {
        console.error('[ManualRoulette] Error:', error?.message);
    }
}

/**
 * 룰렛 티켓 지급 처리 (좋아요 이벤트)
 */
async function processRouletteTicketGrantForLike(
    user: User,
    socket: LiveSocket
): Promise<void> {
    try {
        const templates = rouletteManager.getAllTemplates();

        for (const template of templates) {
            if (template.mode === 'like') {
                // 좋아요 모드: 티켓 1개 지급
                await rouletteManager.giveTickets(
                    user.id,
                    user.nickname,
                    user.tag,
                    template.template_id,
                    1
                );

                // auto_run이면 즉시 실행
                if (template.auto_run) {
                    await rouletteManager.autoRunRoulette(
                        user.id,
                        user.nickname,
                        user.tag,
                        template.template_id
                    );
                }
            }
        }
    } catch (error: any) {
        console.error('[ProcessRouletteTicketForLike] Error:', error?.message);
    }
}

// 라이브 업데이트 핸들러
async function liveUpdate(evt: LiveUpdateSocket, socket: LiveSocket): Promise<void> {
    managerIdList = evt.data.live.manager_ids;

    // Live ID 설정
    const live = evt.data.live;
    if (live && live.id) {
        currentLiveId = live.id;
        fanscoreManager.setLiveId(live.id);
    }

    // DJ 정보 저장
    if (live && live.author) {
        currentDjInfo = live.author;
        console.log('[Worker] DJ info stored:', currentDjInfo.nickname, currentDjInfo.id);
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
        case 'template-updated':
            // 템플릿이 변경되면 새로고침
            rouletteManager.loadTemplates().then(() => {
                console.log('[Worker] Templates refreshed');
            });
            break;
        case 'lottery-updated':
            // 복권 업데이트 시 캐시 동기화
            if (data.data && data.data.userId && typeof data.data.lottery_tickets === 'number') {
                fanscoreManager.updateUserCache(data.data.userId, { lottery_tickets: data.data.lottery_tickets });
                console.log(`[Worker] Lottery cache updated for user ${data.data.userId}: ${data.data.lottery_tickets} tickets`);
            }
            break;
        case 'user-cache-clear':
            // 사용자 캐시 삭제 (사용자 데이터 삭제 시)
            if (data.data && data.data.userId) {
                fanscoreManager.clearUserCache(data.data.userId);
                console.log(`[Worker] User cache cleared for user ${data.data.userId}`);
            }
            break;
        case 'send-chat-message':
            // 채팅 메시지 전송 요청
            if (data.data && data.data.message) {
                const socket = (window as any).$sopia?.liveMap?.values().next().value?.socket as LiveSocket;
                if (socket) {
                    socket.message(data.data.message);
                    console.log('[Worker] Chat message sent', data.data.message);
                }
            }
            break;
        case 'yacht-cooldown-clear':
            // 야추 쿨타임 초기화
            yachtManager.clearAllCooldowns();
            console.log('[Worker] Yacht player cooldowns cleared');
            break;
        case 'command-updated':
            // 명령어 템플릿 업데이트
            commandTemplateManager.reload().then(() => {
                console.log('[Worker] Command templates reloaded');
            });
            break;
        case 'get-dj-info':
            // DJ 정보 요청에 응답
            ipcRenderer.send('starter-pack.sopia.dev-response', {
                channel: 'dj-info',
                data: currentDjInfo ? {
                    id: currentDjInfo.id,
                    nickname: currentDjInfo.nickname,
                    tag: currentDjInfo.tag || currentDjInfo.nickname
                } : null
            });
            break;
        case 'manual-roulette-spin':
            // 수동 룰렛 실행
            if (data.data) {
                handleManualRouletteSpin(data.data);
            }
            break;
    }
}

ipcRenderer.on(DOMAIN, backgroundListener);

// 종료 핸들러
function onAbort(): void {
    ipcRenderer.removeAllListeners(DOMAIN);
    fanscoreManager.destroy();
    quizManager.destroy();
    rouletteManager.destroy();
    console.log('애청지수 워커가 종료됩니다.');
}

export default {
    live_message: liveMessage,
    live_present: livePresent,
    live_like: liveLike,
    live_update: liveUpdate,
    onAbort,
}
