import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Layout } from '../components/Layout';
import { Filter, Check, X, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function RouletteHistory() {
  const { rouletteHistory, templates, fetchRouletteHistory, fetchTemplates, updateRouletteRecord } = useAppStore();
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchRouletteHistory();
    fetchTemplates();
  }, [fetchRouletteHistory, fetchTemplates]);

  const filteredHistory = rouletteHistory.filter(record => {
    if (filterTemplate !== 'all' && record.template_id !== filterTemplate) return false;
    if (filterStatus === 'used' && !record.used) return false;
    if (filterStatus === 'pending' && record.used) return false;
    return true;
  });

  const handleToggleUsed = async (recordId: string, currentStatus: boolean) => {
    try {
      await updateRouletteRecord(recordId, !currentStatus);
      toast.success(currentStatus ? '미사용으로 변경되었습니다.' : '사용됨으로 변경되었습니다.');
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* History List */}
        <Card className="border shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">상태</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">닉네임</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">템플릿</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">당첨 아이템</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">확률</th>
                  <th className="text-left py-4 px-6 text-gray-600 font-semibold">시간</th>
                  <th className="text-center py-4 px-6 text-gray-600 font-semibold">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">
                      기록이 없습니다
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((record) => {
                    const template = templates.find(t => t.template_id === record.template_id);
                    return (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {record.used ? (
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
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="text-gray-900 font-medium">{record.nickname}</div>
                            <div className="text-gray-500 text-sm">ID: {record.user_id}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-900">{template?.name || record.template_id}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${getItemBadgeColor(record.item.type)}`}>
                            {record.item.label}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`text-sm font-medium ${record.item.percentage < 1 ? 'text-yellow-600' : 'text-gray-600'}`}>
                            {record.item.percentage}%
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-gray-900 text-sm">
                            {new Date(record.timestamp).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(record.timestamp).toLocaleTimeString('ko-KR')}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUsed(record.id, record.used)}
                              className={`flex items-center gap-2 ${
                                record.used
                                  ? 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {record.used ? (
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

