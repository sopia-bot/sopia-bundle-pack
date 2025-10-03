import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Layout } from '../components/Layout';
import { Shield, Plus, Minus, RotateCcw, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function ShieldSettings() {
  const { shieldData, fetchShieldData, updateShield, resetShield } = useAppStore();
  const [changeAmount, setChangeAmount] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [isAdding, setIsAdding] = useState(true);

  useEffect(() => {
    fetchShieldData();
  }, [fetchShieldData]);

  const handleUpdateShield = async () => {
    if (!reason.trim()) {
      toast.error('변경 사유를 입력해주세요!');
      return;
    }

    try {
      const change = isAdding ? changeAmount : -changeAmount;
      await updateShield(change, reason);
      setReason('');
      setChangeAmount(1);
      toast.success(`실드가 ${change > 0 ? '+' : ''}${change}개 변경되었습니다.`);
    } catch (error) {
      console.error('Failed to update shield:', error);
      toast.error('실드 변경에 실패했습니다.');
    }
  };

  const handleResetShield = async () => {
    try {
      await resetShield();
      toast.success('실드가 초기화되었습니다.');
    } catch (error) {
      console.error('Failed to reset shield:', error);
      toast.error('실드 초기화에 실패했습니다.');
    }
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">실드 설정</h1>
          <p className="text-gray-600 text-lg">실드 상태를 관리하고 변경 이력을 확인합니다</p>
        </div>

        {/* Current Shield Status */}
        <Card className="border shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-500/10 rounded-full">
                  <Shield className="text-blue-600" size={48} />
                </div>
                <div>
                  <p className="text-blue-600 text-sm mb-1">현재 실드 개수</p>
                  <p className="text-6xl font-bold text-gray-900">{shieldData?.shield_count ?? 0}</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <RotateCcw size={20} />
                    초기화
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>실드 초기화</AlertDialogTitle>
                    <AlertDialogDescription>
                      실드를 0으로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetShield} className="bg-red-600 hover:bg-red-700">
                      초기화
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Shield Management */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">실드 변경</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add/Subtract Toggle */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsAdding(true)}
                  variant={isAdding ? "default" : "outline"}
                  className={`flex-1 ${isAdding ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  <Plus size={20} />
                  증가
                </Button>
                <Button
                  onClick={() => setIsAdding(false)}
                  variant={!isAdding ? "default" : "outline"}
                  className={`flex-1 ${!isAdding ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  <Minus size={20} />
                  감소
                </Button>
              </div>

              {/* Amount Input */}
              <div>
                <Label htmlFor="change-amount" className="text-gray-900">변경 수량</Label>
                <Input
                  id="change-amount"
                  type="number"
                  min="1"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>

              {/* Reason Input */}
              <div>
                <Label htmlFor="change-reason" className="text-gray-900">변경 사유</Label>
                <Input
                  id="change-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="예: 룰렛 당첨, 공격받음, 수동 조정 등"
                  className="mt-1"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleUpdateShield}
                className={`w-full ${
                  isAdding
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isAdding ? (
                  <>
                    <Plus size={20} />
                    실드 {changeAmount}개 증가
                  </>
                ) : (
                  <>
                    <Minus size={20} />
                    실드 {changeAmount}개 감소
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900">변경 이력</CardTitle>
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Clock size={16} />
                최근 {shieldData?.history.length ?? 0}개 기록
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(!shieldData?.history || shieldData.history.length === 0) ? (
                <div className="text-center py-12 text-gray-500">
                  변경 이력이 없습니다
                </div>
              ) : (
                shieldData.history
                  .slice()
                  .reverse()
                  .map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          record.change > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {record.change > 0 ? (
                            <TrendingUp className="text-green-600" size={20} />
                          ) : (
                            <TrendingDown className="text-red-600" size={20} />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium">{record.reason}</p>
                          <p className="text-gray-500 text-sm">
                            {new Date(record.time).toLocaleString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      <div className={`text-2xl font-bold ${
                        record.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {record.change > 0 ? '+' : ''}{record.change}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="border shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Shield className="text-blue-600 flex-shrink-0" size={24} />
              <div>
                <h4 className="text-blue-600 font-semibold mb-2">실드 시스템 안내</h4>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>• 실드는 특정 공격이나 패널티로부터 보호해주는 아이템입니다</li>
                  <li>• 룰렛 당첨이나 특정 이벤트를 통해 실드를 획득할 수 있습니다</li>
                  <li>• 실드 사용 시 자동으로 개수가 감소하며, 변경 이력이 기록됩니다</li>
                  <li>• 초기화 버튼으로 실드를 0으로 리셋할 수 있습니다</li>
                  <li>• 모든 변경 사항은 실시간으로 저장되며 이력이 남습니다</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}


