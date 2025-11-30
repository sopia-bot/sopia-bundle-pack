import fs from 'fs';
import path from 'path';
import logger from './logger';

// 데이터 디렉토리 경로
const dataDir = path.join(__pkgdir, 'data');

// 파일별 작업 큐를 관리하는 맵
const fileOperationQueues = new Map<string, Promise<any>>();

/**
 * 파일 작업을 큐에 추가하여 순차적으로 실행
 * @param filename 파일명
 * @param operation 실행할 작업
 * @returns 작업 결과
 */
async function queueFileOperation<T>(filename: string, operation: () => T | Promise<T>): Promise<T> {
  // 해당 파일의 마지막 작업 가져오기
  const lastOperation = fileOperationQueues.get(filename) || Promise.resolve();

  // 새 작업을 체이닝
  const newOperation = lastOperation
    .then(() => operation())
    .catch((error) => {
      // 이전 작업의 에러는 로깅만 하고 현재 작업은 계속 진행
      logger.warn('Previous file operation failed', {
        filename,
        error: error?.message || 'Unknown error'
      });
      return operation();
    });

  // 큐에 새 작업 저장
  fileOperationQueues.set(filename, newOperation);

  // 작업 완료 후 큐에서 제거 (메모리 관리)
  newOperation.finally(() => {
    if (fileOperationQueues.get(filename) === newOperation) {
      fileOperationQueues.delete(filename);
    }
  });

  return newOperation;
}

