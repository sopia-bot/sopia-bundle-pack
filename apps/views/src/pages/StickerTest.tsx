import { useState } from 'react';
import { StickerDialogButton } from '@/components/StickerDialog';

// 스티커 타입 정의 (StickerDialog.tsx와 동일)
interface Sticker {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly isCashout: number;
  readonly display: number;
  readonly type: number;
  readonly price: number;
  readonly color: string;
  readonly color_web: string;
  readonly tag: string;
  readonly image_thumbnail: string;
  readonly image_thumbnail_web: string;
  readonly image_urls: string[];
  readonly image_url_web: string;
  readonly lottie_url: string;
  readonly lottie_combo_url: string;
  readonly order: number;
  readonly is_used: boolean;
  readonly start_date: string;
  readonly end_date: string;
  readonly updated: string;
  readonly category: string;
}

export function StickerTest() {
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);

  const handleStickerSelect = (sticker: Sticker) => {
    setSelectedSticker(sticker);
    console.log('Selected sticker:', sticker);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">스티커 다이얼로그 테스트</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">스티커 선택</h2>
          <StickerDialogButton
            selectedSticker={selectedSticker}
            onStickerSelect={handleStickerSelect}
            placeholder="스티커를 선택해주세요"
          />
        </div>

        {selectedSticker && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium mb-2">선택된 스티커</h3>
            <div className="flex items-center gap-4">
              <img 
                src={selectedSticker.image_url_web} 
                alt={selectedSticker.title}
                className="w-16 h-16 object-contain"
              />
              <div>
                <p className="font-medium">{selectedSticker.title}</p>
                <p className="text-sm text-gray-600">{selectedSticker.description}</p>
                <p className="text-sm font-medium text-blue-600">{selectedSticker.price}원</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
