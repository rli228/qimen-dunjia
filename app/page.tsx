'use client';

import { useState } from 'react';
import { NinePalaceGrid } from '@/components/QimenBoard/NinePalaceGrid';
import { InterpretationPanel } from '@/components/Interpretation/InterpretationPanel';
import { RuleInterpretation } from '@/components/Interpretation/RuleInterpretation';
import { AiPanel } from '@/components/Interpretation/AiPanel';
import { QuestionInput } from '@/components/InputForm/QuestionInput';
import { ChartForm } from '@/components/InputForm/ChartForm';
import { generateChart } from '@/lib/qimen/algorithm';
import type { ChartInput, QimenChart } from '@/lib/qimen/types';

export default function HomePage() {
  const [chart, setChart] = useState<QimenChart | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'question' | 'manual'>('question');

  // 问事起盘：用当前时间自动排盘
  const handleQuestion = (q: string) => {
    try {
      setError(null);
      const now = new Date();
      const input: ChartInput = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
      };
      const result = generateChart(input);
      setChart(result);
      setQuestion(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : '排盘失败');
      setChart(null);
    }
  };

  // 手动排盘
  const handleManualSubmit = (input: ChartInput) => {
    try {
      setError(null);
      const result = generateChart(input);
      setChart(result);
      setQuestion('');
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

      {/* 模式切换 */}
      <div className="mx-auto flex max-w-lg justify-center gap-2">
        <button
          onClick={() => setMode('question')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === 'question'
              ? 'bg-qimen-gold text-white'
              : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
          }`}
        >
          问事起盘
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-qimen-gold text-white'
              : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
          }`}
        >
          手动排盘
        </button>
      </div>

      <div className="mx-auto max-w-lg">
        {mode === 'question' ? (
          <QuestionInput onSubmit={handleQuestion} />
        ) : (
          <ChartForm onSubmit={handleManualSubmit} />
        )}
      </div>

      {error && (
        <div className="mx-auto max-w-lg rounded-lg border border-qimen-red/30 bg-qimen-red/10 px-4 py-3 text-sm text-qimen-red">
          {error}
        </div>
      )}

      {chart && (
        <>
          <div className="mx-auto max-w-md">
            <NinePalaceGrid chart={chart} />
          </div>
          <div className="mx-auto max-w-2xl space-y-6">
            <RuleInterpretation chart={chart} question={question} />
            <InterpretationPanel chart={chart} />
            <AiPanel chart={chart} question={question} />
          </div>
        </>
      )}
    </div>
  );
}
