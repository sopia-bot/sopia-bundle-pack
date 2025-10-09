import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Search, Users, Trophy, Ticket, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface UserData {
  user_id: number;
  nickname: string;
  tag?: string;
  score: number;
  rank: number;
  chat_count: number;
  like_count: number;
  spoon_count: number;
  lottery_tickets?: number;
  roulette_tickets?: number;
  level?: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('stp://starter-pack.sopia.dev/fanscore/ranking');
      const data = await response.json();
      
      // 룰렛 티켓 수 계산 (미사용 룰렛 기록)
      const rouletteResponse = await fetch('stp://starter-pack.sopia.dev/roulette/history');
      const rouletteHistory = await rouletteResponse.json();
      
      // 각 사용자별 티켓 수 계산
      const userTickets = rouletteHistory.reduce((acc: any, record: any) => {
        if (!record.used) {
          acc[record.user_id] = (acc[record.user_id] || 0) + 1;
        }
        return acc;
      }, {});

      // 사용자 데이터에 티켓 정보 추가
      const enrichedUsers = data.map((user: UserData) => ({
        ...user,
        roulette_tickets: userTickets[user.user_id] || 0,
        lottery_tickets: 0, // 추후 구현
        level: calculateLevel(user.score),
      }));

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('청취자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 레벨 계산 함수 (점수 기반)
  const calculateLevel = (score: number): number => {
    if (score < 100) return 1;
    if (score < 500) return 2;
    if (score < 1000) return 3;
    if (score < 2500) return 4;
    if (score < 5000) return 5;
    if (score < 10000) return 6;
    return 7;
  };

  // 검색 필터링
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.nickname.toLowerCase().includes(query) ||
      (user.tag && user.tag.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  // 통계 계산
  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      totalRoulette: users.reduce((sum, user) => sum + (user.roulette_tickets || 0), 0),
      totalLottery: users.reduce((sum, user) => sum + (user.lottery_tickets || 0), 0),
      averageScore: users.length > 0 
        ? Math.round(users.reduce((sum, user) => sum + user.score, 0) / users.length) 
        : 0,
    };
  }, [users]);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            청취자 관리
          </h1>
          <p className="text-gray-600 text-lg">애청지수 청취자들의 정보를 확인하고 관리합니다</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">총 청취자</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">평균 점수</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.averageScore}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Trophy className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">룰렛 티켓</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalRoulette}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <Ticket className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">복권 티켓</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalLottery}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">청취자 검색</CardTitle>
            <CardDescription className="text-gray-600">닉네임이나 태그로 청취자를 검색할 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="닉네임 또는 태그로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-600 mt-2">
                검색 결과: {filteredUsers.length}명
              </p>
            )}
          </CardContent>
        </Card>

        {/* User List */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">청취자 목록</CardTitle>
            <CardDescription className="text-gray-600">
              {loading ? '로딩 중...' : `총 ${filteredUsers.length}명의 청취자`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-600 font-semibold">순위</TableHead>
                    <TableHead className="text-gray-600 font-semibold">닉네임</TableHead>
                    <TableHead className="text-gray-600 font-semibold">레벨</TableHead>
                    <TableHead className="text-gray-600 font-semibold text-right">애청지수</TableHead>
                    <TableHead className="text-gray-600 font-semibold text-right">채팅</TableHead>
                    <TableHead className="text-gray-600 font-semibold text-right">좋아요</TableHead>
                    <TableHead className="text-gray-600 font-semibold text-right">스푼</TableHead>
                    <TableHead className="text-gray-600 font-semibold text-center">룰렛 티켓</TableHead>
                    <TableHead className="text-gray-600 font-semibold text-center">복권 티켓</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        {searchQuery ? '검색 결과가 없습니다' : '등록된 청취자가 없습니다'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.user_id} className="hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            user.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
                            user.rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white' :
                            user.rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {user.rank}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{user.nickname}</p>
                            {user.tag && (
                              <p className="text-xs text-gray-500">@{user.tag}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.level === 7 ? 'bg-purple-100 text-purple-800' :
                            user.level === 6 ? 'bg-blue-100 text-blue-800' :
                            user.level === 5 ? 'bg-emerald-100 text-emerald-800' :
                            user.level === 4 ? 'bg-green-100 text-green-800' :
                            user.level === 3 ? 'bg-yellow-100 text-yellow-800' :
                            user.level === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Lv.{user.level}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-blue-600">{user.score.toLocaleString()}</span>
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {user.chat_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {user.like_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {user.spoon_count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.roulette_tickets! > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.roulette_tickets}장
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.lottery_tickets! > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {user.lottery_tickets}장
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

