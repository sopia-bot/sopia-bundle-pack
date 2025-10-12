import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Layout } from '../components/Layout';
import { Trophy, Shield, Ticket, Users, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Dashboard() {
  const { fanscoreRanking, shieldData, rouletteHistory, todayActiveCount, fetchFanscoreRanking, fetchShieldData, fetchRouletteHistory, fetchTodayActiveCount } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchFanscoreRanking(),
      fetchShieldData(),
      fetchRouletteHistory(),
      fetchTodayActiveCount()
    ]);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      toast.success('데이터를 새로고침했습니다.');
    } catch (error) {
      toast.error('데이터 새로고침에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  대시보드
                </h1>
                <p className="text-gray-600 text-lg">청취자 애청지수 도구 메인 화면</p>
              </div>
              <Button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                새로고침
              </Button>
            </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 실드 상태 */}
          <Card className="border shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">실드 상태</CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{shieldData?.shield_count ?? 0}</div>
              <p className="text-xs text-gray-500 mt-1">현재 실드 개수</p>
            </CardContent>
          </Card>

          {/* 오늘 활동한 청취자 */}
          <Card className="border shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">오늘 활동 청취자</CardTitle>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{todayActiveCount}</div>
              <p className="text-xs text-gray-500 mt-1">오늘 활동한 청취자 수</p>
            </CardContent>
          </Card>

          {/* 총 참여자 */}
          <Card className="border shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">총 참여자</CardTitle>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{fanscoreRanking.length}</div>
              <p className="text-xs text-gray-500 mt-1">애청지수 등록 인원</p>
            </CardContent>
          </Card>
        </div>

        {/* 애청지수 랭킹 */}
        <Card className="border shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-xl font-bold text-gray-900">애청지수 TOP 10</CardTitle>
            </div>
            <CardDescription className="text-gray-600">실시간 애청지수 랭킹을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold">순위</th>
                    <th className="text-left py-3 px-4 text-gray-600 font-semibold">닉네임</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-semibold">점수</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-semibold">채팅</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-semibold">좋아요</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-semibold">스푼</th>
                  </tr>
                </thead>
                <tbody>
                  {fanscoreRanking.slice(0, 10).map((user) => (
                    <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          user.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
                          user.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white' :
                          user.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {user.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{user.nickname}</td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">{user.score}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{user.chat_count}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{user.like_count}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{user.spoon_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 최근 룰렛 당첨 현황 */}
        <Card className="border shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <CardTitle className="text-xl font-bold text-gray-900">최근 룰렛 당첨 현황</CardTitle>
            </div>
            <CardDescription className="text-gray-600">최근 5건의 룰렛 당첨 기록을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rouletteHistory.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 transition-colors hover:bg-gray-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      record.used ? 'bg-gray-400' : 'bg-green-500 animate-pulse'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{record.nickname}</p>
                      <p className="text-gray-500 text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(record.timestamp).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      record.item.type === 'shield' ? 'bg-blue-100 text-blue-800' :
                      record.item.type === 'ticket' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {record.item.label}
                    </span>
                    <p className={`text-xs mt-1 ${
                      record.used ? 'text-gray-500' : 'text-green-600'
                    }`}>
                      {record.used ? '사용됨' : '예정'}
                    </p>
                  </div>
                </div>
              ))}
              {rouletteHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>아직 룰렛 당첨 기록이 없습니다</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

