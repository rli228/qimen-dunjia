'use client';

import type { Palace } from '@/lib/qimen/types';
import type { PalaceIndex } from '@/lib/qimen/constants';
import { PALACE_WUXING } from '@/lib/qimen/constants';

interface PalaceCellProps {
  palace: Palace;
  isZhiFuPalace: boolean;
  onClick?: () => void;
}

export function PalaceCell({ palace, isZhiFuPalace, onClick }: PalaceCellProps) {
  const wuxing = PALACE_WUXING[palace.index];

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-stretch rounded-lg border p-2 text-left
        transition-all hover:shadow-md
        ${isZhiFuPalace ? 'border-qimen-gold ring-1 ring-qimen-gold/30' : 'border-qimen-border'}
        ${palace.isEmpty ? 'opacity-60' : ''}
        bg-qimen-surface
      `}
    >
      {/* 顶部：神 + 星 */}
      <div className="flex items-center justify-between text-xs">
        <span className="deity-color font-medium">{palace.deity}</span>
        <span className="star-color font-medium">{palace.star}</span>
      </div>

      {/* 中部：天盘干 / 地盘干 */}
      <div className="my-1.5 flex items-center justify-center gap-2">
        <span className="tian-gan-color text-lg font-bold">{palace.tianPanGan}</span>
        <span className="text-xs text-qimen-text-secondary">/</span>
        <span className="di-gan-color text-lg font-bold">{palace.diPanGan}</span>
      </div>

      {/* 底部：门 */}
      <div className="flex items-center justify-between text-xs">
        <span className="gate-color font-medium">{palace.gate}门</span>
        <span className="text-qimen-text-secondary">{palace.name}{palace.index} · {wuxing}</span>
      </div>

      {/* 空亡标记 */}
      {palace.isEmpty && (
        <span className="absolute -right-1 -top-1 rounded-full bg-qimen-red px-1 text-[10px] text-white">
          空
        </span>
      )}

      {/* 值符标记 */}
      {isZhiFuPalace && (
        <span className="absolute -left-1 -top-1 rounded-full bg-qimen-gold px-1 text-[10px] text-white">
          符
        </span>
      )}
    </button>
  );
}
