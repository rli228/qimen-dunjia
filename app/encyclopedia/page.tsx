'use client';

import { useState } from 'react';
import { PatternReference } from '@/components/Encyclopedia/PatternReference';
import { GanInteractionReference } from '@/components/Encyclopedia/GanInteractionReference';
import { GateInteractionReference } from '@/components/Encyclopedia/GateInteractionReference';

const TABS = [
  { key: 'gan', label: '十干克应' },
  { key: 'patterns', label: '格局速查' },
  { key: 'gates', label: '八门克应' },
  { key: 'stars', label: '九星克应', disabled: true },
  { key: 'deities', label: '八神克应', disabled: true },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function EncyclopediaPage() {
  const [tab, setTab] = useState<TabKey>('gan');

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-qimen-gold">奇门百科</h1>
        <p className="mt-1 text-sm text-qimen-text-secondary">
          克应 · 格局 · 速查手册
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="mx-auto mb-6 flex max-w-2xl flex-wrap justify-center gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => !('disabled' in t && t.disabled) && setTab(t.key)}
            disabled={'disabled' in t && t.disabled}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-qimen-gold text-white'
                : 'disabled' in t && t.disabled
                  ? 'cursor-not-allowed text-qimen-text-secondary/40'
                  : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            {t.label}
            {'disabled' in t && t.disabled && (
              <span className="ml-1 text-[10px]">待开发</span>
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-2xl">
        {tab === 'gan' && <GanInteractionReference />}
        {tab === 'patterns' && <PatternReference />}
        {tab === 'gates' && <GateInteractionReference />}
      </div>
    </div>
  );
}
