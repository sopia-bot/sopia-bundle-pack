import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Save, RotateCcw, Eye, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

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

// 명령어 카테고리별 그룹핑
const COMMAND_CATEGORIES = {
  '애청지수': ['내정보', '내정보_생성', '내정보_삭제', '상점', '감점', '랭크'],
  '룰렛': ['룰렛', '룰렛_목록', '룰렛_실행', '룰렛_전체', '룰렛_자동', '킵', '사용'],
  '복권': ['복권', '복권_자동', '복권지급_전체', '복권지급', '복권양도'],
  '사용자': ['고유닉'],
  '실드': ['실드', '실드_변경']
};


// 변수 설명 매핑
const VARIABLE_DESCRIPTIONS: { [key: string]: string } = {
  nickname: '사용자 닉네임',
  tag: '사용자 고유닉',
  rank: '순위',
  score: '애청지수 (경험치)',
  level: '레벨 (진행률 포함, 예: 5.23)',
  chat_count: '채팅 횟수',
  like_count: '좋아요 횟수',
  spoon_count: '스푼 개수',
  roulette_tickets: '룰렛 티켓 수',
  lottery_tickets: '복권 티켓 수',
  target_nickname: '대상 사용자 닉네임',
  target_tag: '대상 사용자 고유닉',
  shield_count: '실드 개수',
  change: '변경량 (절댓값)',
  action: '동작 (증가/감소)',
  count: '개수',
  template_index: '템플릿 번호',
  template_name: '템플릿 이름',
  template_id: '템플릿 ID',
  template_description: '템플릿 설명',
  item_index: '아이템 번호',
  item_label: '아이템 이름',
  item_detail: '아이템 상세',
  item_count: '아이템 개수',
  total_spins: '총 실행 횟수',
  available_tickets: '보유 티켓 수',
  max_template: '최대 템플릿 번호',
  user_numbers: '선택한 숫자',
  winning_numbers: '당첨 숫자',
  matched_count: '맞춘 개수',
  reward: '보상 점수',
  total_played: '실행한 복권 수',
  total_reward: '총 보상 점수',
  target_count: '대상 수',
  my_tickets: '내 보유 티켓 수',
  value: '값',
  rank_1_nickname: '1위 닉네임',
  rank_1_level: '1위 레벨',
  rank_2_nickname: '2위 닉네임',
  rank_2_level: '2위 레벨',
  rank_3_nickname: '3위 닉네임',
  rank_3_level: '3위 레벨',
  rank_4_nickname: '4위 닉네임',
  rank_4_level: '4위 레벨',
  rank_5_nickname: '5위 닉네임',
  rank_5_level: '5위 레벨',
  chat_king_nickname: '채팅왕 닉네임',
  chat_king_count: '채팅왕 채팅 횟수',
  like_king_nickname: '하트왕 닉네임',
  like_king_count: '하트왕 하트 횟수'
};

