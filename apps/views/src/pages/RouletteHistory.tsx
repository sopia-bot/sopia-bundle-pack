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
import { Filter, Check, X, Clock, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
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
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">룰렛 기록</h1>
          <p className="text-gray-600 text-lg">룰렛 당첨 기록과 사용 상태를 관리합니다</p>
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
      </div>
    </Layout>
  );
}
