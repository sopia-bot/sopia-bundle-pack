import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Dices, User } from 'lucide-react';
import { toast } from 'sonner';

interface FanscoreUser {
  user_id: number;
  nickname: string;
  tag: string;
  level: number;
  exp: number;
}

interface Template {
  template_id: string;
  name: string;
  mode: 'sticker' | 'spoon' | 'like';
  items: Array<{
    type: string;
    label: string;
    percentage: number;
    value?: number;
  }>;
}

interface ManualRouletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

const API_BASE = 'stp://starter-pack.sopia.dev';

export function ManualRouletteDialog({ open, onOpenChange, template }: ManualRouletteDialogProps) {
  const [ticketCount, setTicketCount] = useState(1);
  const [targetUserId, setTargetUserId] = useState<string>('dj');
  const [applyEffects, setApplyEffects] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fanscoreUsers, setFanscoreUsers] = useState<FanscoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Dialog가 열릴 때 사용자 목록 로드
  useEffect(() => {
    if (open) {
      loadFanscoreUsers();
      // 초기값 리셋
      setTicketCount(1);
      setTargetUserId('dj');
      setApplyEffects(true);
      setSendNotification(true);
    }
  }, [open]);

  // 애청지수 사용자 목록 로드
  const loadFanscoreUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE}/fanscore/ranking`);
      if (response.ok) {
        const data = await response.json();
        setFanscoreUsers(data);
      }
    } catch (error) {
      console.error('Failed to load fanscore users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 수동 룰렛 실행
  const handleSpin = async () => {
    if (!template) {
      toast.error('템플릿을 선택해주세요.');
      return;
    }

    if (ticketCount < 1 || ticketCount > 100) {
      toast.error('티켓 수는 1~100 사이여야 합니다.');
      return;
    }

    setLoading(true);

    try {
      let targetUser: { id: number; nickname: string; tag: string; isInFanscore: boolean };

      if (targetUserId === 'dj') {
        // DJ 선택 시 에러 (사용자 목록에서 직접 선택해야 함)
        toast.error('DJ 정보를 가져올 수 없습니다. 직접 대상을 선택해주세요.');
        setLoading(false);
        return;
      } else {
        // 선택된 사용자
        const selectedUser = fanscoreUsers.find(u => u.user_id === parseInt(targetUserId));
        if (!selectedUser) {
          toast.error('선택된 사용자를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }
        targetUser = {
          id: selectedUser.user_id,
          nickname: selectedUser.nickname,
          tag: selectedUser.tag,
          isInFanscore: true
        };
      }

      // API 호출
      const response = await fetch(`${API_BASE}/roulette/manual-spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.template_id,
          ticketCount,
          targetUserId: targetUser.id,
          targetNickname: targetUser.nickname,
          targetTag: targetUser.tag,
          applyEffects,
          sendNotification,
          isTargetInFanscore: targetUser.isInFanscore
        })
      });

      if (response.ok) {
        toast.success(`${targetUser.nickname}님에게 ${ticketCount}개의 룰렛을 돌렸습니다.`);
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error || '룰렛 실행에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to spin manual roulette:', error);
      toast.error('룰렛 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Dices className="h-5 w-5 text-purple-600" />
            수동 룰렛
          </DialogTitle>
          <DialogDescription>
            {template ? `"${template.name}" 템플릿으로 룰렛을 돌립니다.` : '템플릿을 선택해주세요.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* 티켓 수 */}
          <div className="space-y-2">
            <Label htmlFor="ticket-count">티켓 수</Label>
            <Input
              id="ticket-count"
              type="number"
              min="1"
              max="100"
              value={ticketCount}
              onChange={(e) => setTicketCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              placeholder="돌릴 티켓 수를 입력하세요"
            />
            <p className="text-xs text-gray-500">1~100개 사이의 값을 입력하세요.</p>
          </div>

          {/* 대상 선택 */}
          <div className="space-y-2">
            <Label htmlFor="target-user">당첨 대상</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="대상을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm text-gray-500">불러오는 중...</span>
                  </div>
                ) : (
                  <>
                    {fanscoreUsers.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-gray-400" />
                          <span>{user.nickname}</span>
                          <span className="text-xs text-gray-400">@{user.tag}</span>
                          <span className="text-xs text-blue-500">Lv.{user.level}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {fanscoreUsers.length === 0 && (
                      <div className="py-4 text-center text-sm text-gray-500">
                        등록된 청취자가 없습니다.
                      </div>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">등록된 애청지수 청취자 중에서 선택하세요.</p>
          </div>

          {/* 채팅 알림 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="send-notification">채팅 알림</Label>
              <p className="text-xs text-gray-500">당첨 결과를 채팅으로 알립니다.</p>
            </div>
            <Switch
              id="send-notification"
              checked={sendNotification}
              onCheckedChange={setSendNotification}
            />
          </div>

          {/* 효과 적용 */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="apply-effects">효과 적용</Label>
              <p className="text-xs text-gray-500">실드, 복권, 상점 등 아이템 효과를 적용합니다.</p>
            </div>
            <Switch
              id="apply-effects"
              checked={applyEffects}
              onCheckedChange={setApplyEffects}
            />
          </div>

          {/* 템플릿 아이템 미리보기 */}
          {template && template.items.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-gray-600">아이템 목록</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {template.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm px-2 py-1 bg-gray-50 rounded">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="text-gray-500">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button
            onClick={handleSpin}
            disabled={loading || !template || fanscoreUsers.length === 0 || targetUserId === 'dj'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                실행 중...
              </>
            ) : (
              <>
                <Dices className="mr-2 h-4 w-4" />
                룰렛 돌리기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
