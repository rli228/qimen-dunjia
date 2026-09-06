'use client';

import type { GanInteraction } from '@/lib/qimen/types';

interface Props {
  interactions: GanInteraction[];
}

const fortuneColor = {
  '吉': 'text-qimen-green',
  '凶': 'text-qimen-red',
  '平': 'text-qimen-text-secondary',
};

export function GanInteractionTable({ interactions }: Props) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">十干克应</h3>
      <div className="space-y-1.5">
        {interactions.map((gi, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md bg-qimen-bg px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="tian-gan-color font-medium">{gi.tianGan}</span>
              <span className="text-qimen-text-secondary">+</span>
              <span className="di-gan-color font-medium">{gi.diGan}</span>
              <span className="text-qimen-text-secondary">= {gi.name}</span>
            </div>
            <span className={`text-xs font-medium ${fortuneColor[gi.fortune]}`}>
              {gi.fortune}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
