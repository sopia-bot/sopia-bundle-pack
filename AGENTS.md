# Bundle-Pack 아키텍처 문서

## 개요

Bundle-Pack은 스푼라디오 스트리밍을 위한 팬 참여 관리 시스템입니다. 애청지수, 룰렛, 복권, 퀴즈, 실드 등의 기능을 제공하며, sopia-v3 Electron 앱에서 번들로 사용됩니다.

## 프로젝트 구조

```
bundle-pack/
├── apps/
│   ├── background/          # Express.js 백엔드 서버
│   │   ├── src/
│   │   │   ├── index.ts     # 서버 진입점
│   │   │   ├── routes/      # API 라우트 (13개)
│   │   │   └── utils/       # 유틸리티 (fileManager, logger)
│   │   └── data/            # JSON 데이터 저장소
│   │
│   ├── views/               # React 대시보드 UI
│   │   └── src/
│   │       ├── main.tsx     # React 진입점
│   │       ├── App.tsx      # 라우터 설정
│   │       ├── pages/       # 페이지 컴포넌트
│   │       └── stores/      # Zustand 상태 관리
│   │
│   └── worker/              # 채팅 이벤트 핸들러
│       └── src/
│           ├── index.ts     # Worker 진입점
│           ├── managers/    # 비즈니스 로직 매니저
│           ├── commands/    # 명령어 핸들러
│           └── utils/       # 유틸리티
│
├── tools/                   # 빌드 도구
├── dist/                    # 빌드 결과물
├── package.json             # 루트 워크스페이스 설정
├── pnpm-workspace.yaml      # pnpm 모노레포 정의
└── turbo.json               # Turbo 빌드 설정
```

---

## 3-Tier 아키텍처

### 1. Worker Layer (이벤트 처리)

**위치**: `apps/worker/src/`

**역할**: Electron 메인 프로세스에서 실행되며, 라이브 스트리밍 이벤트를 수신하고 처리합니다.

#### 이벤트 핸들러

| 함수 | 트리거 | 처리 내용 |
|------|--------|----------|
| `live_message()` | 채팅 메시지 수신 | 출석 체크, 채팅 점수, 퀴즈 정답 확인, 명령어 파싱 |
| `live_present()` | 스티커/스푼 선물 | 스푼 점수 지급, 복권 티켓, 룰렛 티켓 |
| `live_like()` | 좋아요 클릭 | 좋아요 점수, 룰렛 티켓 |
| `live_update()` | 방송 상태 변경 | 매니저 목록 갱신, 라이브 ID 업데이트, DJ 정보 |

#### 매니저 클래스

```
apps/worker/src/managers/
├── fanscore-manager.ts      # 애청지수 배치 업데이트, 캐시 관리
├── roulette-manager.ts      # 룰렛 티켓/스핀/킵아이템
├── lottery-manager.ts       # 복권 시스템
├── quiz-manager.ts          # 퀴즈 자동 출제, 정답 체크
├── yacht-manager.ts         # 야추 주사위 게임
└── command-template-manager.ts  # 채팅 템플릿 관리
```

#### 명령어 레지스트리

| 명령어 | 설명 |
|--------|------|
| `!내정보` | 프로필 조회 |
| `!내정보 생성` | 프로필 생성 |
| `!상점 <태그> <점수>` | 점수 지급 (DJ 전용) |
| `!감점` | 점수 차감 |
| `!랭크` | 상위 5명 랭킹 |
| `!복권` | 복권 플레이 |
| `!룰렛` | 룰렛 스핀 |
| `!킵` | 킵 아이템 목록 |
| `!사용` | 킵 아이템 사용 |
| `!실드` | 실드 개수 조회 |
| `!야추` | 야추 게임 |

---

### 2. Background Layer (API 서버)

**위치**: `apps/background/src/`

**역할**: Express.js REST API 서버로, 데이터 영속화와 비즈니스 로직을 담당합니다.

#### API 라우트

```
apps/background/src/routes/
├── fanscore.ts           # 애청지수 CRUD, 랭킹, 배치 업데이트
├── fanscore-config.ts    # 점수 설정 관리
├── templates.ts          # 룰렛 템플릿 CRUD
├── roulette.ts           # 룰렛 티켓/기록 관리
├── shield.ts             # 실드 개수/이력
├── quiz.ts               # 퀴즈 문제 관리
├── command-routes.ts     # 명령어 템플릿
├── yacht.ts              # 야추 게임 상태
├── user.ts               # 유저 관리
└── migration/            # 데이터 마이그레이션
```