// 간단한 textarea 에디터 컴포넌트
function SimpleTextEditor({
  value,
  onChange,
  placeholder,
  variables = []
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variables?: string[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 모든 명령어에 nickname, tag를 추가 (중복 제거)
  const allVariables = Array.from(new Set(['nickname', 'tag', ...variables]));

  // 변수 삽입
  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    // 현재 표시값 (\\n이 \n으로 변환된 상태)
    const displayValue = value.replace(/\\n/g, '\n');
    
    // 커서 위치에 {변수} 형태로 삽입
    const variableText = `{${variable}}`;
    const newDisplayValue = displayValue.substring(0, start) + variableText + displayValue.substring(end);
    
    // 저장용으로 \n을 \\n으로 변환
    const newValue = newDisplayValue.replace(/\n/g, '\\n');
    onChange(newValue);

    // 커서를 삽입된 변수 뒤로 이동
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + variableText.length;
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // \\n을 실제 개행으로 표시 (편집용)
  const displayValue = value.replace(/\\n/g, '\n');

  // 입력 변경 처리 (undo/redo를 위해 실시간 변환 없이 그대로 저장)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 표시값 그대로 저장 (\n 포함)
    const newDisplayValue = e.target.value;
    // 저장용으로 \n을 \\n으로 변환
    const newValue = newDisplayValue.replace(/\n/g, '\\n');
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full min-h-[200px] p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />
      
      {allVariables && allVariables.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          <span className="text-xs font-medium text-gray-600 mr-2">사용 가능한 변수:</span>
          <TooltipProvider delayDuration={200}>
            {allVariables.map((variable) => (
              <Tooltip key={variable}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => insertVariable(variable)}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                  >
                    {variable}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{VARIABLE_DESCRIPTIONS[variable] || variable}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

// 샘플 데이터 생성 함수
function generateSampleData(variables: string[]): { [key: string]: string } {
  const samples: { [key: string]: string } = {};
  variables.forEach(v => {
    if (v.includes('nickname')) samples[v] = '홍길동';
    else if (v.includes('rank')) samples[v] = '1';
    else if (v.includes('level')) samples[v] = '5.23';
    else if (v.includes('score')) samples[v] = '1000';
    else if (v.includes('count')) samples[v] = '100';
    else if (v.includes('tickets')) samples[v] = '10';
    else if (v.includes('tag')) samples[v] = 'user123';
    else if (v.includes('index')) samples[v] = '1';
    else if (v.includes('label')) samples[v] = '아이템';
    else if (v.includes('name')) samples[v] = '템플릿명';
    else if (v.includes('description')) samples[v] = '설명';
    else if (v.includes('id')) samples[v] = 'template_001';
    else samples[v] = '예시값';
  });
  return samples;
}

// 템플릿 미리보기 적용 함수
function applyPreview(template: string, variables: string[]): string {
  // nickname과 tag를 항상 포함 (중복 제거)
  const allVariables = Array.from(new Set(['nickname', 'tag', ...variables]));
  const sampleData = generateSampleData(allVariables);
  let preview = template;
  Object.keys(sampleData).forEach(key => {
    preview = preview.replace(new RegExp(`\\{${key}\\}`, 'g'), sampleData[key]);
  });
  // \\n을 실제 줄바꿈으로 변환 (미리보기용)
  return preview.replace(/\\n/g, '\n');
}

// 미리보기 컴포넌트
function PreviewDialog({ 
  template, 
  variables, 
  isOpen, 
  onClose,
  title = "미리보기"
}: { 
  template: string; 
  variables: string[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}) {
  if (!isOpen) return null;

  const preview = applyPreview(template, variables);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
          <div className="whitespace-pre-wrap font-mono text-sm">{preview}</div>
        </div>

        <div className="text-xs text-gray-500 mb-4">
          * 실제 데이터가 아닌 샘플 데이터로 표시됩니다
        </div>

        <Button onClick={onClose} className="w-full">
          닫기
        </Button>
      </div>
    </div>
  );
}

export function ChatBuilder() {
  const [commandData, setCommandData] = useState<CommandTemplateData | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{ [key: string]: string }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('미리보기');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 템플릿 데이터 로드
  useEffect(() => {
    loadCommandData();
  }, []);

  const loadCommandData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('stp://starter-pack.sopia.dev/command');
      
      if (response.ok) {
        const data = await response.json();
        setCommandData(data);
      } else {
        toast.error('명령어 템플릿을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to load command data:', error);
      toast.error('명령어 템플릿을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 명령어 선택
  const selectCommand = (commandName: string) => {
    setSelectedCommand(commandName);
    if (commandData && commandData.commands[commandName]) {
      const template = commandData.commands[commandName];
      const editing: { [key: string]: string } = {};
      
      // 모든 편집 가능한 필드를 editing 객체에 추가
      Object.keys(template).forEach(key => {
        if (key !== 'variables' && key !== 'description' && typeof template[key] === 'string') {
          editing[key] = template[key];
        }
      });
      
      setEditingTemplate(editing);
    }
  };

  // 저장
  const saveTemplate = async () => {
    if (!selectedCommand) return;

    try {
      setIsSaving(true);
      const response = await fetch(`stp://starter-pack.sopia.dev/command/${selectedCommand}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingTemplate)
      });

      if (response.ok) {
        toast.success('명령어 템플릿이 저장되었습니다.');
        await loadCommandData(); // 새로고침
      } else {
        toast.error('명령어 템플릿 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('명령어 템플릿 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 기본값으로 리셋
  const resetToDefault = async () => {
    if (!selectedCommand) return;

    try {
      const response = await fetch(`stp://starter-pack.sopia.dev/command/${selectedCommand}/reset`, {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('기본값으로 복원되었습니다.');
        await loadCommandData();
        selectCommand(selectedCommand); // 다시 선택하여 UI 업데이트
      } else {
        toast.error('기본값 복원에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to reset template:', error);
      toast.error('기본값 복원에 실패했습니다.');
    }
  };

  const currentTemplate = selectedCommand && commandData ? commandData.commands[selectedCommand] : null;

  // 복합 구조 감지 및 미리보기 생성
  const getFieldPreviewContent = (fieldKey: string): string => {
    const value = editingTemplate[fieldKey];
    if (!value) return '';

    // list_header + list_item 복합 구조
    if (fieldKey === 'list_header' && editingTemplate['list_item']) {
      return `${value}\\n${editingTemplate['list_item']}\\n${editingTemplate['list_item']}\\n${editingTemplate['list_item']}`;
    }
    if (fieldKey === 'list_item' && editingTemplate['list_header']) {
      return `${editingTemplate['list_header']}\\n${value}\\n${value}\\n${value}`;
    }

    // header + item 복합 구조
    if (fieldKey === 'header' && editingTemplate['item']) {
      return `${value}\\n${editingTemplate['item']}\\n${editingTemplate['item']}\\n${editingTemplate['item']}`;
    }
    if (fieldKey === 'item' && editingTemplate['header']) {
      return `${editingTemplate['header']}\\n${value}\\n${value}\\n${value}`;
    }

    return value;
  };

  // 필드별 미리보기 열기
  const openFieldPreview = (fieldKey: string) => {
    const content = getFieldPreviewContent(fieldKey);
    const title = fieldKey === 'template' ? '템플릿 미리보기' :
                  fieldKey === 'success' ? '성공 메시지 미리보기' :
                  fieldKey.startsWith('error_') ? `에러 미리보기: ${fieldKey.replace('error_', '')}` :
                  fieldKey === 'list_header' || fieldKey === 'list_item' ? '리스트 미리보기 (합쳐진 결과)' :
                  fieldKey === 'header' || fieldKey === 'item' ? '리스트 미리보기 (합쳐진 결과)' :
                  `${fieldKey} 미리보기`;
    
    setPreviewContent(content);
    setPreviewTitle(title);
    setShowPreview(true);
  };

  // 필드 라벨 표시 함수
  const getFieldLabel = (key: string): string => {
    if (key === 'template') return '템플릿';
    if (key === 'success') return '성공 메시지';
    if (key === 'list_header') return '리스트 헤더';
    if (key === 'list_item') return '리스트 아이템 (반복됨)';
    if (key === 'header') return '헤더';
    if (key === 'item') return '아이템 (반복됨)';
    if (key.startsWith('error_')) return `에러: ${key.replace('error_', '')}`;
    return key;
  };

  // 명령어 이름 포맷팅 (표시용)
  const formatCommandName = (cmd: string): string => {
    return '!' + cmd.replace(/_/g, ' ');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* 헤더 */}
        <Card>
          <CardHeader>
            <CardTitle>명령어 꾸미기</CardTitle>
            <CardDescription>
              각 명령어의 출력 형식을 자유롭게 수정할 수 있습니다. 
              변수를 사용하여 동적인 정보를 표시할 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 메인 컨텐츠 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 사이드바: 명령어 목록 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">명령어 목록</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(COMMAND_CATEGORIES).map(([category, commands]) => (
                  <div key={category}>
                    <div className="text-sm font-semibold text-gray-600 mb-2">{category}</div>
                    <div className="space-y-1">
                      {commands.map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => selectCommand(cmd)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedCommand === cmd
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {formatCommandName(cmd)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 편집 영역 */}
          <div className="lg:col-span-3">
            {!selectedCommand ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  왼쪽 목록에서 명령어를 선택해주세요.
                </CardContent>
              </Card>
            ) : currentTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{formatCommandName(selectedCommand)}</CardTitle>
                      <CardDescription>{currentTemplate.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetToDefault}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        기본값
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveTemplate}
                        disabled={isSaving}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.keys(editingTemplate).map((key) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          {getFieldLabel(key)}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openFieldPreview(key)}
                          className="h-7 px-2"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          미리보기
                        </Button>
                      </div>
                      <SimpleTextEditor
                        value={editingTemplate[key]}
                        onChange={(value) => setEditingTemplate({ ...editingTemplate, [key]: value })}
                        placeholder={`${key} 템플릿을 입력하세요...`}
                        variables={currentTemplate.variables}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        {/* 미리보기 다이얼로그 */}
        {currentTemplate && previewContent && (
          <PreviewDialog
            template={previewContent}
            variables={currentTemplate.variables}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            title={previewTitle}
          />
        )}
      </div>
    </Layout>
  );
}

