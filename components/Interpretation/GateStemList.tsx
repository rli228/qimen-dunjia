'use client';

import { useState } from 'react';
import type { GateStemResult } from '@/lib/qimen/interpretation/interpreter';
import { PALACE_NAMES } from '@/lib/qimen/constants';

interface Props {
  items: GateStemResult[];
}

const fortuneColor = {
  '吉': 'text-qimen-green',
  '凶': 'text-qimen-red',
  '平': 'text-qimen-text-secondary',
};

export function GateStemList({ items }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">门加三奇六仪</h3>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="flex w-full items-center justify-between rounded-md bg-qimen-bg px-3 py-2 text-sm text-left hover:bg-qimen-border/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.gate}门+{item.stem}</span>
                <span className="text-xs text-qimen-text-secondary">
                  {PALACE_NAMES[item.palace - 1]}{item.palace}宫
                </span>
              </div>
              <span className={`text-xs font-medium ${fortuneColor[item.fortune]}`}>
                {item.fortune}
              </span>
            </button>
            {expanded === i && (
              <div className="mx-3 mt-1 mb-2 rounded-md bg-qimen-gold/5 border border-qimen-gold/20 px-3 py-2">
                <p className="text-xs leading-relaxed text-qimen-text-secondary">{item.meaning}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
