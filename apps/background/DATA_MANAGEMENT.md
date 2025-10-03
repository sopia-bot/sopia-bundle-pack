# 데이터 관리 시스템

## 📋 개요

백엔드 서버는 JSON 파일 기반의 데이터 저장소를 사용하며, 최초 진입 시 자동으로 기본 데이터 파일들을 생성합니다. 모든 데이터 파일은 `__pkgdir/data/` 디렉토리에 저장됩니다.

## 🗂 데이터 파일 구조

```
__pkgdir/data/
├── fanscore.json           # 애청지수 데이터
├── fanscore-config.json    # 애청지수 설정
├── templates.json          # 룰렛 템플릿
├── roulette-history.json   # 룰렛 기록
└── shield.json            # 실드 데이터
```

## 🚀 자동 초기화 시스템

### 서버 시작 시 초기화
서버가 시작될 때 `initializeAllDataFiles()` 함수가 실행되어:
1. 데이터 디렉토리 생성 (`__pkgdir/data/`)
2. 각 데이터 파일의 존재 여부 확인
3. 없는 파일은 기본 데이터로 자동 생성

### 기본 데이터

#### fanscore.json
```json
[
  {
    "user_id": 1,
    "nickname": "샘플 사용자",
    "score": 0,
    "rank": 1,
    "chat_count": 0,
    "like_count": 0,
    "spoon_count": 0
  }
]
```

#### fanscore-config.json
```json
{
  "enabled": true,
  "chat_score": 1,
  "like_score": 2,
  "spoon_score": 50,
  "quiz_enabled": false,
  "quiz_bonus": 10,
  "lottery_enabled": false,
  "lottery_percentage": 0.1
}
```

#### templates.json
```json
[
  {
    "template_id": "default-1",
    "name": "기본 룰렛",
    "mode": "sticker",
    "sticker": "heart",
    "spoon": 1,
    "division": true,
    "auto_run": true,
    "sound_below_1percent": true,
    "items": [
      { "type": "shield", "label": "실드 1회", "percentage": 10 },
      { "type": "ticket", "label": "복권", "percentage": 0.001 },
      { "type": "custom", "label": "어떠한 커스텀 아이템", "percentage": 0.001 }
    ]
  }
]
```

#### roulette-history.json
```json
[]
```

#### shield.json
```json
{
  "shield_count": 0,
  "history": []
}
```

## 🛠 FileManager 유틸리티

### 주요 함수

#### `ensureDataDirectory()`
- 데이터 디렉토리가 존재하는지 확인하고 없으면 생성

#### `ensureDataFile(filename, defaultContent)`
- 파일이 존재하는지 확인하고, 없으면 기본 데이터로 초기화
- 반환값: 파일이 이미 존재했는지 여부 (boolean)

#### `getDataFile(dataType)`
- 데이터 파일을 안전하게 읽기
- 파일이 없으면 기본 데이터로 초기화 후 반환

#### `saveDataFile(dataType, data)`
- 데이터 파일을 안전하게 저장

#### `readJsonFile(filename)`
- JSON 파일을 읽고 파싱

#### `writeJsonFile(filename, data)`
- JSON 파일에 데이터 저장

### 사용 예시

```typescript
import { getDataFile, saveDataFile } from '../utils/fileManager';

// 데이터 읽기 (없으면 자동 초기화)
const fanscoreData = getDataFile('fanscore');

// 데이터 저장
saveDataFile('fanscore', updatedData);
```

## 🔄 데이터 흐름

### 1. 서버 시작
```
서버 시작 → initializeAllDataFiles() → 모든 데이터 파일 초기화
```

### 2. API 요청 처리
```
API 요청 → getDataFile() → 파일 존재 확인 → 없으면 초기화 → 데이터 반환
```

### 3. 데이터 수정
```
데이터 수정 → saveDataFile() → 파일 저장 → 로그 기록
```

## 📊 에러 처리

### 파일 읽기 실패
- 파일이 없으면 기본 데이터로 초기화
- 권한 문제나 디스크 오류 시 에러 로그 기록

### 파일 쓰기 실패
- 디스크 공간 부족, 권한 문제 등
- 상세한 에러 정보를 로그에 기록

### JSON 파싱 오류
- 잘못된 JSON 형식 감지
- 백업 파일 생성 또는 기본 데이터로 복구

## 🔒 데이터 무결성

### 자동 백업
- 중요한 데이터 수정 전 자동 백업
- 롤백 기능 제공

### 검증 로직
- 템플릿 확률 합계 검증 (100% 초과 방지)
- 실드 개수 음수 방지
- 필수 필드 존재 여부 확인

## 📝 로깅

### 초기화 로그
```
[INFO] Creating data directory: /path/to/data
[INFO] Initializing data file with default content: fanscore.json
[INFO] Data file initialized successfully: fanscore.json
[INFO] All data files initialized
```

### 에러 로그
```
[ERROR] Failed to initialize data file: fanscore.json
[ERROR] Failed to read JSON file: fanscore.json
[ERROR] Failed to write JSON file: fanscore.json
```

## 🚨 주의사항

### 데이터 디렉토리 권한
- 애플리케이션이 데이터 디렉토리에 읽기/쓰기 권한이 있어야 함
- 프로덕션 환경에서는 적절한 권한 설정 필요

### 동시 접근
- 단일 프로세스 환경에서 설계됨
- 다중 프로세스 환경에서는 추가 동기화 로직 필요

### 백업 전략
- 정기적인 데이터 백업 권장
- 중요한 데이터는 별도 백업 시스템 구축

## 🔧 설정 변경

### 기본 데이터 수정
`apps/background/src/utils/fileManager.ts`의 `defaultData` 객체 수정:

```typescript
const defaultData = {
  fanscore: [
    // 새로운 기본 사용자 데이터
  ],
  // 다른 기본 데이터들...
};
```

### 데이터 디렉토리 경로 변경
`__pkgdir` 변수를 다른 경로로 변경:

```typescript
const dataDir = path.join('/custom/path', 'data');
```

## 📈 성능 고려사항

- 파일 I/O는 동기적으로 처리되어 작은 데이터셋에 최적화
- 대용량 데이터 처리가 필요한 경우 비동기 처리로 전환 고려
- 메모리 사용량 최적화를 위해 필요한 데이터만 로드
