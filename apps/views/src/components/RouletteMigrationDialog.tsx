import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface RouletteMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type MigrationType = 1 | 2 | 3 | 4 | null;

interface PreviewData {
  success: boolean;
  bundleFound: boolean;
  template?: any;
  templates?: any[];
  historyCount?: number;
  historyPreview?: any[];
  error?: string;
}

export function RouletteMigrationDialog({ open, onOpenChange, onSuccess }: RouletteMigrationDialogProps) {
  const [step, setStep] = useState<'select' | 'preview' | 'confirm' | 'executing'>('select');
  const [selectedType, setSelectedType] = useState<MigrationType>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  
  // 아이템 페이지네이션
  const [itemsPage, setItemsPage] = useState(0);
  const itemsPerPage = 10;
  
  // 히스토리 페이지네이션
  const [historyPage, setHistoryPage] = useState(0);
  const historyPerPage = 10;

  // Dialog가 닫힐 때 초기화
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedType(null);
      setPreviewData(null);
      setLoading(false);
      setProgress({ current: 0, total: 0 });
      setShowDuplicateWarning(false);
      setItemsPage(0);
      setHistoryPage(0);
    }
  }, [open]);

  // 타입 선택
  const migrationTypes = [
    {
      id: 1 as const,
      title: '공식 룰렛',
      description: '공식 룰렛 번들의 설정을 가져옵니다.',
    },
    {
      id: 2 as const,
      title: '[gloomy] 룰렛 자동킵 버전',
      description: '설정과 룰렛 기록을 모두 가져옵니다.',
    },
    {
      id: 3 as const,
      title: '🎆하 늘 𝓂𝄞𝓇 룰렛🎆',
      description: '최대 4개의 템플릿과 기록을 가져옵니다.',
    },
    {
      id: 4 as const,
      title: '[crown] 룰렛과 기록',
      description: '[crown] 룰렛 번들의 설정을 가져옵니다.',
    },
  ];

  // 미리보기 데이터 로드
  const loadPreview = async (type: MigrationType) => {
    if (!type) return;

    setLoading(true);
    try {
      const response = await fetch(`stp://starter-pack.sopia.dev/migration/roulette/preview?type=${type}`);
      const data: PreviewData = await response.json();

      if (!data.success) {
        toast.error(data.error || '미리보기 로드 실패');
        setStep('select');
        setSelectedType(null);
        return;
      }

      setPreviewData(data);
      setStep('preview');
    } catch (error) {
      console.error('Failed to load preview:', error);
      toast.error('미리보기 로드에 실패했습니다.');
      setStep('select');
      setSelectedType(null);
    } finally {
      setLoading(false);
    }
  };

  // 타입 선택 핸들러
  const handleSelectType = async (type: MigrationType) => {
    setSelectedType(type);
    setItemsPage(0);
    setHistoryPage(0);
    await loadPreview(type);
  };

  // 마이그레이션 실행 (중복 체크 포함)
  const handleMigrate = async () => {
    // 중복 체크: 이미 마이그레이션된 템플릿이 있는지 확인
    try {
      const response = await fetch('stp://starter-pack.sopia.dev/templates');
      const existingTemplates = await response.json();

      const isDuplicate = existingTemplates.some((t: any) =>
        t.template_id.startsWith(`migrated-type${selectedType}-`)
      );

      if (isDuplicate) {
        setShowDuplicateWarning(true);
        return;
      }

      // 중복이 없으면 바로 실행
      await executeMigration();
    } catch (error) {
      console.error('Failed to check duplicates:', error);
      // 체크 실패 시에도 일단 진행
      await executeMigration();
    }
  };

  // 실제 마이그레이션 실행
  const executeMigration = async () => {
    setShowDuplicateWarning(false);
    setStep('executing');

    try {
      // 예상 진행도 계산 (history가 있는 경우)
      const totalUsers = previewData?.historyCount || 0;

      // 진행도 시뮬레이션
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 1;
        if (currentProgress <= totalUsers) {
          setProgress({ current: currentProgress, total: totalUsers });
        }
      }, 500);

      const response = await fetch('stp://starter-pack.sopia.dev/migration/roulette/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: selectedType }),
      });

      clearInterval(progressInterval);

      const result = await response.json();

      if (result.success) {
        toast.success(
          `마이그레이션 완료! 템플릿 ${result.templatesAdded}개, 기록 ${result.historyAdded}개 추가`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || '마이그레이션 실패');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('마이그레이션에 실패했습니다.');
    }
  };

  // 타입별 템플릿 정보 렌더링
  const renderTemplateInfo = (template: any) => (
    <Card key={template.template_id} className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription>
          {template.mode === 'sticker' && `스티커: ${template.sticker}`}
          {template.mode === 'spoon' && `스푼: ${template.spoon}개`}
          {template.mode === 'like' && '좋아요'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant={template.enabled ? 'default' : 'secondary'}>
            {template.enabled ? '활성화' : '비활성화'}
          </Badge>
          <Badge variant={template.auto_run ? 'default' : 'outline'}>
            {template.auto_run ? '자동 실행' : '수동 실행'}
          </Badge>
          <Badge variant={template.division ? 'default' : 'outline'}>
            {template.division ? '분배' : '미분배'}
          </Badge>
        </div>
        <div className="pt-2 border-t">
          <p className="font-semibold mb-2">아이템 ({template.items.length}개)</p>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>아이템 이름</TableHead>
                  <TableHead className="text-right">확률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.items
                  .slice(itemsPage * itemsPerPage, (itemsPage + 1) * itemsPerPage)
                  .map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.label}</TableCell>
                      <TableCell className="text-right">{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          {template.items.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                {itemsPage * itemsPerPage + 1}-
                {Math.min((itemsPage + 1) * itemsPerPage, template.items.length)} / {template.items.length}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItemsPage((prev) => Math.max(0, prev - 1))}
                  disabled={itemsPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setItemsPage((prev) =>
                      Math.min(Math.floor((template.items.length - 1) / itemsPerPage), prev + 1)
                    )
                  }
                  disabled={(itemsPage + 1) * itemsPerPage >= template.items.length}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Select Step */}
          {step === 'select' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">룰렛 템플릿 마이그레이션</DialogTitle>
                <DialogDescription>
                  기존 룰렛 번들의 설정을 가져올 방식을 선택하세요.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 py-4">
                {migrationTypes.map((type) => (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                    onClick={() => handleSelectType(type.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{type.title}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Preview Step */}
          {step === 'preview' && previewData && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {migrationTypes.find((t) => t.id === selectedType)?.title} 미리보기
                </DialogTitle>
                <DialogDescription>마이그레이션할 데이터를 확인하세요.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* 템플릿 정보 */}
                <div>
                  <Label className="text-lg font-semibold mb-3 block">템플릿 설정</Label>
                  <div className="space-y-3">
                    {previewData.template && renderTemplateInfo(previewData.template)}
                    {previewData.templates?.map((template) => renderTemplateInfo(template))}
                  </div>
                </div>

                {/* 룰렛 기록 */}
                {(previewData.historyCount ?? 0) > 0 && (
                  <div>
                    <Label className="text-lg font-semibold mb-3 block">
                      룰렛 기록 ({previewData.historyCount}개)
                    </Label>
                    
                    {/* 경고 메시지 */}
                    <Card className="mb-3 border-yellow-500 bg-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-semibold text-yellow-800">기록 유실 주의</p>
                            <p className="text-sm text-yellow-700">
                              기존 당첨된 기록에서 현재 설정된 룰렛 아이템이 없는 경우, 해당 기록은 유실됩니다.
                            </p>
                            <p className="text-sm text-yellow-700">
                              예: <code className="px-1 py-0.5 bg-yellow-100 rounded text-yellow-900">냥체 10분</code>이 당첨된 기록이 있지만 
                              현재 <code className="px-1 py-0.5 bg-yellow-100 rounded text-yellow-900">냥체 10분</code>이란 아이템이 룰렛 세팅에 없는 경우
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-0">
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>닉네임</TableHead>
                                <TableHead>태그</TableHead>
                                <TableHead>아이템</TableHead>
                                {selectedType === 3 && <TableHead className="text-right">개수</TableHead>}
                                <TableHead>템플릿</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(previewData.historyPreview || [])
                                .slice(historyPage * historyPerPage, (historyPage + 1) * historyPerPage)
                                .map((record, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{record.nickname}</TableCell>
                                    <TableCell className="text-gray-600">@{record.tag}</TableCell>
                                    <TableCell>{record.item_label}</TableCell>
                                    {selectedType === 3 && (
                                      <TableCell className="text-right">{record.count}개</TableCell>
                                    )}
                                    <TableCell className="text-gray-600">{record.template_name}</TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                        {(previewData.historyPreview?.length || 0) > historyPerPage && (
                          <div className="flex items-center justify-between p-4">
                            <p className="text-sm text-gray-500">
                              {historyPage * historyPerPage + 1}-
                              {Math.min((historyPage + 1) * historyPerPage, previewData.historyPreview?.length || 0)} / {previewData.historyPreview?.length}
                            </p>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHistoryPage((prev) => Math.max(0, prev - 1))}
                                disabled={historyPage === 0}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setHistoryPage((prev) =>
                                    Math.min(
                                      Math.floor(((previewData.historyPreview?.length || 0) - 1) / historyPerPage),
                                      prev + 1
                                    )
                                  )
                                }
                                disabled={(historyPage + 1) * historyPerPage >= (previewData.historyPreview?.length || 0)}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('select')}>
                  뒤로
                </Button>
                <Button onClick={handleMigrate} disabled={loading}>
                  마이그레이션 하기
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Executing Step */}
          {step === 'executing' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">마이그레이션 진행 중...</DialogTitle>
                <DialogDescription>잠시만 기다려주세요.</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-8">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                  {progress.total > 0 && (
                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold">
                        {progress.total}명 중 {progress.current}명 처리 중...
                      </p>
                      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        예상 소요 시간: 약 {Math.ceil((progress.total - progress.current) * 0.5)}초
                      </p>
                    </div>
                  )}
                  {progress.total === 0 && <p className="text-gray-600">데이터를 처리하고 있습니다...</p>}
                </div>
              </div>
            </>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle>중복 마이그레이션 경고</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              이미 이 타입의 마이그레이션이 진행된 적이 있습니다.
              <br />
              다시 마이그레이션을 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeMigration}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              계속 진행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

