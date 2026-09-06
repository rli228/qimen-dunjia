'use client';

import { useState, useRef, useCallback } from 'react';
import type { QimenChart } from '@/lib/qimen/types';
import { interpretChart, type InterpretationResult } from '@/lib/qimen/interpretation/index';
import { buildSystemPrompt, buildUserMessage, type EventType } from '@/lib/ai/buildPrompt';

export interface AiInterpretationState {
  status: 'idle' | 'streaming' | 'done' | 'error';
  text: string;
  error: string | null;
}

export function useAiInterpretation(chart: QimenChart | null, apiKey: string) {
  const [state, setState] = useState<AiInterpretationState>({
    status: 'idle',
    text: '',
    error: null,
  });
  const [beginnerMode, setBeginnerMode] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (options: { question?: string; eventType?: EventType } = {}) => {
    if (!chart || !apiKey) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'streaming', text: '', error: null });

    try {
      const interpretation = interpretChart(chart);
      const systemPrompt = buildSystemPrompt(beginnerMode);
      const userMessage = buildUserMessage(chart, interpretation, options);

      const response = await fetch('/api/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ systemPrompt, userMessage, beginnerMode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json();
        setState({ status: 'error', text: '', error: err.error || '请求失败' });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setState({ status: 'error', text: '', error: '无法读取响应流' });
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events (handle both \n\n and \r\n\r\n delimiters)
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || ''; // Keep incomplete event in buffer

        for (const event of events) {
          for (const line of event.split(/\r?\n/)) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                accumulated += parsed.delta.text;
                setState(prev => ({ ...prev, text: accumulated }));
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }

      setState({ status: 'done', text: accumulated, error: null });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState({
        status: 'error',
        text: '',
        error: err instanceof Error ? err.message : '未知错误',
      });
    }
  }, [chart, apiKey, beginnerMode]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, status: 'done' }));
  }, []);

  return { state, beginnerMode, setBeginnerMode, start, stop };
}
