'use client';

import { useState } from 'react';
import { PatternReference } from '@/components/Encyclopedia/PatternReference';
import { GanInteractionReference } from '@/components/Encyclopedia/GanInteractionReference';
import { GateInteractionReference } from '@/components/Encyclopedia/GateInteractionReference';

type Tab = '十干克应' | '格局速查' | '八门克应' | '九星克应' | '八神克应';

const TABS: { name: Tab; enabled: boolean }[] = [
  { name: '十干克应', enabled: true },
  { name: '格局速查', enabled: true },
  { name: '八门克应', enabled: true },
  { name: '九星克应', enabled: false },
  { name: '八神克应', enabled: false },
];

export default function EncyclopediaPage() {
  const [tab, setTab] = useState<Tab>('十干克应');

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-qimen-gold">奇门百科</h1>
        <p className="mt-1 text-sm text-qimen-text-secondary">
          十干克应 · 格局速查 · 八门克应
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {TABS.map(t => (
          <button
            key={t.name}
            onClick={() => t.enabled && setTab(t.name)}
            disabled={!t.enabled}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.name
                ? 'bg-qimen-gold text-white'
                : t.enabled
                  ? 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
                  : 'cursor-not-allowed bg-qimen-bg/50 text-qimen-text-secondary/40'
            }`}
          >
            {t.name}
            {!t.enabled && <span className="ml-1 text-[10px]">待开发</span>}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl">
        {tab === '十干克应' && <GanInteractionReference />}
        {tab === '格局速查' && <PatternReference />}
        {tab === '八门克应' && <GateInteractionReference />}
      </div>
    </div>
  );
}
