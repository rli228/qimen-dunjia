'use client';

import { useMemo } from 'react';
import type { QimenChart } from '@/lib/qimen/types';
import { interpretChart } from '@/lib/qimen/interpretation/index';
import { GanInteractionTable } from './GanInteractionTable';
import { PatternList } from './PatternList';
import { GateVitalityRow } from './GateVitalityRow';

interface Props {
  chart: QimenChart;
}

export function InterpretationPanel({ chart }: Props) {
  const result = useMemo(() => interpretChart(chart), [chart]);

  return (
    <div className="rounded-xl border border-qimen-border bg-qimen-surface p-6 space-y-6">
      <h2 className="text-lg font-bold text-qimen-gold">解盘分析</h2>

      <PatternList patterns={result.patterns} />
      <GateVitalityRow vitality={result.gateVitality} />
      <GanInteractionTable interactions={result.ganInteractions} />
    </div>
  );
}