#### 주요 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/fanscore/ranking` | 애청지수 랭킹 조회 |
| GET | `/fanscore/user/:id` | 개별 유저 조회 |
| PUT | `/fanscore/user/:id` | 유저 정보 수정 |
| POST | `/fanscore/batch-update` | 배치 업데이트 (Worker에서 호출) |
| GET/PUT | `/fanscore/config` | 설정 조회/수정 |
| GET/POST | `/templates` | 템플릿 목록/생성 |
| PUT/DELETE | `/templates/:id` | 템플릿 수정/삭제 |
| GET | `/roulette/history` | 룰렛 기록 |
| GET/PUT | `/shield` | 실드 조회/변경 |
| GET/POST | `/quiz` | 퀴즈 조회/추가 |

#### FileManager (데이터 영속화)

**위치**: `apps/background/src/utils/fileManager.ts`

```typescript
// 핵심 함수
ensureDataDirectory()           // data/ 디렉토리 생성
ensureDataFile(name, default)   // 파일 없으면 기본값으로 생성
getDataFile(type)               // JSON 파일 읽기 (큐잉)
saveDataFile(type, data)        // JSON 파일 쓰기 (큐잉)

// 파일 작업 큐잉 (동시 쓰기 방지)
fileOperationQueues: Map<filename, Promise>
```

---

### 3. Views Layer (대시보드 UI)

**위치**: `apps/views/src/`

**역할**: React SPA로, 관리자용 대시보드 인터페이스를 제공합니다.

#### 페이지 구조

| 경로 | 컴포넌트 | 기능 |
|------|----------|------|
| `/` | Dashboard | 랭킹, 실드, 활성 유저, 룰렛 개요 |
| `/templates` | TemplateSettings | 룰렛 템플릿 생성/편집 |
| `/roulette-history` | RouletteHistory | 룰렛 기록, 사용 처리 |
| `/fanscore-settings` | FanscoreSettings | 점수 설정 (출석/채팅/좋아요/스푼) |
| `/shield-settings` | ShieldSettings | 실드 증가/감소 |
| `/user-management` | UserManagement | 유저 관리, 계정 이전 |
| `/chat-builder` | ChatBuilder | 채팅 메시지 템플릿 |
| `/sticker-test` | StickerTest | 스티커 미리보기 |

#### 상태 관리 (Zustand)

**위치**: `apps/views/src/stores/useAppStore.ts`

```typescript
interface AppState {
  // 상태
  fanscoreRanking: FanscoreUser[];
  shieldData: ShieldData;
  templates: RouletteTemplate[];
  rouletteHistory: RouletteHistory[];
  todayActiveCount: number;

  // 액션
  fetchFanscoreRanking(): Promise<void>;
  fetchShieldData(): Promise<void>;
  fetchTemplates(): Promise<void>;
  updateTemplate(template): Promise<void>;
  deleteTemplate(id): Promise<void>;
  // ...
}
```

#### 기술 스택

- **React 19** + TypeScript
- **React Router DOM** (HashRouter)
- **Zustand** - 상태 관리
- **Tailwind CSS** + **Shadcn UI** - 스타일링
- **Vite** - 빌드 도구
- **Lucide React** - 아이콘
- **Sonner** - 토스트 알림

---

## 데이터 통신 흐름