// 기본 데이터 정의
export const defaultData = {
  fanscore: [
  ],

  'fanscore-config': {
    enabled: true,
    attendance_score: 10,
    chat_score: 1,
    like_score: 10,
    spoon_score: 100,
    quiz_enabled: false,
    quiz_bonus: 10,
    quiz_interval: 180,
    quiz_timeout: 5,
    lottery_enabled: false,
    lottery_spoon_required: 50,
    lottery_reward_0_match: 0,
    lottery_reward_1_match: 10,
    lottery_reward_2_match: 100,
    lottery_reward_3_match: 1000,
    show_score: true
  },

  templates: [
    {
      template_id: "default-1",
      name: "기본 룰렛",
      mode: "sticker",
      sticker: "sticker_kr_star",
      spoon: 1,
      division: true,
      auto_run: true,
      enabled: true,
      items: [
        { type: "shield", label: "실드 1회", percentage: 10 },
        { type: "ticket", label: "복권", percentage: 0.001 },
        { type: "custom", label: "어떠한 커스텀 아이템", percentage: 0.001 }
      ]
    }
  ],

  'roulette-history': [],

  // 사용자별 룰렛 티켓 및 킵 아이템
  roulette: {
    tickets: [],  // UserRouletteTickets[]
    keepItems: [] // UserKeepItems[]
  },

  quiz: [],

  shield: {
    shield_count: 0,
    history: []
  },

  'yacht-config': {
    enabled: true,
    winning_score: 50,
    score_multiplier: 100,
    game_cooldown: 60
  },

  command: {
    commands: {
      "내정보": {
        template: "📊 {nickname}님의 정보\\n\\n🏆 순위: {rank}위\\n⭐ 레벨: Lv.{level}\\n💬 채팅: {chat_count}회\\n❤️ 좋아요: {like_count}회\\n🥄 스푼: {spoon_count}개\\n🎟️ 룰렛: {roulette_tickets}장\\n🎫 복권: {lottery_tickets}장",
        variables: ["nickname", "tag", "rank", "score", "level", "chat_count", "like_count", "spoon_count", "roulette_tickets", "lottery_tickets"],
        description: "본인 정보 조회"
      },
      "내정보_생성": {
        success: "✅ 애청지수 시스템에 등록되었습니다!",
        error_already_exists: "⚠️ 이미 등록된 사용자입니다.",
        error_failed: "❌ 등록에 실패했습니다.",
        variables: ["nickname", "tag"],
        description: "애청지수 시스템 등록"
      },
      "내정보_삭제": {
        success: "✅ 애청지수 시스템에서 탈퇴되었습니다.",
        error_not_found: "⚠️ 등록되지 않은 사용자입니다.",
        error_failed: "❌ 탈퇴에 실패했습니다.",
        variables: ["nickname", "tag"],
        description: "애청지수 시스템 탈퇴"
      },
      "상점": {
        success: "✅ {target_nickname}님에게 {score}점을 부여했습니다.",
        error_not_admin: "❌ 이 명령어는 DJ만 사용할 수 있습니다.",
        error_usage: "❌ 사용법: !상점 [고유닉] [점수]",
        error_invalid_score: "❌ 점수는 1 이상의 숫자여야 합니다.",
        error_user_not_found: "⚠️ \"{target_tag}\" 사용자를 찾을 수 없습니다.",
        error_not_registered: "⚠️ \"{target_tag}\" 사용자가 등록되어 있지 않습니다.",
        error_failed: "❌ 점수 부여에 실패했습니다.",
        variables: ["nickname", "tag", "target_nickname", "score", "target_tag"],
        description: "DJ 전용, 특정 사용자에게 점수 부여"
      },
      "감점": {
        success: "✅ {target_nickname}님의 점수를 {score}점 감소했습니다.",
        error_not_admin: "❌ 이 명령어는 DJ만 사용할 수 있습니다.",
        error_usage: "❌ 사용법: !감점 [고유닉] [점수]",
        error_invalid_score: "❌ 점수는 1 이상의 숫자여야 합니다.",
        error_user_not_found: "⚠️ \"{target_tag}\" 사용자를 찾을 수 없습니다.",
        error_not_registered: "⚠️ \"{target_tag}\" 사용자가 등록되어 있지 않습니다.",
        error_failed: "❌ 점수 감소에 실패했습니다.",
        variables: ["nickname", "tag", "target_nickname", "score", "target_tag"],
        description: "DJ 전용, 특정 사용자의 점수 감소"
      },
      "랭크": {
        template: "🏆 애청지수 TOP 5\\n\\n🥇 {rank_1_nickname} - Lv.{rank_1_level}\\n🥈 {rank_2_nickname} - Lv.{rank_2_level}\\n🥉 {rank_3_nickname} - Lv.{rank_3_level}\\n4️⃣ {rank_4_nickname} - Lv.{rank_4_level}\\n5️⃣ {rank_5_nickname} - Lv.{rank_5_level}\\n\\n💬 채팅왕: {chat_king_nickname} - ({chat_king_count}회)\\n❤️ 하트왕: {like_king_nickname} - ({like_king_count}회)",
        error_no_users: "⚠️ 아직 등록된 사용자가 없습니다.",
        error_failed: "❌ 랭킹 조회에 실패했습니다.",
        variables: [
          "nickname", "tag",
          "rank_1_nickname", "rank_1_level",
          "rank_2_nickname", "rank_2_level",
          "rank_3_nickname", "rank_3_level",
          "rank_4_nickname", "rank_4_level",
          "rank_5_nickname", "rank_5_level",
          "chat_king_nickname", "chat_king_count",
          "like_king_nickname", "like_king_count"
        ],
        description: "상위 5명 랭킹 및 채팅/하트왕 표시"
      },
      "룰렛": {
        list_header: "[룰렛 목록]",
        list_item: "{template_index}. {template_name} ({template_description})",
        error_no_templates: "활성화된 룰렛이 없습니다.",
        error_failed: "룰렛 목록 조회 중 오류가 발생했습니다.",
        variables: ["nickname", "tag", "template_index", "template_name", "template_description"],
        description: "템플릿 리스트 표시"
      },
      "룰렛_목록": {
        header: "[룰렛 아이템: {template_name}]\\n템플릿 ID: {template_id}\\n",
        item: "{item_index}. {item_label}{item_detail}",
        item_detail_shield: " [실드 {value}]",
        item_detail_ticket: " [복권 {value}장]",
        error_no_items: "아이템이 없습니다.",
        error_invalid_number: "올바른 템플릿 번호를 입력해주세요.",
        error_usage: "사용법: !룰렛 목록 [템플릿 번호]",
        error_failed: "룰렛 아이템 조회 중 오류가 발생했습니다.",
        variables: ["nickname", "tag", "template_name", "template_id", "item_index", "item_label", "item_detail", "value"],
        description: "특정 템플릿의 아이템 목록 표시"
      },
      "룰렛_실행": {
        error_no_tickets: "{nickname}님, 해당 템플릿의 티켓이 없습니다.",
        error_insufficient_tickets: "티켓이 부족합니다. (보유: {available_tickets}개)",
        error_invalid_count: "올바른 횟수를 입력해주세요.",
        error_invalid_template: "템플릿 번호는 1부터 {max_template}까지 입니다.",
        error_failed: "룰렛 실행 중 오류가 발생했습니다.",
        variables: ["nickname", "tag", "available_tickets", "max_template"],
        description: "룰렛 실행"
      },
      "룰렛_전체": {
        error_no_tickets: "{nickname}님, 사용 가능한 티켓이 없습니다.",
        error_failed: "룰렛 실행 중 오류가 발생했습니다.",
        variables: ["nickname", "tag"],
        description: "모든 템플릿의 티켓 사용"
      },
      "룰렛_자동": {
        header: "[{nickname}님 룰렛 자동 실행 결과]\\n총 {total_spins}회 실행\\n",
        item: "- {item_label} x{item_count}",
        error_no_tickets: "{nickname}님, 사용 가능한 티켓이 없습니다.",
        error_failed: "룰렛 실행 중 오류가 발생했습니다.",
        variables: ["nickname", "tag", "total_spins", "item_label", "item_count"],
        description: "모든 템플릿의 티켓을 사용하고 결과를 합산하여 표시"
      },
      "킵": {
        header: "[{nickname}님 킵 목록]",
        item: "{item_index}. {item_label} x{item_count}",
        error_empty: "{nickname}님, 킵 목록이 비어있습니다.",
        error_failed: "킵 목록 조회 중 오류가 발생했습니다.",
        variables: ["nickname", "tag", "item_index", "item_label", "item_count"],
        description: "킵 아이템 목록 조회"
      },
      "사용": {
        success: "{nickname}님이 {item_label}을(를) 사용했습니다.",
        error_usage: "사용법: !사용 [숫자]",
        error_invalid_number: "올바른 숫자를 입력해주세요.",
        error_failed: "아이템 사용에 실패했습니다. 킵 목록을 확인해주세요.",
        error_failed_general: "아이템 사용 중 오류가 발생했습니다.",
        variables: ["nickname", "tag", "item_label"],
        description: "킵 아이템 사용"
      },
      "복권": {
        error_usage_general: "❌ 사용법: !복권 [숫자1] [숫자2] [숫자3] 또는 !복권 자동",
        error_usage: "❌ 사용법: !복권 [숫자1] [숫자2] [숫자3] (0~9 사이의 숫자)",
        error_invalid_numbers: "❌ 숫자는 0~9 사이여야 합니다.",
        error_duplicate: "❌ 중복되지 않은 3개의 숫자를 입력해주세요.",
        variables: ["nickname", "tag", "user_numbers", "winning_numbers", "matched_count", "reward"],
        description: "복권 실행"
      },
      "복권_자동": {
        variables: ["nickname", "tag", "total_played", "total_reward"],
        description: "자동 복권 실행"
      },
      "복권지급_전체": {
        success: "✅ 현재 방에 있는 {target_count}명에게 복권 {count}장씩 지급했습니다.",
        error_not_admin: "❌ 이 명령어는 DJ만 사용할 수 있습니다.",
        error_usage: "❌ 사용법: !복권지급 전체 [갯수] 또는 !복권지급 [고유닉] [갯수]",
        error_invalid_count: "❌ 갯수는 1 이상의 숫자여야 합니다.",
        error_no_listeners: "⚠️ 현재 방에 등록된 청취자가 없습니다.",
        error_failed: "❌ 복권 지급에 실패했습니다.",
        variables: ["nickname", "tag", "target_count", "count"],
        description: "DJ 전용, 현재 방에 있는 등록된 청취자에게 복권 지급"
      },
      "복권지급": {
        success: "✅ {target_nickname}님에게 복권 {count}장을 지급했습니다.",
        error_not_admin: "❌ 이 명령어는 DJ만 사용할 수 있습니다.",
        error_usage: "❌ 사용법: !복권지급 전체 [갯수] 또는 !복권지급 [고유닉] [갯수]",
        error_invalid_count: "❌ 갯수는 1 이상의 숫자여야 합니다.",
        error_user_not_found: "⚠️ \"{target_tag}\" 사용자를 찾을 수 없습니다.",
        error_failed: "❌ 복권 지급에 실패했습니다.",
        variables: ["nickname", "tag", "target_nickname", "count", "target_tag"],
        description: "DJ 전용, 특정 유저에게 복권 지급"
      },
      "복권양도": {
        success: "✅ {target_nickname}님에게 복권 {count}장을 양도했습니다.",
        error_usage: "❌ 사용법: !복권양도 [고유닉] [수량]",
        error_invalid_count: "❌ 수량은 1 이상의 숫자여야 합니다.",
        error_not_registered: "⚠️ 등록되지 않은 사용자입니다. \"!내정보 생성\"으로 등록해주세요.",
        error_insufficient: "❌ 복권이 부족합니다. (보유: {my_tickets}장, 필요: {count}장)",
        error_user_not_found: "⚠️ \"{target_tag}\" 사용자를 찾을 수 없습니다.",
        error_self_transfer: "❌ 자기 자신에게는 양도할 수 없습니다.",
        error_failed: "❌ 복권 양도에 실패했습니다.",
        variables: ["nickname", "tag", "target_nickname", "count", "target_tag", "my_tickets"],
        description: "복권 양도"
      },
      "고유닉": {
        template: "{nickname}님의 고유닉: {tag}",
        error_failed: "고유닉 조회 중 오류가 발생했습니다.",
        variables: ["nickname", "tag"],
        description: "사용자의 고유닉(tag) 표시"
      },
      "실드": {
        template: "🛡️ 현재 실드: {shield_count}개",
        error_failed: "❌ 실드 조회에 실패했습니다. 잠시 후 다시 시도해주세요.",
        variables: ["nickname", "tag", "shield_count"],
        description: "현재 실드 개수 조회"
      },
      "실드_변경": {
        success: "✅ 실드가 {change}개 {action}되었습니다. (현재: {shield_count}개)",
        error_not_admin: "❌ 실드 관리는 방송 관리자만 사용할 수 있습니다.",
        error_usage: "❌ 사용법: !실드 + 숫자 또는 !실드 - 숫자",
        error_invalid_format: "❌ 올바른 형식이 아닙니다. 예: !실드 + 10 또는 !실드 - 5",
        error_invalid_number: "❌ 숫자는 1 이상의 양수여야 합니다.",
        error_failed: "❌ 실드 변경에 실패했습니다. 잠시 후 다시 시도해주세요.",
        variables: ["nickname", "tag", "change", "action", "shield_count"],
        description: "실드 증가/감소 (관리자만)"
      }
    }
  }
};

