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
import { useAppStore } from '../stores/useAppStore';
import { Layout } from '../components/Layout';
import { Filter, Check, X, Clock, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsUpDown, RotateCcw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface RouletteRecord {
  id: string;
  template_id: string;
  user_id: number;
  nickname: string;
  item: {
    type: string;
    label: string;
    percentage: number;
  };
  used: boolean;
  timestamp: string;
}

export function RouletteHistory() {
  const { rouletteHistory, templates, fetchRouletteHistory, fetchTemplates, updateRouletteRecord } = useAppStore();
  
  // Table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  
  // Combobox state for user search
  const [userComboboxOpen, setUserComboboxOpen] = useState(false);
  
  // Reset dialog states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetTemplateId, setResetTemplateId] = useState<string>('all');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchRouletteHistory();
    fetchTemplates();
  }, [fetchRouletteHistory, fetchTemplates]);

  // Update column filters when filter dropdowns change
  useEffect(() => {
    setColumnFilters([
      { id: 'used', value: filterStatus },
      { id: 'template_id', value: filterTemplate },
      { id: 'nickname', value: filterUser },
    ]);
  }, [filterStatus, filterTemplate, filterUser]);

  // Get unique users from history
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<number, string>();
    rouletteHistory.forEach(record => {
      if (!userMap.has(record.user_id)) {
        userMap.set(record.user_id, record.nickname);
      }
    });
    return Array.from(userMap.entries()).map(([user_id, nickname]) => ({
      user_id,
      nickname
    }));
  }, [rouletteHistory]);

  const handleToggleUsed = async (recordId: string, currentStatus: boolean) => {
    try {
      await updateRouletteRecord(recordId, !currentStatus);
      toast.success(currentStatus ? '미사용으로 변경되었습니다.' : '사용됨으로 변경되었습니다.');
      await fetchRouletteHistory(); // Refresh data after update
    } catch (error) {
      console.error('Failed to update record:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  const handleReset = async () => {
    try {
      setResetting(true);

      const response = await fetch('stp://starter-pack.sopia.dev/roulette/history/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: resetTemplateId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const templateName = resetTemplateId === 'all' 
          ? '전체' 
          : templates.find(t => t.template_id === resetTemplateId)?.name || resetTemplateId;
        toast.success(`${templateName} 기록 ${result.deletedCount}개가 초기화되었습니다.`);
        setResetDialogOpen(false);
        await fetchRouletteHistory(); // 목록 새로고침
      } else {
        throw new Error('Failed to reset');
      }
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('초기화에 실패했습니다.');
    } finally {
      setResetting(false);
    }
  };

  const getItemBadgeColor = (type: string) => {
    switch (type) {
      case 'shield':
        return 'bg-blue-600';
      case 'ticket':
        return 'bg-purple-600';
      case 'custom':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const columns: ColumnDef<RouletteRecord>[] = [
    {
      accessorKey: 'used',
      header: '상태',
      cell: ({ row }) => {
        const used = row.getValue('used') as boolean;
        return (
          <div className="flex items-center gap-2">
            {used ? (
              <>
                <Check className="text-gray-500" size={18} />
                <span className="text-gray-500 text-sm">사용됨</span>
              </>
            ) : (
              <>
                <Clock className="text-green-600" size={18} />
                <span className="text-green-600 text-sm">예정</span>
              </>
            )}
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        if (value === 'all') return true;
        if (value === 'used') return row.original.used === true;
        if (value === 'pending') return row.original.used === false;
        return true;
      },
    },
    {
      accessorKey: 'nickname',
      header: '닉네임',
      cell: ({ row }) => {
        return (
          <div>
            <div className="text-gray-900 font-medium">{row.getValue('nickname')}</div>
            <div className="text-gray-500 text-sm">ID: {row.original.user_id}</div>
          </div>
        );
      },
      filterFn: (row, _id, value) => {
        if (value === 'all') return true;
        return row.original.user_id.toString() === value;
      },
    },
    {
      accessorKey: 'template_id',
      header: '템플릿',
      cell: ({ row }) => {
        const templateId = row.getValue('template_id') as string;
        const template = templates.find(t => t.template_id === templateId);
        return <span className="text-gray-900">{template?.name || templateId}</span>;
      },
      filterFn: (row, _id, value) => {
        if (value === 'all') return true;
        return row.original.template_id === value;
      },
    },
    {
      accessorKey: 'item',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-100"
          >
            당첨 아이템
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
        const item = row.getValue('item') as RouletteRecord['item'];
        return (
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${getItemBadgeColor(item.type)}`}>
            {item.label}
          </span>
        );
      },
      sortingFn: (rowA, rowB, _id) => {
        const itemA = rowA.original.item.label;
        const itemB = rowB.original.item.label;
        return itemA.localeCompare(itemB);
      },
    },
    {
      id: 'percentage',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-100"
          >
            확률
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
      accessorFn: (row) => row.item.percentage,
      cell: ({ row }) => {
        const percentage = row.original.item.percentage;
        return (
          <span className={`text-sm font-medium ${percentage < 1 ? 'text-yellow-600' : 'text-gray-600'}`}>
            {percentage}%
          </span>
        );
      },
    },
    {
      accessorKey: 'timestamp',
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-gray-100"
          >
            시간
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
        const timestamp = row.getValue('timestamp') as string;
        return (
          <div>
            <div className="text-gray-900 text-sm">
              {new Date(timestamp).toLocaleDateString('ko-KR')}
            </div>
            <div className="text-gray-500 text-xs">
              {new Date(timestamp).toLocaleTimeString('ko-KR')}
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center">액션</div>,
      cell: ({ row }) => {
        const used = row.original.used;
        const id = row.original.id;
        return (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleUsed(id, used)}
              className={`flex items-center gap-2 ${
                used
                  ? 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              {used ? (
                <>
                  <X size={16} />
                  미사용으로
                </>
              ) : (
                <>
                  <Check size={16} />
                  사용됨으로
                </>
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  // Create table instance
  const table = useReactTable({
    data: rouletteHistory,
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
        pageSize: 10,
      },
    },
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">룰렛 기록</h1>
            <p className="text-gray-600 text-lg">룰렛 당첨 기록과 사용 상태를 관리합니다</p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setResetDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            기록 초기화
          </Button>
        </div>

        {/* Filters */}
        <Card className="border shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Filter className="text-gray-600" size={20} />
              <CardTitle className="text-gray-900">필터</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status-filter" className="text-gray-900">상태</Label>
                <Select
                  value={filterStatus}
                  onValueChange={setFilterStatus}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="상태를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="pending">예정</SelectItem>
                    <SelectItem value="used">사용됨</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-filter" className="text-gray-900">템플릿</Label>
                <Select
                  value={filterTemplate}
                  onValueChange={setFilterTemplate}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="템플릿을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.template_id} value={template.template_id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="user-filter" className="text-gray-900">사용자</Label>
                <Popover open={userComboboxOpen} onOpenChange={setUserComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userComboboxOpen}
                      className="w-full justify-between mt-1"
                    >
                      {filterUser === 'all'
                        ? '전체'
                        : uniqueUsers.find((user) => user.user_id.toString() === filterUser)?.nickname || '사용자를 선택하세요'}
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
                              setFilterUser('all');
                              setUserComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                filterUser === 'all' ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            전체
                          </CommandItem>
                          {uniqueUsers.map((user) => (
                            <CommandItem
                              key={user.user_id}
                              value={`${user.nickname} ${user.user_id}`}
                              onSelect={() => {
                                setFilterUser(user.user_id.toString());
                                setUserComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  filterUser === user.user_id.toString() ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <div>
                                <div className="font-medium">{user.nickname}</div>
                                <div className="text-xs text-gray-500">ID: {user.user_id}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border shadow-lg">
            <CardContent className="p-6">
              <div className="text-gray-600 text-sm mb-2">전체 기록</div>
              <div className="text-3xl font-bold text-gray-900">{rouletteHistory.length}</div>
            </CardContent>
          </Card>
          <Card className="border shadow-lg">
            <CardContent className="p-6">
              <div className="text-gray-600 text-sm mb-2">사용 예정</div>
              <div className="text-3xl font-bold text-green-600">
                {rouletteHistory.filter(r => !r.used).length}
              </div>
            </CardContent>
          </Card>
          <Card className="border shadow-lg">
            <CardContent className="p-6">
              <div className="text-gray-600 text-sm mb-2">사용 완료</div>
              <div className="text-3xl font-bold text-gray-600">
                {rouletteHistory.filter(r => r.used).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900">룰렛 기록 목록</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Reset Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-red-600">
                <AlertTriangle className="h-6 w-6" />
                룰렛 기록 초기화
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                초기화할 템플릿을 선택하세요. 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template Selection */}
              <div>
                <Label htmlFor="reset-template" className="text-base font-medium">
                  초기화할 템플릿
                </Label>
                <Select value={resetTemplateId} onValueChange={setResetTemplateId}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="템플릿을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 초기화</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.template_id} value={template.template_id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  전체 초기화를 선택하면 모든 템플릿의 기록이 삭제됩니다
                </p>
              </div>

              {/* Info Card */}
              {resetTemplateId !== 'all' && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">선택한 템플릿 기록만 삭제됩니다</p>
                      <p>
                        템플릿: {templates.find(t => t.template_id === resetTemplateId)?.name}
                      </p>
                      <p className="mt-1 text-xs text-blue-600">
                        해당 기록: {rouletteHistory.filter(r => r.template_id === resetTemplateId).length}개
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {resetTemplateId === 'all' && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="text-sm text-orange-800">
                      <p className="font-semibold mb-1">전체 기록이 삭제됩니다</p>
                      <p className="text-xs text-orange-600">
                        총 {rouletteHistory.length}개의 기록이 삭제됩니다
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Warning */}
              <Card className="border-red-500 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-red-800">주의사항</p>
                      <p className="text-sm text-red-700">
                        삭제된 기록은 복구할 수 없습니다.
                      </p>
                      <p className="text-sm text-red-700">
                        신중하게 선택해주세요.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setResetDialogOpen(false)}
                disabled={resetting}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={resetting}
                className="bg-red-600 hover:bg-red-700"
              >
                {resetting ? '초기화 중...' : '초기화 실행'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
