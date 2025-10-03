# 로깅 시스템 가이드

## 📋 개요

백엔드 서버는 Winston을 사용하여 포괄적인 로깅 시스템을 구현했습니다. 모든 에러와 중요한 이벤트가 KST 시간대로 기록되며, daily-rotate-file을 통해 로그 파일이 자동으로 로테이션됩니다.

## 🗂 로그 파일 구조

```
apps/background/logs/
├── error-YYYY-MM-DD.log      # 에러 로그만 (error 레벨)
├── combined-YYYY-MM-DD.log   # 모든 로그 (info 레벨 이상)
├── exceptions-YYYY-MM-DD.log # 처리되지 않은 예외
└── rejections-YYYY-MM-DD.log # 처리되지 않은 Promise rejection
```

## ⚙️ 로그 설정

### 로그 레벨
- **개발 환경**: `debug` 레벨 (모든 로그 출력)
- **프로덕션 환경**: `info` 레벨 (중요한 로그만 출력)

### 로그 로테이션
- **파일 크기**: 최대 20MB
- **보관 기간**: 14일
- **압축**: 자동 압축 (gzip)
- **시간대**: KST (Asia/Seoul)

### 로그 포맷
```json
{
  "timestamp": "2025-01-15 14:30:25",
  "level": "info",
  "message": "User fanscore fetched successfully",
  "userId": 12345,
  "score": 138,
  "service": "starter-pack-backend"
}
```

## 📝 로깅되는 이벤트

### 1. HTTP 요청 로깅
- 모든 HTTP 요청과 응답
- 요청 시간, 상태 코드, 응답 시간
- 4xx/5xx 에러는 `warn` 레벨로 기록

### 2. API 엔드포인트 로깅

#### 애청지수 API (`/fanscore`)
- 랭킹 조회 성공/실패
- 사용자 조회 성공/실패
- 애청지수 업데이트 (변경 전후 값 포함)

#### 템플릿 API (`/templates`)
- 템플릿 목록 조회
- 템플릿 생성/수정/삭제
- 확률 검증 실패 (100% 초과)

#### 룰렛 API (`/roulette`)
- 룰렛 실행 (선택된 아이템, 확률, 랜덤 값)
- 기록 조회
- 사용 상태 변경

#### 실드 API (`/shield`)
- 실드 상태 조회
- 실드 변경 (증가/감소, 사유)
- 실드 초기화
- 음수 방지 경고

#### 설정 API (`/fanscore/config`)
- 설정 조회/저장
- 설정 변경 내용

### 3. 시스템 로깅
- 서버 초기화
- 404 Not Found
- 처리되지 않은 예외
- Promise rejection

## 🔍 로그 레벨별 내용

### DEBUG
- API 호출 시작
- 상세한 디버깅 정보
- 개발 환경에서만 출력

### INFO
- 성공적인 작업 완료
- 중요한 비즈니스 로직 실행
- HTTP 요청 (2xx, 3xx)

### WARN
- HTTP 요청 (4xx)
- 비즈니스 로직 경고 (확률 초과, 사용자 없음 등)
- 404 Not Found

### ERROR
- HTTP 요청 (5xx)
- 파일 읽기/쓰기 실패
- API 처리 실패
- 처리되지 않은 예외

## 📊 로그 분석 예시

### 성공적인 룰렛 실행
```json
{
  "timestamp": "2025-01-15 14:30:25",
  "level": "info",
  "message": "Roulette spun successfully",
  "templateId": "default-1",
  "userId": 12345,
  "nickname": "홍길동",
  "selectedItem": "실드 1회",
  "percentage": 10,
  "randomValue": "7.234"
}
```

### 에러 발생
```json
{
  "timestamp": "2025-01-15 14:30:25",
  "level": "error",
  "message": "Failed to fetch fanscore ranking",
  "error": "ENOENT: no such file or directory",
  "stack": "Error: ENOENT: no such file or directory...",
  "dataPath": "/path/to/fanscore.json"
}
```

### 템플릿 생성 실패
```json
{
  "timestamp": "2025-01-15 14:30:25",
  "level": "warn",
  "message": "Template creation failed: total percentage exceeds 100%",
  "templateId": "template-1",
  "totalPercentage": 150
}
```

## 🛠 로그 모니터링

### 실시간 로그 확인
```bash
# 에러 로그만 실시간 확인
tail -f apps/background/logs/error-$(date +%Y-%m-%d).log

# 모든 로그 실시간 확인
tail -f apps/background/logs/combined-$(date +%Y-%m-%d).log
```

### 로그 검색
```bash
# 특정 사용자 관련 로그 검색
grep "userId.*12345" apps/background/logs/combined-*.log

# 에러 로그만 검색
grep "ERROR" apps/background/logs/combined-*.log

# 특정 시간대 로그 검색
grep "14:30" apps/background/logs/combined-*.log
```

### 로그 통계
```bash
# 일일 요청 수
grep "HTTP Request" apps/background/logs/combined-$(date +%Y-%m-%d).log | wc -l

# 에러 발생 수
grep "ERROR" apps/background/logs/error-$(date +%Y-%m-%d).log | wc -l

# 가장 많이 발생하는 에러
grep "ERROR" apps/background/logs/error-*.log | cut -d'"' -f4 | sort | uniq -c | sort -nr
```

## 🔧 로그 설정 변경

### 로그 레벨 변경
`apps/background/src/utils/logger.ts`에서 수정:
```typescript
level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug'
```

### 로그 보관 기간 변경
```typescript
maxFiles: '30d'  // 30일로 변경
```

### 로그 파일 크기 변경
```typescript
maxSize: '50m'  // 50MB로 변경
```

## 📈 성능 고려사항

- 로그 파일은 비동기로 작성되어 성능에 미치는 영향이 최소화됩니다
- 개발 환경에서는 콘솔 출력이 추가로 활성화됩니다
- 프로덕션 환경에서는 파일 로그만 사용됩니다
- 로그 파일은 자동으로 압축되어 디스크 공간을 절약합니다

## 🚨 주의사항

- 로그 파일에는 민감한 정보(비밀번호, 토큰 등)가 포함되지 않도록 주의하세요
- 로그 파일은 정기적으로 백업하고 보관하세요
- 프로덕션 환경에서는 로그 레벨을 `info` 이상으로 설정하세요
- 로그 파일 권한을 적절히 설정하여 보안을 유지하세요
