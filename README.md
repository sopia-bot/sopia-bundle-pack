# 청취자 애청지수 도구

React + TypeScript + Shadcn UI 기반의 청취자 애청지수 관리 도구입니다.

## 📁 프로젝트 구조

```
starter_pack/
├── apps/
│   ├── background/          # 백엔드 서버 (stp:// 프로토콜)
│   │   ├── src/
│   │   │   ├── index.ts            # 메인 서버
│   │   │   └── routes/             # API 라우터
│   │   │       ├── fanscore.ts     # 애청지수 API
│   │   │       ├── templates.ts    # 템플릿 API
│   │   │       ├── roulette.ts     # 룰렛 API
│   │   │       └── shield.ts       # 실드 API
│   │   └── data/                   # JSON 데이터 저장소
│   │       ├── fanscore.json
│   │       ├── templates.json
│   │       ├── roulette-history.json
│   │       └── shield.json
│   │
│   ├── views/               # 프론트엔드 (React)
│   │   ├── src/
│   │   │   ├── App.tsx             # 메인 앱 & 라우팅
│   │   │   ├── stores/             # Zustand 상태 관리
│   │   │   │   └── useAppStore.ts
│   │   │   ├── pages/              # 페이지 컴포넌트
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── TemplateSettings.tsx
│   │   │   │   ├── RouletteHistory.tsx
│   │   │   │   ├── FanscoreSettings.tsx
│   │   │   │   └── ShieldSettings.tsx
│   │   │   └── components/         # 공통 컴포넌트
│   │   │       └── Layout.tsx
│   │   └── package.json
│   │
│   └── worker/              # 워커 (별도 작업)
│
└── package.json             # 루트 패키지 설정
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 개발 서버 실행

```bash
# 전체 프로젝트 개발 모드로 실행
pnpm dev

# 또는 개별 실행
pnpm --filter views dev        # 프론트엔드만
pnpm --filter background dev   # 백엔드만
```

### 3. 빌드

```bash
pnpm build
```

## 📝 주요 기능

### 1. 대시보드
- 애청지수 TOP 10 랭킹
- 실드 상태 표시
- 미사용 룰렛 티켓 현황
- 최근 룰렛 당첨 현황

### 2. 템플릿 설정
- 룰렛 템플릿 생성/수정/삭제
- 룰렛 방식 선택 (스티커/스푼/좋아요)
- 아이템 추가 및 확률 설정 (최소 0.001%)
- 분배 모드, 자동 실행, 1% 효과음 설정

### 3. 룰렛 기록
- 템플릿별 당첨 내역 조회
- 티켓 상태 관리 (사용됨/예정)
- DJ가 사용 상태 전환 기능
- 필터링 (템플릿별, 상태별)

### 4. 애청지수 설정
- 채팅/좋아요/스푼 점수 설정
- 돌발 퀴즈 보너스 설정
- 복권 시스템 설정

### 5. 실드 설정
- 실드 개수 관리 (증가/감소)
- 실드 초기화
- 변경 이력 조회

## 🔌 API 엔드포인트

백엔드는 `stp://starter-pack.sopia.dev` 로 접근합니다.

### 애청지수 API
- `GET /fanscore/ranking` - 랭킹 조회
- `GET /fanscore/user/:userId` - 특정 사용자 조회
- `PUT /fanscore/user/:userId` - 애청지수 업데이트

### 템플릿 API
- `GET /templates` - 템플릿 목록
- `GET /templates/:templateId` - 특정 템플릿 조회
- `POST /templates` - 템플릿 생성
- `PUT /templates/:templateId` - 템플릿 수정
- `DELETE /templates/:templateId` - 템플릿 삭제

### 룰렛 API
- `GET /roulette/history` - 룰렛 기록 조회
- `GET /roulette/history/:templateId` - 템플릿별 기록 조회
- `POST /roulette/spin/:templateId` - 룰렛 실행
- `PUT /roulette/history/:recordId/use` - 사용 상태 변경

