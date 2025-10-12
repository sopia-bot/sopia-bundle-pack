import { useState, useEffect, useMemo } from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Layout } from '../components/Layout';
import { Users, Trophy, Ticket, Award, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsUpDown, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
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
  last_activity_at?: string;
}

interface Template {
  template_id: string;
  name: string;
  enabled: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  
  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [levelOperator, setLevelOperator] = useState<'gte' | 'lte'>('gte');
  const [levelValue, setLevelValue] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Combobox state
  const [userComboboxOpen, setUserComboboxOpen] = useState(false);
  
  // Ticket grant dialog states
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [selectedUserForTicket, setSelectedUserForTicket] = useState<UserData | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [ticketCount, setTicketCount] = useState<string>('1');
  const [grantingTicket, setGrantingTicket] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTemplates();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('stp://starter-pack.sopia.dev/fanscore/ranking');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('청취자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('stp://starter-pack.sopia.dev/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const openTicketDialog = (user: UserData) => {
    setSelectedUserForTicket(user);
    setSelectedTemplate('');
    setTicketCount('1');
    setTicketDialogOpen(true);
  };

  const grantTicket = async () => {
    if (!selectedUserForTicket || !selectedTemplate || !ticketCount) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }

    const count = parseInt(ticketCount);
    if (isNaN(count) || count <= 0) {
      toast.error('올바른 티켓 개수를 입력해주세요.');
      return;
    }

