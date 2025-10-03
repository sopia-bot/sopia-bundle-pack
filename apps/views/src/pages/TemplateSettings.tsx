import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Layout } from '../components/Layout';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface TemplateItem {
  type: 'shield' | 'ticket' | 'custom';
  label: string;
  percentage: number;
}

interface Template {
  template_id: string;
  name: string;
  mode: 'sticker' | 'spoon' | 'like';
  sticker?: string;
  spoon?: number;
  division: boolean;
  auto_run: boolean;
  sound_below_1percent: boolean;
  items: TemplateItem[];
}

export function TemplateSettings() {
  const { templates, fetchTemplates } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createNewTemplate = () => {
    const newTemplate: Template = {
      template_id: `template-${Date.now()}`,
      name: '새 템플릿',
      mode: 'sticker',
      sticker: '',
      spoon: 1,
      division: false,
      auto_run: false,
      sound_below_1percent: true,
      items: [],
    };
    setEditingTemplate(newTemplate);
    setIsEditing(true);
  };

  const editTemplate = (template: Template) => {
    setEditingTemplate({ ...template });
    setIsEditing(true);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;

    // 아이템 총 확률 검증
    const totalPercentage = editingTemplate.items.reduce((sum, item) => sum + item.percentage, 0);
    if (totalPercentage > 100) {
      toast.error('아이템 총 확률이 100%를 초과할 수 없습니다!');
      return;
    }

    const isNew = !templates.find(t => t.template_id === editingTemplate.template_id);
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew 
      ? 'stp://starter-pack.sopia.dev/templates'
      : `stp://starter-pack.sopia.dev/templates/${editingTemplate.template_id}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingTemplate),
      });

      if (response.ok) {
        fetchTemplates();
        setIsEditing(false);
        setEditingTemplate(null);
        toast.success(isNew ? '템플릿이 생성되었습니다.' : '템플릿이 수정되었습니다.');
      } else {
        throw new Error('Failed to save template');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('템플릿 저장에 실패했습니다.');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`stp://starter-pack.sopia.dev/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTemplates();
        toast.success('템플릿이 삭제되었습니다.');
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('템플릿 삭제에 실패했습니다.');
    }
  };

  const addItem = () => {
    if (!editingTemplate) return;
    
    setEditingTemplate({
      ...editingTemplate,
      items: [...editingTemplate.items, { type: 'custom', label: '', percentage: 0.001 }],
    });
  };

  const updateItem = (index: number, field: keyof TemplateItem, value: any) => {
    if (!editingTemplate) return;

    const updatedItems = [...editingTemplate.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditingTemplate({ ...editingTemplate, items: updatedItems });
  };

  const removeItem = (index: number) => {
    if (!editingTemplate) return;

    const updatedItems = editingTemplate.items.filter((_, i) => i !== index);
    setEditingTemplate({ ...editingTemplate, items: updatedItems });
  };

  const getTotalPercentage = () => {
    if (!editingTemplate) return 0;
    return editingTemplate.items.reduce((sum, item) => sum + item.percentage, 0);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">템플릿 설정</h1>
            <p className="text-gray-600 text-lg">룰렛 템플릿을 생성하고 관리합니다</p>
          </div>
          <Button
            onClick={createNewTemplate}
            className="flex items-center gap-2"
            size="lg"
          >
            <Plus size={20} />
            새 템플릿
          </Button>
        </div>

        {/* Template List */}
        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card key={template.template_id} className="border shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 mb-1">{template.name}</CardTitle>
                      <CardDescription className="text-gray-600">
                        {template.mode === 'sticker' && `스티커: ${template.sticker}`}
                        {template.mode === 'spoon' && `스푼: ${template.spoon}개`}
                        {template.mode === 'like' && '좋아요'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editTemplate(template)}
                      >
                        <Edit size={18} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 size={18} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              정말로 이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplate(template.template_id)} className="bg-red-600 hover:bg-red-700">
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">분배 모드:</span>
                      <span className="text-gray-900">{template.division ? '활성화' : '비활성화'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">자동 실행:</span>
                      <span className="text-gray-900">{template.auto_run ? '활성화' : '비활성화'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">1% 효과음:</span>
                      <span className="text-gray-900">{template.sound_below_1percent ? '활성화' : '비활성화'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-600 text-sm mb-2">아이템 목록 ({template.items.length}개)</p>
                    <div className="space-y-1">
                      {template.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-900">{item.label}</span>
                          <span className="text-gray-600">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Form */}
        {isEditing && editingTemplate && (
          <Card className="border shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900">템플릿 편집</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={saveTemplate}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Save size={18} />
                    저장
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingTemplate(null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <X size={18} />
                    취소
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <Label htmlFor="template-name" className="text-gray-900">템플릿 이름</Label>
                <Input
                  id="template-name"
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Mode Selection */}
              <div>
                <Label htmlFor="template-mode" className="text-gray-900">룰렛 방식</Label>
                <Select
                  value={editingTemplate.mode}
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate, mode: value as any })}
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="룰렛 방식을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sticker">스티커</SelectItem>
                    <SelectItem value="spoon">스푼</SelectItem>
                    <SelectItem value="like">좋아요</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode-specific settings */}
              {editingTemplate.mode === 'sticker' && (
                <div>
                  <Label htmlFor="sticker-name" className="text-gray-900">스티커 이름</Label>
                  <Input
                    id="sticker-name"
                    type="text"
                    value={editingTemplate.sticker || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, sticker: e.target.value })}
                    placeholder="스티커 이름 입력"
                    className="mt-1"
                  />
                </div>
              )}

              {editingTemplate.mode === 'spoon' && (
                <div>
                  <Label htmlFor="spoon-count" className="text-gray-900">스푼 개수</Label>
                  <Input
                    id="spoon-count"
                    type="number"
                    min="1"
                    value={editingTemplate.spoon || 1}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, spoon: parseInt(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Toggles */}
              {(editingTemplate.mode === 'sticker' || editingTemplate.mode === 'spoon') && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="division"
                    checked={editingTemplate.division}
                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, division: checked })}
                  />
                  <Label htmlFor="division" className="text-gray-900">분배 모드</Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-run"
                  checked={editingTemplate.auto_run}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, auto_run: checked })}
                />
                <Label htmlFor="auto-run" className="text-gray-900">자동 실행</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sound-effect"
                  checked={editingTemplate.sound_below_1percent}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, sound_below_1percent: checked })}
                />
                <Label htmlFor="sound-effect" className="text-gray-900">1% 미만 효과음 재생</Label>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-gray-900">
                    아이템 목록 (총 {getTotalPercentage().toFixed(3)}% / 100%)
                  </Label>
                  <Button
                    onClick={addItem}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    아이템 추가
                  </Button>
                </div>

                <div className="space-y-3">
                  {editingTemplate.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-gray-900 text-xs">타입</Label>
                          <Select
                            value={item.type}
                            onValueChange={(value) => updateItem(index, 'type', value)}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="타입을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shield">실드</SelectItem>
                              <SelectItem value="ticket">복권</SelectItem>
                              <SelectItem value="custom">커스텀</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-gray-900 text-xs">라벨</Label>
                          <Input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateItem(index, 'label', e.target.value)}
                            placeholder="아이템 이름"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-900 text-xs">확률 (%)</Label>
                          <Input
                            type="number"
                            min="0.001"
                            max="100"
                            step="0.001"
                            value={item.percentage}
                            onChange={(e) => updateItem(index, 'percentage', parseFloat(e.target.value))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-5"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>

                {getTotalPercentage() < 100 && (
                  <p className="text-yellow-600 text-sm mt-2">
                    나머지 {(100 - getTotalPercentage()).toFixed(3)}%는 자동으로 꽝이 됩니다.
                  </p>
                )}
                {getTotalPercentage() > 100 && (
                  <p className="text-red-600 text-sm mt-2">
                    총 확률이 100%를 초과했습니다! ({getTotalPercentage().toFixed(3)}%)
                  </p>
                )}
              </div>
            </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

