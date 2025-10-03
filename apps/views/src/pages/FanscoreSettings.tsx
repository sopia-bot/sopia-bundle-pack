import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Save, Info, Plus, Trash2, Edit, Ticket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface FanscoreConfig {
  enabled: boolean;
  chat_score: number;
  like_score: number;
  spoon_score: number;
  quiz_enabled: boolean;
  quiz_bonus: number;
  lottery_enabled: boolean;
  lottery_percentage: number;
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
    chat_score: 1,
    like_score: 2,
    spoon_score: 50,
    quiz_enabled: false,
    quiz_bonus: 10,
    lottery_enabled: false,
    lottery_percentage: 0.1,
  });

  const [saved, setSaved] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newQuiz, setNewQuiz] = useState({ question: '', answer: '' });

  useEffect(() => {
    // 설정 불러오기
    loadConfig();
    loadQuizzes();
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

  const saveConfig = async () => {
    try {
      await fetch('stp://starter-pack.sopia.dev/fanscore/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

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
            {/* Chat Score */}
            <div className="space-y-3">
              <Label htmlFor="chat-score" className="text-base font-medium text-gray-900">채팅 1회당 점수</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="chat-score"
                  type="number"
                  min="0"
                  step="0.1"
                  value={config.chat_score}
                  onChange={(e) => setConfig({ ...config, chat_score: parseFloat(e.target.value) })}
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
                  min="0"
                  step="0.1"
                  value={config.like_score}
                  onChange={(e) => setConfig({ ...config, like_score: parseFloat(e.target.value) })}
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
                  min="0"
                  step="1"
                  value={config.spoon_score}
                  onChange={(e) => setConfig({ ...config, spoon_score: parseFloat(e.target.value) })}
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
                    min="0"
                    step="1"
                    value={config.quiz_bonus}
                    onChange={(e) => setConfig({ ...config, quiz_bonus: parseFloat(e.target.value) })}
                    disabled={!config.enabled}
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm font-medium">점</span>
                </div>
                <p className="text-gray-500 text-sm">퀴즈 정답 시 추가로 부여되는 보너스 점수</p>
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
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">복권 시스템이 활성화되었습니다.</p>
                <p className="text-gray-500 text-xs mt-1">각 활동마다 랜덤하게 보너스 점수가 부여됩니다.</p>
              </div>
            </CardContent>
          )}
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

