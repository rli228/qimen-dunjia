'use client';

import { useState } from 'react';
import type { GatePalaceResult } from '@/lib/qimen/interpretation/interpreter';

interface Props {
  items: GatePalaceResult[];
}

const fortuneColor = {
  '吉': 'text-qimen-green',
  '凶': 'text-qimen-red',
  '平': 'text-qimen-text-secondary',
};

export function GatePalaceList({ items }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">八门落宫</h3>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="flex w-full items-center justify-between rounded-md bg-qimen-bg px-3 py-2 text-sm text-left hover:bg-qimen-border/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.gate}门</span>
                <span className="text-qimen-text-secondary">→</span>
                <span className="font-medium">{item.palaceName}</span>
                <span className="text-xs text-qimen-text-secondary">{item.relation}</span>
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
