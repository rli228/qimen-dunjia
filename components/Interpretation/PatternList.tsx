'use client';

import type { Pattern } from '@/lib/qimen/types';
import { PALACE_NAMES } from '@/lib/qimen/constants';

interface Props {
  patterns: Pattern[];
}

export function PatternList({ patterns }: Props) {
  const jiGe = patterns.filter(p => p.type === '吉格');
  const xiongGe = patterns.filter(p => p.type === '凶格');

  if (patterns.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold">格局判断</h3>
        <p className="text-sm text-qimen-text-secondary">未检测到特殊格局</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">格局判断</h3>

      {jiGe.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-qimen-green font-medium">吉格</p>
          <div className="flex flex-wrap gap-2">
            {jiGe.map((p, i) => (
              <PatternCard key={`ji-${i}`} pattern={p} />
            ))}
          </div>
        </div>
      )}

      {xiongGe.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-qimen-red font-medium">凶格</p>
          <div className="flex flex-wrap gap-2">
            {xiongGe.map((p, i) => (
              <PatternCard key={`xiong-${i}`} pattern={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern }: { pattern: Pattern }) {
  const colorClass = pattern.type === '吉格' ? 'border-qimen-green/30 bg-qimen-green/5' : 'border-qimen-red/30 bg-qimen-red/5';
  const textColor = pattern.type === '吉格' ? 'text-qimen-green' : 'text-qimen-red';
  const palaceLabel = pattern.palace
    ? `${PALACE_NAMES[pattern.palace - 1]}${pattern.palace}宫`
    : '全盘';

  return (
    <div className={`rounded-lg border px-3 py-2 ${colorClass}`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${textColor}`}>{pattern.name}</span>
        <span className="text-[10px] text-qimen-text-secondary">
          {palaceLabel}
        </span>
      </div>
      <p className="mt-1 text-xs text-qimen-text-secondary">{pattern.description}</p>
    </div>
  );
}
