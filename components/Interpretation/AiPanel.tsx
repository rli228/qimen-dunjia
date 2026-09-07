'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { QimenChart } from '@/lib/qimen/types';
import { useApiKey } from '@/hooks/useApiKey';
import { useAiInterpretation, type AiProvider } from '@/hooks/useInterpretation';
import { EventTypeSelector } from './EventTypeSelector';
import type { EventType } from '@/lib/ai/buildPrompt';

interface Props {
  chart: QimenChart;
  question?: string;
  bare?: boolean;
}

const PROVIDERS: { value: AiProvider; label: string; hint: string; placeholder: string }[] = [
  { value: 'gemini', label: 'Gemini (免费)', hint: '需要 Google AI API Key', placeholder: 'AIza...' },
  { value: 'anthropic', label: 'Claude (付费)', hint: '需要 Anthropic API Key', placeholder: 'sk-ant-...' },
];

export function AiPanel({ chart, question, bare }: Props) {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const { token, setToken, isValid } = useApiKey(provider);
  const { state, beginnerMode, setBeginnerMode, start, stop } = useAiInterpretation(chart, token, provider);
  const [eventType, setEventType] = useState<EventType>('综合');
  const autoTriggered = useRef(false);

  // 问事模式：有问题 + 有 token 时自动触发
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

  const currentProvider = PROVIDERS.find(p => p.value === provider)!;

  return (
    <div className={bare ? 'space-y-4' : 'rounded-xl border border-qimen-border bg-qimen-surface p-6 space-y-4'}>
      {!bare && <h2 className="text-lg font-bold text-qimen-gold">AI 辅助解盘</h2>}

      {/* 用户问题展示 */}
      {question && (
        <div className="rounded-lg bg-qimen-gold/5 border border-qimen-gold/20 px-4 py-3">
          <p className="text-xs text-qimen-text-secondary mb-1">您的问题</p>
          <p className="text-sm">{question}</p>
        </div>
      )}

      {/* 模型选择 */}
      <div>
        <label className="mb-1.5 block text-xs text-qimen-text-secondary">AI 模型</label>
        <div className="flex gap-2">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              onClick={() => setProvider(p.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                provider === p.value
                  ? 'bg-qimen-gold text-white'
                  : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Token 输入 */}
      <div>
        <label className="mb-1.5 block text-xs text-qimen-text-secondary">
          {currentProvider.hint}
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={currentProvider.placeholder}
            className="flex-1 rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-sm font-mono"
          />
          {isValid && (
            <span className="self-center text-xs text-qimen-green">✓</span>
          )}
        </div>
        {provider === 'gemini' && (
          <p className="mt-1 text-[10px] text-qimen-text-secondary/60">
            免费获取：<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com/apikey</a>
          </p>
        )}
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
          <div className="prose prose-sm max-w-none text-sm text-qimen-text prose-headings:text-qimen-gold prose-strong:text-qimen-text prose-li:my-0.5">
            <ReactMarkdown>{state.text}</ReactMarkdown>
            {state.status === 'streaming' && (
              <span className="inline-block w-1.5 h-4 bg-qimen-gold animate-pulse ml-0.5" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
