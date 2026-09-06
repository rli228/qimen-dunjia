'use client';

import type { GateVitalityResult } from '@/lib/qimen/interpretation/interpreter';

interface Props {
  vitality: GateVitalityResult[];
}

const vitalityColor: Record<string, string> = {
  '旺': 'bg-qimen-green/15 text-qimen-green',
  '相': 'bg-qimen-blue/15 text-qimen-blue',
  '休': 'bg-qimen-text-secondary/10 text-qimen-text-secondary',
  '囚': 'bg-qimen-red/10 text-qimen-red',
  '死': 'bg-qimen-red/20 text-qimen-red',
};

export function GateVitalityRow({ vitality }: Props) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">八门旺相休囚死</h3>
      <div className="flex flex-wrap gap-2">
        {vitality.map((v, i) => (
          <div
            key={i}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${vitalityColor[v.vitality] || ''}`}
          >
            <span className="gate-color">{v.gate}门</span>
            <span className="mx-1">·</span>
            <span>{v.vitality}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