    try {
      setGrantingTicket(true);
      
      const template = templates.find(t => t.template_id === selectedTemplate);
      if (!template) {
        toast.error('템플릿을 찾을 수 없습니다.');
        return;
      }

      const response = await fetch(`stp://starter-pack.sopia.dev/roulette/tickets/${selectedUserForTicket.user_id}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          count: count,
          nickname: selectedUserForTicket.nickname,
          tag: selectedUserForTicket.tag,
          sendNotification: true,
          templateName: template.name,
        }),
      });

      if (response.ok) {
        toast.success(`${selectedUserForTicket.nickname}님에게 티켓 ${count}장이 지급되었습니다.`);
        setTicketDialogOpen(false);
        setSelectedUserForTicket(null);
        fetchUsers(); // 목록 새로고침
      } else {
        throw new Error('Failed to grant ticket');
      }
    } catch (error) {
      console.error('Failed to grant ticket:', error);
      toast.error('티켓 지급에 실패했습니다.');
    } finally {
      setGrantingTicket(false);
    }
  };

  // Apply filters
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // User filter
      if (selectedUser !== 'all' && user.user_id.toString() !== selectedUser) {
        return false;
      }

      // Level filter
      if (levelValue) {
        const level = user.level || 0;
        const filterLevel = parseInt(levelValue);
        if (levelOperator === 'gte' && level < filterLevel) return false;
        if (levelOperator === 'lte' && level > filterLevel) return false;
      }

      // Last activity filter
      if (startDate || endDate) {
        if (!user.last_activity_at) return false;
        const activityDate = new Date(user.last_activity_at);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : new Date();
        
        if (start && activityDate < start) return false;
        if (activityDate > end) return false;
      }

      return true;
    });
  }, [users, selectedUser, levelOperator, levelValue, startDate, endDate]);

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

  // Format date
  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}:${seconds}`;
  };

  const columns: ColumnDef<UserData>[] = [
    {
      accessorKey: 'rank',
      header: '순위',
      cell: ({ row }) => {
        const rank = row.getValue('rank') as number;
        return (
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
            rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
            rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500 text-white' :
            rank === 3 ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white' :
            'bg-gray-100 text-gray-600'
          }`}>
            {rank}
          </span>
        );
      },
    },
    {
      accessorKey: 'nickname',
      header: '닉네임',
      cell: ({ row }) => {
        return (
          <div>
            <p className="font-medium text-gray-900">{row.getValue('nickname')}</p>
            {row.original.tag && (
              <p className="text-xs text-gray-500">@{row.original.tag}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'level',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-100"
          >
            레벨
            {isSorted === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : isSorted === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const level = row.getValue('level') as number;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            level >= 7 ? 'bg-purple-100 text-purple-800' :
            level >= 6 ? 'bg-blue-100 text-blue-800' :
            level >= 5 ? 'bg-emerald-100 text-emerald-800' :
            level >= 4 ? 'bg-green-100 text-green-800' :
            level >= 3 ? 'bg-yellow-100 text-yellow-800' :
            level >= 2 ? 'bg-orange-100 text-orange-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            Lv.{level}
          </span>
        );
      },
    },
    {
      accessorKey: 'score',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover:bg-gray-100"
            >
              애청지수
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-right">
            <span className="font-bold text-blue-600">{row.getValue<number>('score').toLocaleString()}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'chat_count',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover:bg-gray-100"
            >
              채팅
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-right text-gray-600">
            {row.getValue<number>('chat_count').toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'like_count',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover:bg-gray-100"
            >
              좋아요
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-right text-gray-600">
            {row.getValue<number>('like_count').toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'spoon_count',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="hover:bg-gray-100"
            >
              스푼
              {isSorted === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : isSorted === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        return (
          <div className="text-right text-gray-600">
            {row.getValue<number>('spoon_count').toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'roulette_tickets',
      header: () => <div className="text-center">룰렛 티켓</div>,
      cell: ({ row }) => {
        const tickets = row.getValue('roulette_tickets') as number;
        return (
          <div className="flex justify-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              tickets > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {tickets}장
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'lottery_tickets',
      header: () => <div className="text-center">복권 티켓</div>,
      cell: ({ row }) => {
        const tickets = row.getValue('lottery_tickets') as number;
        return (
          <div className="flex justify-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              tickets > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {tickets}장
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'last_activity_at',
      header: '마지막 활동',
      cell: ({ row }) => {
        const lastActivity = row.getValue('last_activity_at') as string | undefined;
        return (
          <div className="text-sm text-gray-600">
            {formatDateTime(lastActivity)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">작업</div>,
      cell: ({ row }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openTicketDialog(row.original)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Ticket className="h-4 w-4 mr-1" />
              티켓 지급
            </Button>
          </div>
        );
      },
    },
  ];

  // Create table instance
  const table = useReactTable({
    data: filteredUsers,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

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

        {/* Filters */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">필터</CardTitle>
            <CardDescription className="text-gray-600">청취자를 다양한 조건으로 필터링할 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* User Combobox */}
              <div>
                <Label htmlFor="user-filter" className="text-gray-900">사용자 선택</Label>
                <Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userComboboxOpen}
                      className="w-full justify-between mt-1"
                    >
                      {selectedUser === 'all'
                        ? '전체'
                        : users.find((user) => user.user_id.toString() === selectedUser)?.nickname || '사용자를 선택하세요'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="닉네임 검색..." />
                      <CommandList>
                        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setSelectedUser('all');
                              setUserComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedUser === 'all' ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            전체
                          </CommandItem>
                          {users.map((user) => (
                            <CommandItem
                              key={user.user_id}
                              value={`${user.nickname} ${user.user_id} ${user.tag || ''}`}
                              onSelect={() => {
                                setSelectedUser(user.user_id.toString());
                                setUserComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedUser === user.user_id.toString() ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div>
                                <div className="font-medium">{user.nickname}</div>
                                <div className="text-xs text-gray-500">
                                  ID: {user.user_id} {user.tag && `· @${user.tag}`}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500 mt-1">
                  닉네임이나 ID로 검색하여 특정 사용자를 선택할 수 있습니다
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Level filter */}
                <div>
                  <Label htmlFor="level-filter" className="text-gray-900">레벨 필터</Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      value={levelOperator}
                      onValueChange={(value) => setLevelOperator(value as 'gte' | 'lte')}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gte">이상</SelectItem>
                        <SelectItem value="lte">이하</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="레벨 입력"
                      value={levelValue}
                      onChange={(e) => setLevelValue(e.target.value)}
                      className="flex-1"
                      min="1"
                    />
                  </div>
                </div>

                {/* Activity date filter */}
                <div>
                  <Label htmlFor="activity-filter" className="text-gray-900">마지막 활동 시간</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="시작일"
                      className="flex-1"
                    />
                    <span className="flex items-center text-gray-500">~</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="종료일 (비어있으면 현재)"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Reset button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser('all');
                    setLevelValue('');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  필터 초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User List */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">청취자 목록</CardTitle>
            <CardDescription className="text-gray-600">
              {loading ? '로딩 중...' : `총 ${filteredUsers.length}명의 청취자 (필터: ${users.length}명 중)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : (
              <>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && 'selected'}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center"
                          >
                            데이터가 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-gray-600">
                    전체 {table.getFilteredRowModel().rows.length}개 중 {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                    {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}개 표시
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      다음
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ticket Grant Dialog */}
        <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">룰렛 티켓 지급</DialogTitle>
              <DialogDescription className="text-gray-600">
                {selectedUserForTicket && (
                  <span>
                    <span className="font-semibold text-gray-900">{selectedUserForTicket.nickname}</span>님에게 룰렛 티켓을 지급합니다
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template Selection */}
              <div>
                <Label htmlFor="template" className="text-gray-900 font-medium">룰렛 템플릿 선택</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="템플릿을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      // .filter(t => t.enabled)
                      .map((template, index) => (
                        <SelectItem key={template.template_id} value={template.template_id}>
                          #{index + 1} {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  활성화된 템플릿만 표시됩니다
                </p>
              </div>

              {/* Ticket Count */}
              <div>
                <Label htmlFor="ticket-count" className="text-gray-900 font-medium">티켓 개수</Label>
                <Input
                  id="ticket-count"
                  type="number"
                  min="1"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(e.target.value)}
                  placeholder="지급할 티켓 개수"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1 이상의 정수를 입력하세요
                </p>
              </div>

              {/* User Info Card */}
              {selectedUserForTicket && (
                <Card className="border border-blue-200 bg-blue-50/50">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">닉네임:</span>
                        <span className="font-semibold text-gray-900">{selectedUserForTicket.nickname}</span>
                      </div>
                      {selectedUserForTicket.tag && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">고유닉:</span>
                          <span className="font-mono text-gray-900">@{selectedUserForTicket.tag}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">레벨:</span>
                        <span className="font-semibold text-gray-900">Lv.{selectedUserForTicket.level}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  💡 티켓이 지급되면 자동으로 채팅으로 알림이 전송됩니다
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTicketDialogOpen(false)}
                disabled={grantingTicket}
              >
                취소
              </Button>
              <Button
                onClick={grantTicket}
                disabled={grantingTicket || !selectedTemplate || !ticketCount}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {grantingTicket ? '지급 중...' : '티켓 지급'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