### 실드 API
- `GET /shield` - 실드 상태 조회
- `PUT /shield/change` - 실드 변경
- `PUT /shield/reset` - 실드 초기화

## 🛠 기술 스택

### 프론트엔드
- **React 19** + **TypeScript**
- **React Router DOM** - 라우팅
- **Zustand** - 상태 관리
- **Tailwind CSS** - 스타일링
- **Lucide React** - 아이콘
- **Vite** - 빌드 도구

### 백엔드
- **Node.js** + **Express**
- **TypeScript**
- **JSON 파일 기반 데이터 저장**
- **Rspack** - 빌드 도구

## 📊 데이터 구조

### 애청지수 (fanscore.json)
```json
{
  "user_id": 12345,
  "nickname": "홍길동",
  "score": 138,
  "rank": 5,
  "chat_count": 12,
  "like_count": 20,
  "spoon_count": 2
}
```

### 룰렛 템플릿 (templates.json)
```json
{
  "template_id": "default-1",
  "name": "기본 룰렛",
  "mode": "sticker",
  "sticker": "heart",
  "division": true,
  "auto_run": true,
  "sound_below_1percent": true,
  "items": [
    { "type": "shield", "label": "실드 1회", "percentage": 10 },
    { "type": "ticket", "label": "복권", "percentage": 0.001 }
  ]
}
```

### 룰렛 기록 (roulette-history.json)
```json
{
  "id": "roulette-1",
  "template_id": "default-1",
  "user_id": 1,
  "nickname": "홍길동",
  "item": { "type": "shield", "label": "실드 1회", "percentage": 10 },
  "used": false,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### 실드 (shield.json)
```json
{
  "shield_count": 0,
  "history": [
    { "change": -1, "reason": "공격받음", "time": "2025-01-15T12:00:00Z" }
  ]
}
```

## 📌 주의사항

- 아이템 확률의 총합은 100%를 초과할 수 없습니다
- 100% 미만일 경우 나머지는 자동으로 꽝이 됩니다
- 최소 확률은 0.001% 입니다
- 모든 데이터는 JSON 파일에 저장되며 DB를 사용하지 않습니다

## 📊 로깅 시스템

백엔드는 Winston을 사용한 포괄적인 로깅 시스템을 제공합니다:

- **로그 레벨**: 개발(debug), 프로덕션(info)
- **로그 로테이션**: daily-rotate-file (14일 보관, 20MB 최대)
- **시간대**: KST (Asia/Seoul)
- **로그 파일**: 
  - `error-YYYY-MM-DD.log` - 에러 로그
  - `combined-YYYY-MM-DD.log` - 모든 로그
  - `exceptions-YYYY-MM-DD.log` - 처리되지 않은 예외
  - `rejections-YYYY-MM-DD.log` - Promise rejection

자세한 내용은 [apps/background/LOGGING.md](apps/background/LOGGING.md)를 참조하세요.

## 💾 데이터 관리

백엔드는 JSON 파일 기반의 데이터 저장소를 사용하며, 최초 진입 시 자동으로 기본 데이터를 생성합니다:

- **자동 초기화**: 서버 시작 시 모든 데이터 파일 자동 생성
- **기본 데이터**: 샘플 사용자, 기본 템플릿, 설정값 등 포함
- **안전한 파일 관리**: 파일 존재 여부 확인 및 에러 처리
- **데이터 무결성**: 검증 로직 및 백업 시스템

자세한 내용은 [apps/background/DATA_MANAGEMENT.md](apps/background/DATA_MANAGEMENT.md)를 참조하세요.

## 🎨 UI/UX 특징

- 다크 모드 디자인
- 직관적인 네비게이션
- 실시간 상태 업데이트
- 반응형 레이아웃
- 애니메이션 및 트랜지션

## 📄 라이센스

MIT
