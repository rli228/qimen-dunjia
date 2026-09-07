'use client';

import { useMemo } from 'react';
import type { QimenChart } from '@/lib/qimen/types';
import { interpretChart } from '@/lib/qimen/interpretation/index';
import { generateInterpretationText } from '@/lib/qimen/interpretation/textGenerator';

interface Props {
  chart: QimenChart;
  question?: string;
  bare?: boolean;
}

export function RuleInterpretation({ chart, question, bare }: Props) {
  const sections = useMemo(() => {
    const result = interpretChart(chart);
    return generateInterpretationText(chart, result);
  }, [chart]);

  return (
    <div className={bare ? 'space-y-5' : 'rounded-xl border border-qimen-border bg-qimen-surface p-6 space-y-5'}>
      {!bare && <h2 className="text-lg font-bold text-qimen-gold">规则解盘</h2>}

      {question && (
        <div className="rounded-lg bg-qimen-gold/5 border border-qimen-gold/20 px-4 py-3">
          <p className="text-xs text-qimen-text-secondary mb-1">您的问题</p>
          <p className="text-sm">{question}</p>
        </div>
      )}

      {sections.map((section, i) => (
        <div key={i}>
          <h3 className="mb-1.5 text-sm font-semibold text-qimen-text">
            {section.title}
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-qimen-text-secondary">
            {section.content}
          </p>
        </div>
      ))}

      <p className="text-[10px] text-qimen-text-secondary/60">
        以上为基于传统规则的自动解读，仅供参考。如需更深入的个性化分析，可使用 AI 辅助解盘。
      </p>
    </div>
  );
}
