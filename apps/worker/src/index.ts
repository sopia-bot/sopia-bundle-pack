// @ts-ignore
import { LiveMessageSocket, LivePresentSocket, LiveLikeSocket, LiveSocket } from '@sopia-bot/core';

// 라이브 메시지 핸들러
async function liveMessage(evt: LiveMessageSocket, socket: LiveSocket): Promise<void> {
    const message = evt.update_component.message.value.trim();
    const user = evt.data.user;
    
}

// 라이브 선물 핸들러
async function livePresent(evt: LivePresentSocket, socket: LiveSocket): Promise<void> {
    const user = evt.data.author;
    const combo = evt.data.combo;
    const amount = evt.data.amount;
    const totalAmount = amount * combo;
    const stickerName = evt.data.sticker || '';

    const sticker = stickerName ? window.$sopia.sticker.findSticker(stickerName) : null;
    if (!sticker) {
        socket.message('❌ 스티커를 찾을 수 없습니다.');
        return;
    }
    
}

// 라이브 좋아요 핸들러
async function liveLike(evt: LiveLikeSocket, socket: LiveSocket): Promise<void> {
    const user = evt.data.author;
}

// 종료 핸들러
function onAbort(): void {
    console.log('룰렛 워커가 종료됩니다.');
}

export default {
    live_message: liveMessage,
    live_present: livePresent,
    live_like: liveLike,
    onAbort,
}