### 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SOPIA (Electron App)                         │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    라이브 스트리밍 이벤트                      │   │
│   │         (채팅 메시지 / 스티커 선물 / 좋아요 / 상태변경)          │   │
│   └───────────────────────────┬─────────────────────────────────┘   │
│                               │                                      │
│                               ▼                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      WORKER                                  │   │
│   │                                                              │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│   │   │ Fanscore    │  │ Roulette    │  │ Quiz        │        │   │
│   │   │ Manager     │  │ Manager     │  │ Manager     │        │   │
│   │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │   │
│   │          │                │                │                │   │
│   │          └────────────────┴────────────────┘                │   │
│   │                           │                                  │   │
│   │                   pendingUpdates (Map)                       │   │
│   │                           │                                  │   │
│   │                    5초마다 배치 처리                           │   │
│   └───────────────────────────┬─────────────────────────────────┘   │
│                               │                                      │
│                               │ IPC (ipcRenderer)                   │
│                               │ Channel: 'starter-pack.sopia.dev'   │
│                               │                                      │
│                               ▼                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     BACKGROUND                               │   │
│   │                   (Express Server)                           │   │
│   │                                                              │   │
│   │   ┌──────────────────────────────────────────────────────┐  │   │
│   │   │                    API Routes                         │  │   │
│   │   │  /fanscore  /templates  /roulette  /shield  /quiz    │  │   │
│   │   └──────────────────────────┬───────────────────────────┘  │   │
│   │                              │                               │   │
│   │                              ▼                               │   │
│   │   ┌──────────────────────────────────────────────────────┐  │   │
│   │   │              FileManager (큐잉 시스템)                 │  │   │
│   │   │         동시 쓰기 방지 / 순차 처리 보장                  │  │   │
│   │   └──────────────────────────┬───────────────────────────┘  │   │
│   │                              │                               │   │
│   │                              ▼                               │   │
│   │   ┌──────────────────────────────────────────────────────┐  │   │
│   │   │                  data/ (JSON 파일)                    │  │   │
│   │   │                                                       │  │   │
│   │   │  fanscore.json         유저 프로필, 점수, 레벨          │  │   │
│   │   │  fanscore-config.json  점수 설정                       │  │   │
│   │   │  templates.json        룰렛 템플릿                      │  │   │
│   │   │  roulette.json         티켓, 킵 아이템                  │  │   │
│   │   │  roulette-history.json 룰렛 기록                       │  │   │
│   │   │  shield.json           실드 개수, 이력                  │  │   │
│   │   │  quiz.json             퀴즈 문제                       │  │   │
│   │   │  command.json          명령어 템플릿                    │  │   │
│   │   └──────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                               │                                      │
│                               │ stp://starter-pack.sopia.dev        │
│                               │ (커스텀 프로토콜 - Electron 인터셉트)   │
│                               │                                      │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────────┐
                  │           VIEWS             │
                  │       (React Dashboard)     │
                  │                             │
                  │   Zustand Store             │
                  │   fetch() → API 호출        │
                  │   상태 업데이트 → UI 렌더링   │
                  └─────────────────────────────┘
```

---

## IPC 통신 상세

### Worker → Background

```typescript
// Worker에서 IPC 메시지 전송
const { ipcRenderer } = window.require('electron');

ipcRenderer.send('starter-pack.sopia.dev', {
  channel: 'config-updated',       // 설정 변경 알림
  data: { ... }
});

ipcRenderer.send('starter-pack.sopia.dev', {
  channel: 'quiz-updated',         // 퀴즈 갱신
});

ipcRenderer.send('starter-pack.sopia.dev', {
  channel: 'template-updated',     // 템플릿 갱신
});

ipcRenderer.send('starter-pack.sopia.dev', {
  channel: 'lottery-updated',      // 복권 티켓 동기화
  data: { userId, lottery_tickets }
});

ipcRenderer.send('starter-pack.sopia.dev', {
  channel: 'manual-roulette-spin', // 수동 룰렛 스핀
  data: { templateId, userId, ... }
});
```

### Background → Worker

```typescript
// Background에서 Worker로 응답
window.webContents.send('starter-pack.sopia.dev', {
  channel: 'lottery-updated',
  data: { userId, lottery_tickets }
});

window.webContents.send('starter-pack.sopia.dev', {
  channel: 'roulette-result',
  data: { result, effects }
});
```

### Views → Background

```typescript
// Views에서 API 호출
const API_BASE = 'stp://starter-pack.sopia.dev';

// GET 요청
const response = await fetch(`${API_BASE}/fanscore/ranking`);
const data = await response.json();

// POST 요청
await fetch(`${API_BASE}/templates`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(template)
});

// PUT 요청
await fetch(`${API_BASE}/shield/change`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ change: 1, reason: '실드 추가' })
});
```

---

## 배치 업데이트 시스템

### 동작 원리

Worker의 FanscoreManager는 성능 최적화를 위해 배치 업데이트 패턴을 사용합니다.

```
┌──────────────────────────────────────────────────────────────┐
│                     이벤트 발생 (채팅/좋아요/선물)               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                pendingUpdates: Map<userId, UpdateData>       │
│                                                              │
│   user_123: { score: +10, exp: +5, chat_count: +1 }         │
│   user_456: { score: +100, spoon_count: +1 }                │
│   user_789: { score: +10, like_count: +5 }                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ 5초 타이머
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              processBatchUpdate() 실행                        │
│                                                              │
│   1. pendingUpdates 복사 및 초기화                            │
│   2. POST /fanscore/batch-update 호출                        │
│   3. 서버에서 랭킹 재계산                                       │
│   4. userCache 갱신                                          │
└──────────────────────────────────────────────────────────────┘
```

### 코드 흐름

```typescript
// apps/worker/src/managers/fanscore-manager.ts

