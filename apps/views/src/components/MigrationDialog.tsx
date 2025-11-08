import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertCircle, CheckCircle2, Database, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface MigrationConfig {
  chat_score: number;
  like_score: number;
  attendance_score: number;
  lottery_spoon_required: number;
  quiz_enabled: boolean;
  quiz_interval: number;
  quiz_bonus: number;
}

interface MigrationQuiz {
  question: string;
  answer: string;
}

interface MigrationUser {
  nickname: string;
  tag: string;
  score: number;
  exp: number;
  chat_count: number;
  like_count: number;
  spoon_count: number;
  lottery_tickets: number;
}

interface PreviewData {
  config: MigrationConfig;
  quizzes: MigrationQuiz[];
  users: MigrationUser[];
}

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function MigrationDialog({ open, onOpenChange, onComplete }: MigrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0 });
  const [accountChangeConfirmOpen, setAccountChangeConfirmOpen] = useState(false);
  const [accountChanges, setAccountChanges] = useState<Array<{
    tag: string;
    oldUserId: number;
    oldNickname: string;
    newUserId: number;
    newNickname: string;
  }>>([]);
  const [currentAccountChangeIndex, setCurrentAccountChangeIndex] = useState(0);
  const USERS_PER_PAGE = 10;

  // 다이얼로그가 열릴 때 자동으로 preview 데이터 로드
  useEffect(() => {
    if (open && !previewData && !isLoading) {
      loadPreview();
    } else if (!open) {
      // 다이얼로그 닫힐 때 상태 리셋
      setPreviewData(null);
      setError(null);
      setCurrentPage(1);
    }
  }, [open]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('stp://starter-pack.sopia.dev/migration/fanscore/preview');
      const result = await response.json();
      
      if (!result.success) {
        setError(result.message || '데이터를 불러오는데 실패했습니다.');
        return;
      }
      
      setPreviewData(result.data);
    } catch (err: any) {
      setError(err?.message || '파일을 읽는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!previewData) return;
    
    setIsMigrating(true);
    const totalUsers = previewData.users.length;
    setMigrationProgress({ current: 0, total: totalUsers });
    
    // 진행률 시뮬레이션 (500ms 간격으로 API 호출되므로)
    const progressInterval = setInterval(() => {
      setMigrationProgress(prev => {
        if (prev.current < prev.total) {
          return { ...prev, current: prev.current + 1 };
        }
        return prev;
      });
    }, 550); // API 호출 간격(500ms)보다 약간 길게
    
    try {
      const response = await fetch('stp://starter-pack.sopia.dev/migration/fanscore/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: previewData }),
      });
      
      clearInterval(progressInterval);
      setMigrationProgress({ current: totalUsers, total: totalUsers });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '마이그레이션에 실패했습니다.');
      }
      
      // 계정 변경 확인
      const changes = result.result?.accountChanges || [];
      if (changes.length > 0) {
        setAccountChanges(changes);
        setCurrentAccountChangeIndex(0);
        setAccountChangeConfirmOpen(true);
        setIsMigrating(false);
        clearInterval(progressInterval);
        return;
      }
      
      // 성공 메시지
      const failedCount = result.result?.failed || 0;
      if (failedCount > 0) {
        toast.warning(`마이그레이션이 완료되었습니다. (실패: ${failedCount}명)`, {
          description: '일부 사용자의 데이터를 가져오지 못했습니다.',
        });
      } else {
        toast.success('마이그레이션이 완료되었습니다!', {
          description: `총 ${result.result?.migrated || 0}명의 데이터가 이전되었습니다.`,
        });
      }
      
      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error('마이그레이션 실패', {
        description: err?.message || '마이그레이션 중 오류가 발생했습니다.',
      });
    } finally {
      setIsMigrating(false);
      setMigrationProgress({ current: 0, total: 0 });
    }
  };

  const handleAccountChangeConfirm = async (confirmed: boolean) => {
    if (!confirmed) {
      // 취소 시 모달 닫고 마이그레이션 취소
      setAccountChangeConfirmOpen(false);
      setAccountChanges([]);
      setCurrentAccountChangeIndex(0);
      toast.error('마이그레이션이 취소되었습니다.');
      return;
    }

    // 마지막 계정 변경 확인인 경우 룰렛 기록 업데이트 후 마이그레이션 완료 처리
    if (currentAccountChangeIndex >= accountChanges.length - 1) {
      try {
        // 룰렛 기록 업데이트
        let totalRouletteUpdated = 0;
        for (const change of accountChanges) {
          const rouletteResponse = await fetch('stp://starter-pack.sopia.dev/migration/roulette/update-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oldUserId: change.oldUserId,
              newUserId: change.newUserId,
              newNickname: change.newNickname,
            }),
          });
          
          if (rouletteResponse.ok) {
            const rouletteResult = await rouletteResponse.json();
            totalRouletteUpdated += rouletteResult.historyUpdated || 0;
          }
        }
        
        setAccountChangeConfirmOpen(false);
        setAccountChanges([]);
        setCurrentAccountChangeIndex(0);
        
        // 성공 메시지
        const message = totalRouletteUpdated > 0
          ? `총 ${accountChanges.length}개의 계정 변경이 확인되었습니다. (룰렛 기록 ${totalRouletteUpdated}개 업데이트됨)`
          : `총 ${accountChanges.length}개의 계정 변경이 확인되었습니다.`;
        toast.success('마이그레이션이 완료되었습니다!', {
          description: message,
        });
        
        onComplete();
        onOpenChange(false);
      } catch (error: any) {
        toast.error('룰렛 기록 업데이트 실패', {
          description: error?.message || '룰렛 기록을 업데이트하는 중 오류가 발생했습니다.',
        });
      }
    } else {
      // 다음 계정 변경 확인
      setCurrentAccountChangeIndex(prev => prev + 1);
    }
  };

  // 페이지네이션
  const totalPages = previewData ? Math.ceil(previewData.users.length / USERS_PER_PAGE) : 0;
  const paginatedUsers = previewData
    ? previewData.users.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE)
    : [];
  
  const currentAccountChange = accountChanges[currentAccountChangeIndex];

  return (
    <>
      {/* 계정 변경 확인 모달 */}
      <Dialog open={accountChangeConfirmOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-amber-600">
              <AlertTriangle className="h-6 w-6" />
              계정 변경 확인
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              마이그레이션 중 계정 변경이 감지되었습니다.
            </DialogDescription>
          </DialogHeader>

          {currentAccountChange && (
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800 font-medium mb-3">
                  다음 계정의 정보가 변경됩니다:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">원본 계정</p>
                      <p className="font-semibold text-gray-900">{currentAccountChange.oldNickname}</p>
                      <p className="text-xs text-gray-500">ID: {currentAccountChange.oldUserId}</p>
                    </div>
                    <div className="text-amber-600 mx-4">
                      →
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">새 계정</p>
                      <p className="font-semibold text-gray-900">{currentAccountChange.newNickname}</p>
                      <p className="text-xs text-gray-500">ID: {currentAccountChange.newUserId}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <p className="font-medium mb-1">⚠️ 주의사항:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>계정 변경 시 기존 사용자 ID가 새 사용자 ID로 변경됩니다</li>
                      <li>애청지수, 레벨, 순위 등 모든 데이터는 유지됩니다</li>
                      <li>이 작업은 되돌릴 수 없습니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              {accountChanges.length > 1 && (
                <div className="text-sm text-gray-600 text-center">
                  {currentAccountChangeIndex + 1} / {accountChanges.length} 계정 변경 확인 중
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleAccountChangeConfirm(false)}
            >
              취소
            </Button>
            <Button
              onClick={() => handleAccountChangeConfirm(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {accountChanges.length > 1 && currentAccountChangeIndex < accountChanges.length - 1
                ? '다음 확인'
                : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 마이그레이션 다이얼로그 */}
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Database className="h-6 w-6 text-blue-600" />
            애청지수 데이터 마이그레이션
          </DialogTitle>
          <DialogDescription>
            기존 애청지수 번들의 데이터를 불러와서 새로운 형식으로 마이그레이션합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
            <p className="text-red-600 font-medium">{error}</p>
            <Button onClick={loadPreview} variant="outline">
              다시 시도
            </Button>
          </div>
        )}

        {/* 미리보기 데이터 */}
        {previewData && !isLoading && !error && (
          <div className="space-y-6">
            {/* 설정 미리보기 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">설정 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">출석 점수:</span>
                    <span className="ml-2 font-medium">{previewData.config.attendance_score}점</span>
                  </div>
                  <div>
                    <span className="text-gray-500">채팅 점수:</span>
                    <span className="ml-2 font-medium">{previewData.config.chat_score}점</span>
                  </div>
                  <div>
                    <span className="text-gray-500">좋아요 점수:</span>
                    <span className="ml-2 font-medium">{previewData.config.like_score}점</span>
                  </div>
                  <div>
                    <span className="text-gray-500">복권 스푼 개수:</span>
                    <span className="ml-2 font-medium">{previewData.config.lottery_spoon_required}개</span>
                  </div>
                  <div>
                    <span className="text-gray-500">퀴즈 활성화:</span>
                    <span className="ml-2 font-medium">{previewData.config.quiz_enabled ? '예' : '아니오'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">퀴즈 간격:</span>
                    <span className="ml-2 font-medium">{previewData.config.quiz_interval}초</span>
                  </div>
                  <div>
                    <span className="text-gray-500">퀴즈 보너스:</span>
                    <span className="ml-2 font-medium">{previewData.config.quiz_bonus}점</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 퀴즈 미리보기 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">퀴즈 목록 ({previewData.quizzes.length}개)</CardTitle>
              </CardHeader>
              <CardContent>
                {previewData.quizzes.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {previewData.quizzes.map((quiz, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="font-medium text-sm">{quiz.question}</p>
                        <p className="text-gray-500 text-xs mt-1">정답: {quiz.answer}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">퀴즈가 없습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* 사용자 미리보기 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">사용자 데이터 ({previewData.users.length}명)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>닉네임</TableHead>
                        <TableHead>고유닉</TableHead>
                        <TableHead className="text-right">점수</TableHead>
                        <TableHead className="text-right">채팅</TableHead>
                        <TableHead className="text-right">좋아요</TableHead>
                        <TableHead className="text-right">스푼</TableHead>
                        <TableHead className="text-right">복권</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers.map((user, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{user.nickname}</TableCell>
                          <TableCell className="text-gray-500">{user.tag}</TableCell>
                          <TableCell className="text-right">{user.score.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{user.chat_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{user.like_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{user.spoon_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{user.lottery_tickets}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-gray-600">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 마이그레이션 중 안내 */}
            {isMigrating && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">마이그레이션 진행 중...</p>
                        <p className="text-sm text-blue-700">사용자 ID를 조회하고 데이터를 이전하고 있습니다. 잠시만 기다려주세요.</p>
                      </div>
                    </div>
                    
                    {/* 진행률 표시 */}
                    {migrationProgress.total > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700">
                            진행률: {migrationProgress.current} / {migrationProgress.total} 명
                          </span>
                          <span className="text-blue-700 font-medium">
                            {Math.round((migrationProgress.current / migrationProgress.total) * 100)}%
                          </span>
                        </div>
                        {/* 진행 바 */}
                        <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{
                              width: `${(migrationProgress.current / migrationProgress.total) * 100}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-blue-600">
                          예상 남은 시간: 약 {Math.max(0, Math.ceil((migrationProgress.total - migrationProgress.current) * 0.5))}초
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMigrating}
          >
            취소
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={!previewData || isLoading || isMigrating || !!error}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isMigrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                마이그레이션 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                마이그레이션 하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

