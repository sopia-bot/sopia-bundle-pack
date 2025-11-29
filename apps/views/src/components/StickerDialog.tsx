import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { Check, CircleDollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Sticker, StickerCategory, StaticStickers } from '@sopia-bot/core';


// 스티커 스토어
interface StickerState {
  stickerList: StickerCategory[];
  allStickerList: StickerCategory[];
  isInit: boolean;
  setStickerList: (stickers: StickerCategory[]) => void;
}

export const useStickerStore = create<StickerState>((set) => ({
  stickerList: [],
  allStickerList: [],
  isInit: false,
  setStickerList: (newStickerList: StickerCategory[]) => {
    const usedStickers = newStickerList
      .filter((category: StickerCategory) => category.is_used)
      .map((category: StickerCategory) => ({
        ...category,
        stickers: category.stickers.filter((sticker: Sticker) => sticker.is_used),
      }))
      .filter((category: StickerCategory) => category.stickers.length > 0);
    
    set({
      stickerList: usedStickers,
      allStickerList: newStickerList,
      isInit: true,
    });
  },
}));

// 스티커 아이템 컴포넌트
interface StickerItemProps {
  sticker: Sticker;
  isSelected: boolean;
  onSelect: (sticker: Sticker) => void;
}

function StickerItem({ sticker, isSelected, onSelect }: StickerItemProps) {
  return (
    <div 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md border rounded-lg overflow-hidden ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : 'border-gray-200'
      }`}
      onClick={() => onSelect(sticker)}
    >
      <div className="relative aspect-square w-full flex items-center justify-center bg-gray-50">
        <img 
          src={sticker.image_url_web} 
          alt={sticker.title}
          className="w-full h-full object-contain"
        />
        {isSelected && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="p-2 text-center bg-white">
        <p className="text-xs text-gray-500 flex items-center justify-center">
            <CircleDollarSign className="w-4 h-4 text-yellow-600" />
            <span className='ml-1'>{sticker.price}</span>
        </p>
      </div>
    </div>
  );
}

// 스티커 다이얼로그 버튼 컴포넌트
interface StickerDialogButtonProps {
  selectedSticker?: Sticker | null;
  onStickerSelect: (sticker: Sticker) => void;
  placeholder?: string;
}

export function StickerDialogButton({ 
  selectedSticker, 
  onStickerSelect, 
  placeholder = "스티커를 선택해주세요" 
}: StickerDialogButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedStickerInternal, setSelectedStickerInternal] = useState<Sticker | null>(selectedSticker || null);
  const [activeTab, setActiveTab] = useState<string>('');
  const { stickerList, isInit, setStickerList } = useStickerStore();
  const [loading, setLoading] = useState(true);

  // 스티커 데이터 로드
  useEffect(() => {
    if (!isInit) {
      fetch('https://static.spooncast.net/kr/stickers/index.json')
        .then((res) => res.json())
        .then((data: StaticStickers) => {
          const usedStickers = data.categories
            .filter((category: StickerCategory) => category.is_used)
            .map((category: StickerCategory) => ({
              ...category,
              stickers: category.stickers.filter((sticker: Sticker) => {
                if (!sticker.start_date || !sticker.end_date) return sticker.is_used;
                const start = new Date(sticker.start_date);
                const end = new Date(sticker.end_date);
                const now = new Date();
                return now >= start && now <= end;
              }),
            }))
            .filter((category: StickerCategory) => category.stickers.length > 0);
          setStickerList(usedStickers);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch stickers:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [isInit, setStickerList]);

  // 첫 번째 탭을 기본값으로 설정
  useEffect(() => {
    if (stickerList.length > 0 && !activeTab) {
      setActiveTab(stickerList[0].name);
    }
  }, [stickerList, activeTab]);

  // 외부에서 전달된 selectedSticker가 변경될 때 내부 상태 업데이트
  useEffect(() => {
    setSelectedStickerInternal(selectedSticker || null);
  }, [selectedSticker]);

  const handleStickerSelect = (sticker: Sticker) => {
    setSelectedStickerInternal(sticker);
  };

  const handleConfirm = () => {
    if (selectedStickerInternal) {
      onStickerSelect(selectedStickerInternal);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setSelectedStickerInternal(selectedSticker || null);
    setOpen(false);
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="min-w-[200px] h-10">
        로딩 중...
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-w-[200px] h-10 justify-start cursor-pointer">
          {selectedStickerInternal ? (
            <div className="flex items-center gap-2 justify-between w-full">
                <div className='flex items-center'>
                    <img 
                        src={selectedStickerInternal.image_url_web} 
                        alt={selectedStickerInternal.title}
                        className="w-6 h-6 object-contain"
                    />
                    <span className="ml-1 font-medium">{selectedStickerInternal.title}</span>
                </div>
                <div className='flex items-center'>
                    <span className="mr-1 font-medium">{selectedStickerInternal.price}</span>
                    <CircleDollarSign className="w-4 h-4 text-yellow-600" />
                </div>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl min-w-[800px] min-h-[600px] max-h-[600px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>스티커 선택</DialogTitle>
          <DialogDescription>
            사용할 스티커를 선택해주세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                {stickerList.map((category) => (
                  <TabsTrigger 
                    key={category.name} 
                    value={category.name}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer hover:bg-background/50 hover:text-foreground"
                  >
                    {category.title.replace(/[\b]/g, '')}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            {stickerList.map((category) => (
              <TabsContent 
                key={category.name} 
                value={category.name}
                className="h-[400px] overflow-y-auto min-h-[400px] max-h-[400px]"
              >
                <div className="grid grid-cols-3 gap-4 p-4">
                  {category.stickers.map((sticker) => (
                    <StickerItem
                      key={sticker.name}
                      sticker={sticker}
                      isSelected={selectedStickerInternal?.name === sticker.name}
                      onSelect={handleStickerSelect}
                    />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedStickerInternal}
          >
            선택 확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 스티커 검색 유틸리티 함수
export function findSticker(stickerList: StickerCategory[], stickerName: string): Sticker | null {
  for (const category of stickerList) {
    const sticker = category.stickers.find((s) => s.name === stickerName);
    if (sticker) {
      return sticker;
    }
  }
  return null;
}
