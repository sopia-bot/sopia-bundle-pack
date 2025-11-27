import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Layout } from '../components/Layout';
import { Plus, Edit, Trash2, Save, X, Download } from 'lucide-react';
import { RouletteMigrationDialog } from '../components/RouletteMigrationDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { StickerDialogButton, findSticker, useStickerStore } from '../components/StickerDialog';
import type { Sticker } from '@sopia-bot/core';
import { toast } from 'sonner';

interface TemplateItem {
  type: 'shield' | 'ticket' | 'shop' | 'custom';
  label: string;
  percentage: number;
  value?: number; // 실드/복권의 증감값
}

interface Template {
  template_id: string;
  name: string;
  mode: 'sticker' | 'spoon' | 'like';
  sticker?: string;
  spoon?: number;
  division: boolean;
  auto_run: boolean;
  enabled: boolean;
  items: TemplateItem[];
}

export function TemplateSettings() {
  const { templates, fetchTemplates } = useAppStore();
  const { allStickerList } = useStickerStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // 스티커 이름으로 스티커 객체 찾기
  useEffect(() => {
    if (editingTemplate?.sticker && allStickerList.length > 0) {
      const sticker = findSticker(allStickerList, editingTemplate.sticker);
      setSelectedSticker(sticker);
    } else {
      setSelectedSticker(null);
    }
  }, [editingTemplate?.sticker, allStickerList]);

  const createNewTemplate = () => {
    const newTemplate: Template = {
      template_id: `template-${Date.now()}`,
      name: '새 템플릿',
      mode: 'sticker',
      sticker: '',
      spoon: 1,
      division: false,
      auto_run: false,
      enabled: true,
      items: [],
    };
    setEditingTemplate(newTemplate);
    setIsEditing(true);
  };

  const editTemplate = (template: Template) => {
    setEditingTemplate({ ...template });
    setIsEditing(true);
  };

  const handleStickerSelect = (sticker: Sticker) => {
    setSelectedSticker(sticker);
    setEditingTemplate({
      ...editingTemplate!,
      sticker: sticker.name
    });
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;

    // 아이템 총 확률 검증
    const totalPercentage = editingTemplate.items.reduce((sum, item) => sum + item.percentage, 0);
    if (totalPercentage > 100) {
      toast.error('아이템 총 확률이 100%를 초과할 수 없습니다!');
      return;
    }

    // 좋아요 모드는 항상 auto_run을 true로 설정
    const templateToSave = {
      ...editingTemplate,
      auto_run: editingTemplate.mode === 'like' ? true : editingTemplate.auto_run
    };

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
        body: JSON.stringify(templateToSave),
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
          <div className="flex gap-2">
            <Button
              onClick={() => setMigrationDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
              size="lg"
            >
              <Download size={20} />
              룰렛 템플릿 마이그레이션
            </Button>
            <Button
              onClick={createNewTemplate}
              className="flex items-center gap-2"
              size="lg"
            >
              <Plus size={20} />
              새 템플릿
            </Button>
          </div>
        </div>

        {/* Template List */}
        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template, index) => (
              <Card key={template.template_id} className="border shadow-lg">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 mb-1">
                        <span className="inline-flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm font-semibold">#{index + 1}</span>
                          {template.name}
                        </span>
                      </CardTitle>
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
                <CardTitle className="text-2xl font-bold text-gray-900">
                  <span className="inline-flex items-center gap-2">
                    {(() => {
                      const index = templates.findIndex(t => t.template_id === editingTemplate.template_id);
                      return index >= 0 ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-lg font-semibold">#{index + 1}</span>
                      ) : (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-lg font-semibold">NEW</span>
                      );
                    })()}
                    템플릿 편집
                  </span>
                </CardTitle>
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
                    onValueChange={(value) => {
                      // 좋아요 모드는 항상 auto_run을 true로 설정
                      setEditingTemplate({
                        ...editingTemplate,
                        mode: value as any,
                        auto_run: value === 'like' ? true : editingTemplate.auto_run
                      });
                    }}
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
                    <Label className="text-gray-900 mb-2 block">스티커 선택</Label>
                    <StickerDialogButton
                      selectedSticker={selectedSticker}
                      onStickerSelect={handleStickerSelect}
                      placeholder="스티커를 선택해주세요"
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
                    id="enabled"
                    checked={editingTemplate.enabled}
                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, enabled: checked })}
                  />
                  <Label htmlFor="enabled" className="text-gray-900">룰렛 활성화</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-run"
                    checked={editingTemplate.auto_run}
                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, auto_run: checked })}
                    disabled={editingTemplate.mode === 'like'}
                  />
                  <Label htmlFor="auto-run" className={`${editingTemplate.mode === 'like' ? 'text-gray-400' : 'text-gray-900'}`}>
                    자동 실행
                    {editingTemplate.mode === 'like' && (
                      <span className="text-xs text-gray-400 ml-2">(좋아요 모드는 항상 자동 실행)</span>
                    )}
                  </Label>
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
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-gray-900 text-xs">타입</Label>
                              <Select
                                value={item.type}
                                onValueChange={(value) => {
                                  // 타입과 기본값을 한 번에 업데이트
                                  const updatedItems = [...editingTemplate.items];
                                  if (value === 'shield' || value === 'ticket' || value === 'shop') {
                                    const defaultValue = 1;
                                    const sign = '+';
                                    let label = '';
                                    if (value === 'shield') label = `실드 ${sign}${defaultValue}`;
                                    else if (value === 'ticket') label = `복권 ${defaultValue}장`;
                                    else if (value === 'shop') label = `상점 ${sign}${defaultValue}점`;

                                    updatedItems[index] = {
                                      ...updatedItems[index],
                                      type: value as 'shield' | 'ticket' | 'shop' | 'custom',
                                      value: defaultValue,
                                      label: label
                                    };
                                  } else {
                                    updatedItems[index] = {
                                      ...updatedItems[index],
                                      type: value as 'shield' | 'ticket' | 'shop' | 'custom'
                                    };
                                  }
                                  setEditingTemplate({ ...editingTemplate, items: updatedItems });
                                }}
                              >
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue placeholder="타입을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="shield">실드</SelectItem>
                                  <SelectItem value="ticket">복권</SelectItem>
                                  <SelectItem value="shop">상점</SelectItem>
                                  <SelectItem value="custom">커스텀</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 실드/복권/상점은 증감값, 커스텀은 라벨 */}
                            {item.type === 'shield' || item.type === 'ticket' || item.type === 'shop' ? (
                              <div>
                                <Label className="text-gray-900 text-xs">증감값</Label>
                                <Input
                                  type="number"
                                  value={item.value !== undefined ? item.value : ''}
                                  onChange={(e) => {
                                    // 빈 값 허용, 입력된 값 그대로 저장
                                    const inputValue = e.target.value;
                                    const val = inputValue === '' ? '' as any : parseInt(inputValue);

                                    // 라벨 생성 (빈 값이면 기본 텍스트)
                                    let label = '';
                                    if (val === '') {
                                      if (item.type === 'shield') label = '실드';
                                      else if (item.type === 'ticket') label = '복권';
                                      else if (item.type === 'shop') label = '상점';
                                    } else {
                                      const numVal = typeof val === 'number' ? val : 0;
                                      const sign = numVal >= 0 ? '+' : '';
                                      if (item.type === 'shield') label = `실드 ${sign}${numVal}`;
                                      else if (item.type === 'ticket') label = `복권 ${numVal}장`;
                                      else if (item.type === 'shop') label = `상점 ${sign}${numVal}점`;
                                    }

                                    // value와 label 동시 업데이트
                                    const updatedItems = [...editingTemplate.items];
                                    updatedItems[index] = {
                                      ...updatedItems[index],
                                      value: val,
                                      label: label
                                    };
                                    setEditingTemplate({ ...editingTemplate, items: updatedItems });
                                  }}
                                  placeholder="숫자 입력 (음수 가능)"
                                  className="mt-1"
                                />
                              </div>
                            ) : (
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
                            )}

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

                          {/* 타입 설명 */}
                          <p className="text-xs text-gray-500">
                            {item.type === 'shield' && '💡 남아있는 실드의 개수를 증감할 수 있습니다.'}
                            {item.type === 'ticket' && '💡 당첨된 사람에게 복권을 지급합니다.'}
                            {item.type === 'shop' && '💡 당첨된 사람의 애청지수를 증감합니다.'}
                            {item.type === 'custom' && '💡 원하는 당첨 항목을 입력합니다.'}
                          </p>
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

        {/* Migration Dialog */}
        <RouletteMigrationDialog
          open={migrationDialogOpen}
          onOpenChange={setMigrationDialogOpen}
          onSuccess={() => {
            fetchTemplates();
          }}
        />
      </div>
    </Layout >
  );
}

