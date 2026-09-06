'use client';

import type { Palace } from '@/lib/qimen/types';
import { PALACE_WUXING, STAR_FORTUNE, GATE_FORTUNE } from '@/lib/qimen/constants';

interface PalaceDetailProps {
  palace: Palace;
  onClose: () => void;
}

export function PalaceDetail({ palace, onClose }: PalaceDetailProps) {
  const wuxing = PALACE_WUXING[palace.index];
  const starFortune = STAR_FORTUNE[palace.star];
  const gateFortune = GATE_FORTUNE[palace.gate];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-xl border border-qimen-border bg-qimen-surface p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {palace.name}{palace.index}宫 · {wuxing}
          </h3>
          <button onClick={onClose} className="text-qimen-text-secondary hover:text-qimen-text">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <DetailRow
            label="八神"
            value={palace.deity}
            className="deity-color"
          />
          <DetailRow
            label="九星"
            value={`${palace.star}（${starFortune}）`}
            className="star-color"
          />
          <DetailRow
            label="天盘干"
            value={palace.tianPanGan}
            className="tian-gan-color"
          />
          <DetailRow
            label="地盘干"
            value={palace.diPanGan}
            className="di-gan-color"
          />
          <DetailRow
            label="八门"
            value={`${palace.gate}门${gateFortune ? `（${gateFortune}）` : ''}`}
            className="gate-color"
          />
          {palace.isEmpty && (
            <div className="rounded-md bg-qimen-red/10 px-3 py-2 text-sm text-qimen-red">
              此宫空亡
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-qimen-text-secondary">
          天盘干 {palace.tianPanGan} + 地盘干 {palace.diPanGan} = 十干克应待实现
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-qimen-bg px-3 py-2">
      <span className="text-sm text-qimen-text-secondary">{label}</span>
      <span className={`text-sm font-medium ${className || ''}`}>{value}</span>
    </div>
  );
}
