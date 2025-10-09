/**
 * 명령어 파싱 유틸리티
 */

export interface ParsedCommand {
  command: string;
  args: string[];
  rawMessage: string;
}

/**
 * 채팅 메시지에서 명령어를 파싱합니다
 * @param message 채팅 메시지
 * @returns 파싱된 명령어 또는 null
 */
export function parseCommand(message: string): ParsedCommand | null {
  const trimmed = message.trim();
  
  // 명령어는 !로 시작
  if (!trimmed.startsWith('!')) {
    return null;
  }
  
  // 공백으로 분리
  const parts = trimmed.split(/\s+/);
  const command = parts[0].substring(1).toLowerCase(); // ! 제거 후 소문자로
  const args = parts.slice(1);
  
  return {
    command,
    args,
    rawMessage: message,
  };
}

/**
 * 명령어 핸들러 타입
 */
export type CommandHandler = (args: string[], context: any) => Promise<void>;

/**
 * 명령어 레지스트리
 */
export class CommandRegistry {
  private handlers: Map<string, CommandHandler> = new Map();
  
  /**
   * 명령어 핸들러를 등록합니다
   * @param command 명령어 이름
   * @param handler 핸들러 함수
   */
  register(command: string, handler: CommandHandler): void {
    this.handlers.set(command.toLowerCase(), handler);
  }
  
  /**
   * 명령어를 실행합니다
   * @param command 명령어 이름
   * @param args 인자
   * @param context 컨텍스트
   * @returns 핸들러가 실행되었는지 여부
   */
  async execute(command: string, args: string[], context: any): Promise<boolean> {
    const handler = this.handlers.get(command.toLowerCase());
    if (!handler) {
      return false;
    }
    
    await handler(args, context);
    return true;
  }
  
  /**
   * 등록된 명령어 목록을 반환합니다
   */
  getCommands(): string[] {
    return Array.from(this.handlers.keys());
  }
}