/**
 * 데이터 디렉토리가 존재하는지 확인하고 없으면 생성
 */
export function ensureDataDirectory(): void {
  if (!fs.existsSync(dataDir)) {
    logger.info('Creating data directory', { dataDir });
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * 파일이 존재하는지 확인하고, 없으면 기본 데이터로 초기화
 * @param filename 파일명 (확장자 포함)
 * @param defaultContent 기본 데이터
 * @returns 파일이 존재했는지 여부
 */
export function ensureDataFile(filename: string, defaultContent: any): boolean {
  const filePath = path.join(dataDir, filename);

  if (!fs.existsSync(filePath)) {
    logger.info('Initializing data file with default content', {
      filename,
      filePath
    });

    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
      logger.info('Data file initialized successfully', { filename });
      return false; // 새로 생성됨
    } catch (error) {
      logger.error('Failed to initialize data file', {
        filename,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  return true; // 이미 존재함
}

/**
 * JSON 파일을 안전하게 읽기 (큐 사용)
 * @param filename 파일명
 * @returns 파싱된 JSON 데이터
 */
export async function readJsonFile(filename: string): Promise<any> {
  return queueFileOperation(filename, () => {
    const filePath = path.join(dataDir, filename);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to read JSON file', {
        filename,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  });
}

/**
 * JSON 파일을 안전하게 쓰기 (큐 사용)
 * @param filename 파일명
 * @param data 저장할 데이터
 */
export async function writeJsonFile(filename: string, data: any): Promise<void> {
  return queueFileOperation(filename, () => {
    const filePath = path.join(dataDir, filename);

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      logger.debug('JSON file written successfully', { filename });
    } catch (error) {
      logger.error('Failed to write JSON file', {
        filename,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  });
}

/**
 * 모든 데이터 파일 초기화
 */
export function initializeAllDataFiles(): void {
  logger.info('Initializing all data files');

  ensureDataDirectory();

  // 각 데이터 파일 초기화
  Object.entries(defaultData).forEach(([key, value]) => {
    const filename = key.includes('-') ? `${key}.json` : `${key}.json`;
    ensureDataFile(filename, value);
  });

  logger.info('All data files initialized');
}

/**
 * 특정 데이터 파일 가져오기 (없으면 초기화, 있으면 기본값과 병합)
 * @param dataType 데이터 타입
 * @returns JSON 데이터
 */
export async function getDataFile(dataType: keyof typeof defaultData): Promise<any> {
  const filename = dataType.includes('-') ? `${dataType}.json` : `${dataType}.json`;

  // 파일이 없으면 기본 데이터로 초기화
  ensureDataFile(filename, defaultData[dataType]);

  // 파일 읽기 (큐 사용)
  const fileData = await readJsonFile(filename);

  // 배열 타입은 병합하지 않음
  if (Array.isArray(defaultData[dataType])) {
    return fileData;
  }

  // 객체 타입인 경우 기본값과 병합 (새로 추가된 필드 지원)
  if (typeof defaultData[dataType] === 'object' && defaultData[dataType] !== null) {
    return { ...defaultData[dataType], ...fileData };
  }

  return fileData;
}

/**
 * 특정 데이터 파일 저장
 * @param dataType 데이터 타입
 * @param data 저장할 데이터
 */
export async function saveDataFile(dataType: keyof typeof defaultData, data: any): Promise<void> {
  const filename = dataType.includes('-') ? `${dataType}.json` : `${dataType}.json`;
  return writeJsonFile(filename, data);
}
