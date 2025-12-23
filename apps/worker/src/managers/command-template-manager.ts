/**
 * CommandTemplateManager
 * 명령어 템플릿 관리 및 메시지 생성
 */

const DOMAIN = 'starter-pack.sopia.dev';

interface CommandTemplate {
  template?: string;
  success?: string;
  header?: string;
  item?: string;
  list_header?: string;
  list_item?: string;
  [key: string]: any;
  variables: string[];
  description: string;
}

interface CommandTemplateData {
  commands: {
    [key: string]: CommandTemplate;
  };
}

export class CommandTemplateManager {
  private templates: CommandTemplateData | null = null;
  private defaultTemplates: CommandTemplateData | null = null;

  /**
   * 템플릿 로드 (성공할 때까지 재시도)
   */
  async loadTemplates(): Promise<void> {
    while (true) {
      try {
        const response = await fetch(`stp://${DOMAIN}/command`);

        if (!response.ok) {
          console.log(`[CommandTemplateManager] Command API not ready (${response.status}), retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const data = await response.json();

        // 유효한 템플릿 객체인지 확인
        if (!data || typeof data !== 'object' || 'error' in data || !data.commands) {
          console.log('[CommandTemplateManager] Invalid response, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        this.templates = data;
        console.log('[CommandTemplateManager] Templates loaded successfully');
        break;
      } catch (error) {
        console.error('[CommandTemplateManager] Error loading templates, retrying in 1 second...', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * 특정 명령어 템플릿 가져오기
   */
  getTemplate(commandName: string): CommandTemplate | null {
    if (!this.templates || !this.templates.commands) {
      return null;
    }
    return this.templates.commands[commandName] || null;
  }

  /**
   * 템플릿 메시지 생성
   * @param commandName 명령어 이름
   * @param messageType 메시지 타입 (template, success, error_* 등)
   * @param variables 변수 객체
   */
  formatMessage(
    commandName: string,
    messageType: string,
    variables: { [key: string]: any }
  ): string | null {
    const template = this.getTemplate(commandName);
    
    if (!template || !template[messageType]) {
      return null;
    }

    let message = template[messageType];

    // 변수 치환
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      const value = variables[key];
      
      // null이나 undefined 처리
      const replacementValue = value !== null && value !== undefined ? String(value) : '';
      
      message = message.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacementValue);
    });

    return message;
  }

  /**
   * 기본 메시지 또는 템플릿 메시지 반환
   * 템플릿이 없으면 기본 메시지를 반환
   */
  getMessage(
    commandName: string,
    messageType: string,
    variables: { [key: string]: any },
    defaultMessage: string
  ): string {
    const formattedMessage = this.formatMessage(commandName, messageType, variables);
    return formattedMessage !== null ? formattedMessage : defaultMessage;
  }

  /**
   * 매니저 초기화 여부 확인
   */
  isLoaded(): boolean {
    return this.templates !== null;
  }

  /**
   * 매니저 리로드
   */
  async reload(): Promise<void> {
    console.log('[CommandTemplateManager] Reloading templates...');
    await this.loadTemplates();
  }
}