class FanscoreManager {
  private pendingUpdates: Map<number, PendingUpdate> = new Map();
  private userCache: Map<number, FanscoreUser> = new Map();
  private batchTimer: NodeJS.Timer | null = null;

  // 점수 업데이트 요청 (즉시 실행 안함)
  async addScore(userId: number, score: number, type: 'chat' | 'like' | 'spoon') {
    const pending = this.pendingUpdates.get(userId) || { score: 0, exp: 0 };
    pending.score += score;
    pending[`${type}_count`] = (pending[`${type}_count`] || 0) + 1;
    this.pendingUpdates.set(userId, pending);

    this.scheduleBatchUpdate();
  }

  // 5초 후 배치 처리 예약
  private scheduleBatchUpdate() {
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.processBatchUpdate();
      this.batchTimer = null;
    }, 5000);
  }

  // 실제 배치 업데이트 실행
  private async processBatchUpdate() {
    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    await fetch(`${API_BASE}/fanscore/batch-update`, {
      method: 'POST',
      body: JSON.stringify({ updates })
    });

    // 캐시 갱신
    await this.refreshCache();
  }
}
```

---

## 데이터 저장 구조

### JSON 파일 스키마

#### fanscore.json (유저 데이터)

```typescript
interface FanscoreUser {
  user_id: number;           // 스푼라디오 유저 ID
  nickname: string;          // 닉네임
  tag: string;               // 고유 태그 (식별자)
  score: number;             // 총 점수
  exp: number;               // 경험치
  level: number;             // 레벨 (exp에서 계산)
  rank: number;              // 순위 (자동 계산)
  chat_count: number;        // 채팅 횟수
  like_count: number;        // 좋아요 횟수
  spoon_count: number;       // 스푼 횟수
  lottery_tickets: number;   // 복권 티켓
  attendance_live_id: number | null;  // 오늘 출석한 라이브 ID
  last_activity_at: string;  // 마지막 활동 시간 (ISO)
}
```

#### fanscore-config.json (설정)

```typescript
interface FanscoreConfig {
  enabled: boolean;           // 시스템 활성화
  attendance_score: number;   // 출석 점수 (기본: 10)
  chat_score: number;         // 채팅 점수 (기본: 1)
  like_score: number;         // 좋아요 점수 (기본: 10)
  spoon_score: number;        // 스푼 점수 (기본: 100)

  quiz_enabled: boolean;      // 퀴즈 활성화
  quiz_bonus: number;         // 퀴즈 정답 보너스
  quiz_interval: number;      // 퀴즈 간격 (초)

  lottery_enabled: boolean;   // 복권 활성화
  lottery_spoon_required: number;  // 복권 티켓 획득 스푼량
  lottery_reward_0_match: number;  // 0개 일치 보상
  lottery_reward_1_match: number;  // 1개 일치 보상
  lottery_reward_2_match: number;  // 2개 일치 보상
  lottery_reward_3_match: number;  // 3개 일치 보상

  show_score: boolean;        // 점수 표시 여부
}
```

#### templates.json (룰렛 템플릿)

```typescript
interface RouletteTemplate {
  template_id: string;        // 템플릿 ID (UUID)
  name: string;               // 템플릿 이름
  mode: 'sticker' | 'spoon' | 'like';  // 트리거 모드
  sticker?: string;           // 스티커 모드: 스티커 ID
  spoon?: number;             // 스푼 모드: 스푼 개수
  like_count?: number;        // 좋아요 모드: 좋아요 개수
  division: boolean;          // 콤보로 나누기
  auto_run: boolean;          // 자동 스핀
  enabled: boolean;           // 활성화 상태
  items: RouletteItem[];      // 룰렛 아이템 목록
}

interface RouletteItem {
  type: 'shield' | 'ticket' | 'shop' | 'custom';
  label: string;              // 표시 이름
  percentage: number;         // 확률 (%)
  value?: number;             // shield/ticket/shop: 수량
}
```

#### roulette.json (티켓 & 킵 아이템)

```typescript
interface RouletteData {
  tickets: {
    user_id: number;
    tickets: Record<string, number>;  // { templateId: count }
  }[];
  keepItems: {
    user_id: number;
    items: Record<string, number>;    // { itemLabel: count }
  }[];
}
```

#### shield.json (실드)

```typescript
interface ShieldData {
  shield_count: number;       // 현재 실드 개수
  history: {
    change: number;           // 변경량 (+/-)
    reason: string;           // 변경 사유
    time: string;             // 변경 시간 (ISO)
  }[];
}
```

---

## 파일 작업 큐잉 시스템

### 문제 상황

여러 이벤트가 동시에 발생하면 같은 JSON 파일에 동시 쓰기가 발생할 수 있습니다. 이는 데이터 손상을 야기합니다.

### 해결 방법

FileManager는 파일별 Promise 체인을 유지하여 순차 처리를 보장합니다.

```typescript
// apps/background/src/utils/fileManager.ts

