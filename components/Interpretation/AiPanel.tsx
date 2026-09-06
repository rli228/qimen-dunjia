'use client';

import { useEffect, useRef, useState } from 'react';
import type { QimenChart } from '@/lib/qimen/types';
import { useApiKey } from '@/hooks/useApiKey';
import { useAiInterpretation } from '@/hooks/useInterpretation';
import { ApiKeyInput } from './ApiKeyInput';
import { EventTypeSelector } from './EventTypeSelector';
import type { EventType } from '@/lib/ai/buildPrompt';

interface Props {
  chart: QimenChart;
  question?: string;
}

export function AiPanel({ chart, question }: Props) {
  const { apiKey, setApiKey, isValid } = useApiKey();
  const { state, beginnerMode, setBeginnerMode, start, stop } = useAiInterpretation(chart, apiKey);
  const [eventType, setEventType] = useState<EventType>('综合');
  const autoTriggered = useRef(false);

  // 问事模式：有问题 + 有 API Key 时自动触发
  useEffect(() => {
    if (question && isValid && !autoTriggered.current && state.status === 'idle') {
      autoTriggered.current = true;
      start({ question });
    }
  }, [question, isValid, state.status, start]);

  // chart 变化时重置自动触发标记
  useEffect(() => {
    autoTriggered.current = false;
  }, [chart]);

  const handleManualStart = () => {
    if (question) {
      start({ question });
    } else {
      start({ eventType });
    }
  };

  return (
    <div className="rounded-xl border border-qimen-border bg-qimen-surface p-6 space-y-4">
      <h2 className="text-lg font-bold text-qimen-gold">AI 辅助解盘</h2>

      {/* 用户问题展示 */}
      {question && (
        <div className="rounded-lg bg-qimen-gold/5 border border-qimen-gold/20 px-4 py-3">
          <p className="text-xs text-qimen-text-secondary mb-1">您的问题</p>
          <p className="text-sm">{question}</p>
        </div>
      )}

      {/* API Key */}
      <div>
        <label className="mb-1.5 block text-xs text-qimen-text-secondary">Claude API Key</label>
        <ApiKeyInput apiKey={apiKey} isValid={isValid} onChange={setApiKey} />
      </div>

      {/* 手动模式下显示事项选择 */}
      {!question && (
        <div>
          <label className="mb-1.5 block text-xs text-qimen-text-secondary">求测事项</label>
          <EventTypeSelector value={eventType} onChange={setEventType} />
        </div>
      )}

      {/* 初学者模式 */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={beginnerMode}
          onChange={e => setBeginnerMode(e.target.checked)}
          className="rounded"
        />
        <span>初学者模式（详细解释推理过程）</span>
      </label>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleManualStart}
          disabled={!isValid || state.status === 'streaming'}
          className="flex-1 rounded-lg bg-qimen-gold px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state.status === 'streaming' ? '解盘中...' : '开始 AI 解盘'}
        </button>
        {state.status === 'streaming' && (
          <button
            onClick={stop}
            className="rounded-lg border border-qimen-border px-4 py-2.5 text-sm transition-colors hover:bg-qimen-border"
          >
            停止
          </button>
        )}
      </div>

      {/* 错误 */}
      {state.error && (
        <div className="rounded-lg border border-qimen-red/30 bg-qimen-red/10 px-4 py-3 text-sm text-qimen-red">
          {state.error}
        </div>
      )}

      {/* AI 输出 */}
      {state.text && (
        <div className="rounded-lg bg-qimen-bg p-4">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-qimen-text">
            {state.text}
            {state.status === 'streaming' && (
              <span className="inline-block w-1.5 h-4 bg-qimen-gold animate-pulse ml-0.5" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
