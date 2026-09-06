'use client';

import { useState } from 'react';
import { ChartForm } from '@/components/InputForm/ChartForm';
import { NinePalaceGrid } from '@/components/QimenBoard/NinePalaceGrid';
import { generateChart } from '@/lib/qimen/algorithm';
import type { ChartInput } from '@/lib/qimen/types';
import type { QimenChart } from '@/lib/qimen/types';

export default function HomePage() {
  const [chart, setChart] = useState<QimenChart | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (input: ChartInput) => {
    try {
      setError(null);
      const result = generateChart(input);
      setChart(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '排盘失败');
      setChart(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-qimen-gold">奇门遁甲排盘</h1>
        <p className="mt-1 text-sm text-qimen-text-secondary">
          时家奇门 · 拆补法 · 转盘
        </p>
      </div>

      <div className="mx-auto max-w-lg">
        <ChartForm onSubmit={handleSubmit} />
      </div>

      {error && (
        <div className="mx-auto max-w-lg rounded-lg border border-qimen-red/30 bg-qimen-red/10 px-4 py-3 text-sm text-qimen-red">
          {error}
        </div>
      )}

      {chart && (
        <div className="mx-auto max-w-md">
          <NinePalaceGrid chart={chart} />
        </div>
      )}
    </div>
  );
}