const fileOperationQueues: Map<string, Promise<any>> = new Map();

async function saveDataFile(type: string, data: any): Promise<void> {
  const filename = `${type}.json`;

  // 현재 큐 가져오기 (없으면 즉시 resolve)
  const currentQueue = fileOperationQueues.get(filename) || Promise.resolve();

  // 새 작업을 큐에 연결
  const newQueue = currentQueue.then(async () => {
    await writeJsonFile(filename, data);
  });

  fileOperationQueues.set(filename, newQueue);
  await newQueue;
}
```

### 동작 예시

```
시간  파일                작업
────────────────────────────────────
T0    fanscore.json      쓰기 시작 (user A 업데이트)
T1    fanscore.json      쓰기 요청 (user B 업데이트) → 큐에 추가
T2    templates.json     쓰기 시작 (템플릿 수정) → 다른 파일이므로 병렬
T3    fanscore.json      T0 완료, T1 시작
T4    fanscore.json      쓰기 요청 (user C 업데이트) → 큐에 추가
T5    templates.json     완료
T6    fanscore.json      T3 완료, T4 시작
T7    fanscore.json      완료
```

---

## sopia-v3 통합

### package.json 설정

```json
{
  "name": "starter-pack",
  "version": "1.0.8",
  "main": "./apps/worker/index.js",
  "page": "index.html",
  "pageRoot": "apps/views",
  "stp": {
    "domain": "starter-pack.sopia.dev",
    "file": "./apps/background/index.js"
  }
}
```

### Electron 통합 방식

1. **Worker**: `main` 필드로 지정된 파일이 Electron 메인 프로세스에서 로드됨
2. **Views**: `pageRoot`의 `index.html`이 Electron 렌더러 프로세스에서 로드됨
3. **Background**: `stp.file`로 지정된 Express 서버가 별도 프로세스로 실행됨
4. **커스텀 프로토콜**: `stp://` 프로토콜을 Electron이 인터셉트하여 Background로 라우팅

---

## 빌드 및 개발

### 스크립트

```bash
# 개발 모드 (watch)
pnpm dev

# 프로덕션 빌드
pnpm build

# 서버 실행
pnpm serve
```

### 빌드 결과물

```
dist/
├── apps/
│   ├── background/
│   │   └── index.js      # Express 서버 (CommonJS)
│   ├── views/
│   │   ├── index.html    # React SPA 진입점
│   │   └── assets/       # JS/CSS 번들
│   └── worker/
│       └── index.js      # Worker 스크립트
```

### 기술 스택

| 레이어 | 빌드 도구 | 런타임 |
|--------|----------|--------|
| Background | Rspack | Node.js (Express) |
| Views | Vite | 브라우저 (React) |
| Worker | Rspack | Electron Main |

---

## 로깅 시스템

### Winston 설정

**위치**: `apps/background/src/utils/logger.ts`

```typescript
// 로그 레벨
// error: 오류
// warn: 경고
// info: 정보
// debug: 디버그

// 로그 파일 (일별 로테이션)
// logs/error-YYYY-MM-DD.log   - 오류만
// logs/combined-YYYY-MM-DD.log - 모든 로그
// logs/exceptions-YYYY-MM-DD.log - 미처리 예외
```

### 타임존

모든 로그는 **KST (Asia/Seoul)** 타임존으로 기록됩니다.

---

## 주요 파일 참조

| 목적 | 파일 경로 |
|------|----------|
| Worker 진입점 | `apps/worker/src/index.ts` |
| Background 진입점 | `apps/background/src/index.ts` |
| Views 진입점 | `apps/views/src/main.tsx` |
| 데이터 영속화 | `apps/background/src/utils/fileManager.ts` |
| 상태 관리 | `apps/views/src/stores/useAppStore.ts` |
| 애청지수 매니저 | `apps/worker/src/managers/fanscore-manager.ts` |
| 룰렛 매니저 | `apps/worker/src/managers/roulette-manager.ts` |
| 명령어 파서 | `apps/worker/src/utils/command-parser.ts` |
| 레벨 시스템 | `apps/worker/src/utils/level-system.ts` |
| 로거 | `apps/background/src/utils/logger.ts` |
