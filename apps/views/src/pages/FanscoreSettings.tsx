import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Save, Info, Plus, Trash2, Edit, Ticket, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { MigrationDialog } from '../components/MigrationDialog';

interface FanscoreConfig {
  enabled: boolean;
  attendance_score: number;
  chat_score: number;
  like_score: number;
  spoon_score: number;
  quiz_enabled: boolean;
  quiz_bonus: number;
  quiz_interval: number;
  quiz_timeout: number;
  lottery_enabled: boolean;
  lottery_spoon_required: number;
}

interface YachtConfig {
  enabled: boolean;
  winning_score: number;
  score_multiplier: number;
  game_cooldown: number;
}

interface Quiz {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at?: string;
}

export function FanscoreSettings() {
  const [config, setConfig] = useState<FanscoreConfig>({
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
  });

  const [saved, setSaved] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newQuiz, setNewQuiz] = useState({ question: '', answer: '' });
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [yachtConfig, setYachtConfig] = useState<YachtConfig>({
    enabled: true,
    winning_score: 50,
    score_multiplier: 100,
    game_cooldown: 60,
  });
  const [yachtSaved, setYachtSaved] = useState(false);
  const [clearingCooldown, setClearingCooldown] = useState(false);

  useEffect(() => {
    // 설정 불러오기
    loadConfig();
    loadQuizzes();
    loadYachtConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('stp://starter-pack.sopia.dev/fanscore/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load config:', error);
      toast.error('설정을 불러오는데 실패했습니다.');
    }
  };

  const loadQuizzes = async () => {
    try {
      const response = await fetch('stp://starter-pack.sopia.dev/quiz');
      const data = await response.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
      toast.error('퀴즈 목록을 불러오는데 실패했습니다.');
      setQuizzes([]); // 에러 시 빈 배열로 설정
    }
  };

  const loadYachtConfig = async () => {
    try {
      const response = await fetch('stp://starter-pack.sopia.dev/yacht/config');
      const data = await response.json();
      setYachtConfig(data);
    } catch (error) {
      console.error('Failed to load yacht config:', error);
      toast.error('야추 설정을 불러오는데 실패했습니다.');
    }
  };

  const saveConfig = async () => {
    // 유효성 검사
    const validatedConfig = { ...config };
    
    // 숫자 필드 검증 및 기본값 설정
    if (isNaN(validatedConfig.attendance_score) || validatedConfig.attendance_score < 0) {
      validatedConfig.attendance_score = 10;
      toast.warning('출석 점수가 유효하지 않아 기본값(10)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.chat_score) || validatedConfig.chat_score < 0) {
      validatedConfig.chat_score = 1;
      toast.warning('채팅 점수가 유효하지 않아 기본값(1)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.like_score) || validatedConfig.like_score < 0) {
      validatedConfig.like_score = 10;
      toast.warning('좋아요 점수가 유효하지 않아 기본값(10)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.spoon_score) || validatedConfig.spoon_score < 0) {
      validatedConfig.spoon_score = 100;
      toast.warning('스푼 점수가 유효하지 않아 기본값(100)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.quiz_bonus) || validatedConfig.quiz_bonus < 0) {
      validatedConfig.quiz_bonus = 10;
      toast.warning('퀴즈 보너스가 유효하지 않아 기본값(10)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.quiz_interval) || validatedConfig.quiz_interval < 30) {
      validatedConfig.quiz_interval = 180;
      toast.warning('퀴즈 간격이 유효하지 않아 기본값(180초)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.quiz_timeout) || validatedConfig.quiz_timeout < 1) {
      validatedConfig.quiz_timeout = 5;
      toast.warning('퀴즈 입력 시간이 유효하지 않아 기본값(5초)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.lottery_spoon_required) || validatedConfig.lottery_spoon_required < 1) {
      validatedConfig.lottery_spoon_required = 50;
      toast.warning('복권 스푼 개수가 유효하지 않아 기본값(50)으로 설정되었습니다.');
    }
    
    try {
      await fetch('stp://starter-pack.sopia.dev/fanscore/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedConfig),
      });

      setConfig(validatedConfig);
      setSaved(true);
      toast.success('설정이 저장되었습니다.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('설정 저장에 실패했습니다.');
    }
  };

  const addQuiz = async () => {
    if (!newQuiz.question.trim() || !newQuiz.answer.trim()) {
      toast.error('문제와 정답을 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('stp://starter-pack.sopia.dev/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuiz),
      });

      if (response.ok) {
        setNewQuiz({ question: '', answer: '' });
        setIsQuizDialogOpen(false);
        loadQuizzes();
        toast.success('퀴즈가 추가되었습니다.');
      } else {
        throw new Error('Failed to add quiz');
      }
    } catch (error) {
      console.error('Failed to add quiz:', error);
      toast.error('퀴즈 추가에 실패했습니다.');
    }
  };

  const updateQuiz = async () => {
    if (!editingQuiz || !newQuiz.question.trim() || !newQuiz.answer.trim()) {
      toast.error('문제와 정답을 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch(`stp://starter-pack.sopia.dev/quiz/${editingQuiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuiz),
      });

      if (response.ok) {
        setEditingQuiz(null);
        setNewQuiz({ question: '', answer: '' });
        setIsQuizDialogOpen(false);
        loadQuizzes();
        toast.success('퀴즈가 수정되었습니다.');
      } else {
        throw new Error('Failed to update quiz');
      }
    } catch (error) {
      console.error('Failed to update quiz:', error);
      toast.error('퀴즈 수정에 실패했습니다.');
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`stp://starter-pack.sopia.dev/quiz/${quizId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadQuizzes();
        toast.success('퀴즈가 삭제되었습니다.');
      } else {
        throw new Error('Failed to delete quiz');
      }
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      toast.error('퀴즈 삭제에 실패했습니다.');
    }
  };

  const openEditDialog = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setNewQuiz({ question: quiz.question, answer: quiz.answer });
    setIsQuizDialogOpen(true);
  };

  const closeQuizDialog = () => {
    setIsQuizDialogOpen(false);
    setEditingQuiz(null);
    setNewQuiz({ question: '', answer: '' });
  };

  const handleMigrationComplete = () => {
    // 마이그레이션 완료 후 데이터 다시 로드
    loadConfig();
    loadQuizzes();
  };

  const clearYachtCooldowns = async () => {
    try {
      setClearingCooldown(true);
      const response = await fetch('stp://starter-pack.sopia.dev/yacht/cooldown/clear', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('모든 플레이어의 야추 쿨타임이 초기화되었습니다.');
      } else {
        throw new Error('Failed to clear cooldowns');
      }
    } catch (error) {
      console.error('Failed to clear yacht cooldowns:', error);
      toast.error('쿨타임 초기화에 실패했습니다.');
    } finally {
      setClearingCooldown(false);
    }
  };

  const saveYachtConfig = async () => {
    const validatedConfig = { ...yachtConfig };
    
    if (isNaN(validatedConfig.winning_score) || validatedConfig.winning_score < 1) {
      validatedConfig.winning_score = 50;
      toast.warning('승리 점수가 유효하지 않아 기본값(50점)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.score_multiplier) || validatedConfig.score_multiplier < 1) {
      validatedConfig.score_multiplier = 100;
      toast.warning('점수 배수가 유효하지 않아 기본값(100)으로 설정되었습니다.');
    }
    
    if (isNaN(validatedConfig.game_cooldown) || validatedConfig.game_cooldown < 1) {
      validatedConfig.game_cooldown = 60;
      toast.warning('게임 간격이 유효하지 않아 기본값(60초)으로 설정되었습니다.');
    }
    
    try {
      await fetch('stp://starter-pack.sopia.dev/yacht/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedConfig),
      });

      setYachtConfig(validatedConfig);
      setYachtSaved(true);
      toast.success('야추 설정이 저장되었습니다.');
      setTimeout(() => setYachtSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save yacht config:', error);
      toast.error('야추 설정 저장에 실패했습니다.');
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              애청지수 설정
            </h1>
            <p className="text-gray-600 text-lg">애청지수 계산 방식과 추가 기능을 설정합니다</p>
          </div>
          <Button
            onClick={saveConfig}
            className={saved ? 'bg-green-600 hover:bg-green-700' : ''}
            size="lg"
          >
            <Save size={20} className="mr-2" />
            {saved ? '저장됨!' : '저장'}
          </Button>
        </div>

        {/* Enable/Disable */}
        <Card className="border shadow-lg bg-gradient-to-br from-slate-50 to-slate-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Info className="h-5 w-5 text-blue-600" />
                  </div>
                  애청지수 시스템
                </CardTitle>
                <CardDescription className="text-gray-600">애청지수 계산 및 랭킹 기능을 활성화합니다</CardDescription>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Data Migration */}
        <Card className="border shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Database className="h-5 w-5 text-amber-600" />
                  </div>
                  데이터 마이그레이션
                </CardTitle>
                <CardDescription className="text-gray-600">
                  기존 애청지수 번들의 데이터를 불러와서 이전합니다
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsMigrationDialogOpen(true)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Database className="mr-2 h-4 w-4" />
                데이터 불러오기
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Migration Dialog */}
        <MigrationDialog
          open={isMigrationDialogOpen}
          onOpenChange={setIsMigrationDialogOpen}
          onComplete={handleMigrationComplete}
        />

        {/* Score Settings */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Save className="h-5 w-5 text-blue-600" />
              </div>
              점수 설정
            </CardTitle>
            <CardDescription className="text-gray-600">각 활동별 점수를 설정하여 애청지수를 계산합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Attendance Score */}
            <div className="space-y-3">
              <Label htmlFor="attendance-score" className="text-base font-medium text-gray-900">출석 점수</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="attendance-score"
                  type="number"
                  value={config.attendance_score}
                  onChange={(e) => setConfig({ ...config, attendance_score: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                  disabled={!config.enabled}
                  className="flex-1"
                />
                <span className="text-gray-500 text-sm font-medium">점</span>
              </div>
              <p className="text-gray-500 text-sm">청취자가 방송에 입장할 때 부여되는 출석 점수</p>
            </div>

            {/* Chat Score */}
            <div className="space-y-3">
              <Label htmlFor="chat-score" className="text-base font-medium text-gray-900">채팅 1회당 점수</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="chat-score"
                  type="number"
                  value={config.chat_score}
                  onChange={(e) => setConfig({ ...config, chat_score: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                  disabled={!config.enabled}
                  className="flex-1"
                />
                <span className="text-gray-500 text-sm font-medium">점</span>
              </div>
              <p className="text-gray-500 text-sm">청취자가 채팅을 1회 보낼 때마다 추가되는 점수</p>
            </div>

            {/* Like Score */}
            <div className="space-y-3">
              <Label htmlFor="like-score" className="text-base font-medium text-gray-900">좋아요 1회당 점수</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="like-score"
                  type="number"
                  value={config.like_score}
                  onChange={(e) => setConfig({ ...config, like_score: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                  disabled={!config.enabled}
                  className="flex-1"
                />
                <span className="text-gray-500 text-sm font-medium">점</span>
              </div>
              <p className="text-gray-500 text-sm">청취자가 좋아요를 1회 누를 때마다 추가되는 점수</p>
            </div>

            {/* Spoon Score */}
            <div className="space-y-3">
              <Label htmlFor="spoon-score" className="text-base font-medium text-gray-900">스푼 1개당 점수</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="spoon-score"
                  type="number"
                  value={config.spoon_score}
                  onChange={(e) => setConfig({ ...config, spoon_score: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                  disabled={!config.enabled}
                  className="flex-1"
                />
                <span className="text-gray-500 text-sm font-medium">점</span>
              </div>
              <p className="text-gray-500 text-sm">청취자가 스푼을 1개 선물할 때마다 추가되는 점수</p>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Feature */}
        <Card className="border shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Plus className="h-5 w-5 text-purple-600" />
                  </div>
                  돌발 퀴즈
                </CardTitle>
                <CardDescription className="text-gray-600">돌발 퀴즈 정답 시 보너스 점수를 부여합니다</CardDescription>
              </div>
              <Switch
                checked={config.quiz_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, quiz_enabled: checked })}
                disabled={!config.enabled}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </CardHeader>
          {config.quiz_enabled && (
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="quiz-bonus" className="text-base font-medium text-gray-900">퀴즈 정답 보너스</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="quiz-bonus"
                    type="number"
                    value={config.quiz_bonus}
                    onChange={(e) => setConfig({ ...config, quiz_bonus: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                    disabled={!config.enabled}
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm font-medium">점</span>
                </div>
                <p className="text-gray-500 text-sm">퀴즈 정답 시 추가로 부여되는 보너스 점수</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="quiz-interval" className="text-base font-medium text-gray-900">퀴즈 실행 간격</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="quiz-interval"
                    type="number"
                    value={config.quiz_interval}
                    onChange={(e) => setConfig({ ...config, quiz_interval: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                    disabled={!config.enabled}
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm font-medium">초</span>
                </div>
                <p className="text-gray-500 text-sm">돌발 퀴즈가 실행되는 간격 (최소 30초)</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="quiz-timeout" className="text-base font-medium text-gray-900">퀴즈 정답 입력 시간</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="quiz-timeout"
                    type="number"
                    value={config.quiz_timeout}
                    onChange={(e) => setConfig({ ...config, quiz_timeout: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                    disabled={!config.enabled}
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm font-medium">초</span>
                </div>
                <p className="text-gray-500 text-sm">퀴즈 문제 출제 후 정답을 입력할 수 있는 시간 (최소 1초)</p>
              </div>

              {/* 퀴즈 관리 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">퀴즈 목록</h4>
                  <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => closeQuizDialog()} className="bg-purple-600 hover:bg-purple-700">
                        <Plus size={16} className="mr-2" />
                        퀴즈 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingQuiz ? '퀴즈 수정' : '새 퀴즈 추가'}
                        </DialogTitle>
                        <DialogDescription>
                          문제와 정답을 입력해주세요.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="quiz-question">문제</Label>
                          <Input
                            id="quiz-question"
                            value={newQuiz.question}
                            onChange={(e) => setNewQuiz({ ...newQuiz, question: e.target.value })}
                            placeholder="퀴즈 문제를 입력하세요"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quiz-answer">정답</Label>
                          <Input
                            id="quiz-answer"
                            value={newQuiz.answer}
                            onChange={(e) => setNewQuiz({ ...newQuiz, answer: e.target.value })}
                            placeholder="정답을 입력하세요"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={closeQuizDialog}>
                          취소
                        </Button>
                        <Button onClick={editingQuiz ? updateQuiz : addQuiz} className="bg-purple-600 hover:bg-purple-700">
                          {editingQuiz ? '수정' : '추가'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 transition-colors hover:bg-gray-100">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{quiz.question}</p>
                        <p className="text-gray-500 text-sm">정답: {quiz.answer}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(quiz)}
                        >
                          <Edit size={14} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
                              <Trash2 size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>퀴즈 삭제</AlertDialogTitle>
                              <AlertDialogDescription>
                                이 퀴즈를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteQuiz(quiz.id)} className="bg-red-600 hover:bg-red-700">
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {quizzes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>등록된 퀴즈가 없습니다.</p>
                      <p className="text-sm">위의 '퀴즈 추가' 버튼을 클릭하여 첫 번째 퀴즈를 추가해보세요.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Lottery Feature */}
        <Card className="border shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Ticket className="h-5 w-5 text-emerald-600" />
                  </div>
                  복권 시스템
                </CardTitle>
                <CardDescription className="text-gray-600">랜덤 복권 추첨으로 보너스 점수를 획득합니다</CardDescription>
              </div>
              <Switch
                checked={config.lottery_enabled}
                onCheckedChange={(checked) => setConfig({ ...config, lottery_enabled: checked })}
                disabled={!config.enabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </CardHeader>
          {config.lottery_enabled && (
            <CardContent>
              <div className="space-y-3">
                <Label htmlFor="lottery-spoon" className="text-base font-medium text-gray-900">복권 지급 스푼 개수</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="lottery-spoon"
                    type="number"
                    value={config.lottery_spoon_required}
                    onChange={(e) => setConfig({ ...config, lottery_spoon_required: e.target.value === '' ? '' as any : parseFloat(e.target.value) })}
                    disabled={!config.enabled}
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm font-medium">스푼</span>
                </div>
                <p className="text-gray-500 text-sm">청취자가 이 개수만큼 스푼을 선물하면 복권이 1장 지급됩니다</p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Yacht Game Feature */}
        <Card className="border shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    🎲
                  </div>
                  야추 게임
                </CardTitle>
                <CardDescription className="text-gray-600">주사위 5개를 굴려 족보를 완성하는 게임입니다</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={saveYachtConfig}
                  className={yachtSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                  size="sm"
                >
                  <Save size={16} className="mr-1" />
                  {yachtSaved ? '저장됨' : '저장'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200">
              <div>
                <p className="font-medium text-gray-900">게임 활성화</p>
                <p className="text-sm text-gray-600">야추 게임을 활성화하거나 비활성화합니다</p>
              </div>
              <Switch
                checked={yachtConfig.enabled}
                onCheckedChange={(checked) => setYachtConfig({ ...yachtConfig, enabled: checked })}
                className="data-[state=checked]:bg-orange-600"
              />
            </div>

            {yachtConfig.enabled && (
              <>
                {/* Winning Score */}
                <div className="space-y-3">
                  <Label htmlFor="winning-score" className="text-base font-medium text-gray-900">승리 점수</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="winning-score"
                      type="number"
                      min="1"
                      value={yachtConfig.winning_score}
                      onChange={(e) => setYachtConfig({ ...yachtConfig, winning_score: e.target.value === '' ? '' as any : parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-gray-500 text-sm font-medium">점</span>
                  </div>
                  <p className="text-gray-500 text-sm">이 점수 이상의 족보를 완성하면 애청지수 포인트를 획득합니다</p>
                </div>

                {/* Score Multiplier */}
                <div className="space-y-3">
                  <Label htmlFor="score-multiplier" className="text-base font-medium text-gray-900">점수 배수</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="score-multiplier"
                      type="number"
                      min="1"
                      value={yachtConfig.score_multiplier}
                      onChange={(e) => setYachtConfig({ ...yachtConfig, score_multiplier: e.target.value === '' ? '' as any : parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-gray-500 text-sm font-medium">배</span>
                  </div>
                  <p className="text-gray-500 text-sm">족보 점수에 이 배수를 곱하여 최종 애청지수 포인트를 계산합니다</p>
                </div>

                {/* Game Cooldown */}
                <div className="space-y-3">
                  <Label htmlFor="game-cooldown" className="text-base font-medium text-gray-900">게임 간격</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="game-cooldown"
                      type="number"
                      min="1"
                      value={yachtConfig.game_cooldown}
                      onChange={(e) => setYachtConfig({ ...yachtConfig, game_cooldown: e.target.value === '' ? '' as any : parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-gray-500 text-sm font-medium">초</span>
                  </div>
                  <p className="text-gray-500 text-sm">한 사용자가 다시 게임을 시작하기 전에 기다려야 하는 시간</p>
                </div>

                {/* Yacht Hands Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium text-gray-900">족보 점수표</Label>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                          ⏱️ 쿨타임 초기화
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>야추 쿨타임 초기화</AlertDialogTitle>
                          <AlertDialogDescription>
                            모든 플레이어의 야추 게임 쿨타임을 초기화하시겠습니까?
                            이 작업은 즉시 모든 사용자가 다시 게임을 시작할 수 있게 합니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={clearYachtCooldowns}
                            disabled={clearingCooldown}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {clearingCooldown ? '초기화 중...' : '초기화'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="bg-white rounded-lg border border-orange-200 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-orange-50 border-b border-orange-200">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-900 w-24">족보</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-900 flex-1">설명</th>
                          <th className="px-4 py-2 text-center font-medium text-gray-900 w-20">예시</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-900 w-16">점수</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-200">
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">탑</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">동일한 주사위 눈이 없을 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚀⚁⚂⚃⚄</td>
                          <td className="px-4 py-2 text-right text-gray-700">10점</td>
                        </tr>
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">원페어</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">동일한 주사위 눈이 2개인 눈 종류가 1개일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚁⚁⚂⚄⚅</td>
                          <td className="px-4 py-2 text-right text-gray-700">20점</td>
                        </tr>
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">투페어</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">동일한 주사위 눈이 2개인 눈 종류가 2개일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚁⚁⚂⚂⚅</td>
                          <td className="px-4 py-2 text-right text-gray-700">30점</td>
                        </tr>
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">트리플</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">동일한 주사위 눈이 3개일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚁⚁⚁⚄⚅</td>
                          <td className="px-4 py-2 text-right text-gray-700">40점</td>
                        </tr>
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">포카드</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">동일한 주사위 눈이 4개일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚄⚅⚅⚅⚅</td>
                          <td className="px-4 py-2 text-right text-gray-700">50점</td>
                        </tr>
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">풀 하우스</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">한 종류가 3개, 다른 종류가 2개일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚄⚄⚅⚅⚅</td>
                          <td className="px-4 py-2 text-right text-gray-700">60점</td>
                        </tr>
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">리틀 스트레이트</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">주사위 눈이 1, 2, 3, 4, 5일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚀⚁⚂⚃⚄</td>
                          <td className="px-4 py-2 text-right text-gray-700">70점</td>
                        </tr>
                        <tr className="hover:bg-orange-50">
                          <td className="px-4 py-2 text-gray-700 font-medium">빅 스트레이트</td>
                          <td className="px-4 py-2 text-gray-600 text-xs">주사위 눈이 2, 3, 4, 5, 6일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚁⚂⚃⚄⚅</td>
                          <td className="px-4 py-2 text-right text-gray-700">70점</td>
                        </tr>
                        <tr className="hover:bg-orange-50 bg-orange-100">
                          <td className="px-4 py-2 text-gray-900 font-medium">야추</td>
                          <td className="px-4 py-2 text-gray-700 font-medium text-xs">동일한 주사위 눈이 5개일 때</td>
                          <td className="px-4 py-2 text-center text-lg">⚀⚀⚀⚀⚀</td>
                          <td className="px-4 py-2 text-right text-gray-900 font-medium">150점</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="border shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                <Info className="text-blue-600" size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-blue-600 font-semibold">참고사항</h4>
                <ul className="text-gray-600 text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>애청지수는 채팅, 좋아요, 스푼 선물 등의 활동으로 누적됩니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>점수 설정은 저장 즉시 적용되며, 이미 쌓인 점수에는 영향을 주지 않습니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>돌발 퀴즈와 복권은 추가 보너스 점수를 제공하는 옵션 기능입니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>애청지수 데이터는 백엔드에서 자동으로 관리됩니다</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

