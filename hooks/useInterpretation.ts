'use client';

import { useState, useRef, useCallback } from 'react';
import type { QimenChart } from '@/lib/qimen/types';
import { interpretChart } from '@/lib/qimen/interpretation/index';
import {
  buildSystemPrompt, buildUserMessage,
  buildCompactSystemPrompt, buildCompactUserMessage,
  type EventType,
} from '@/lib/ai/buildPrompt';

export type AiProvider = 'gemini' | 'anthropic';

export interface AiInterpretationState {
  status: 'idle' | 'streaming' | 'done' | 'error';
  text: string;
  error: string | null;
}

export function useAiInterpretation(chart: QimenChart | null, token: string, provider: AiProvider) {
  const [state, setState] = useState<AiInterpretationState>({
    status: 'idle',
    text: '',
    error: null,
  });
  const [beginnerMode, setBeginnerMode] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (options: { question?: string; eventType?: EventType } = {}) => {
    if (!chart || !token) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: 'streaming', text: '', error: null });

    try {
      const interpretation = interpretChart(chart);
      const systemPrompt = buildSystemPrompt(beginnerMode);
      const userMessage = buildUserMessage(chart, interpretation, options);

      const endpoint = provider === 'anthropic' ? '/api/interpret' : '/api/interpret-hf';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (provider === 'anthropic') {
        headers['x-api-key'] = token;
      } else {
        headers['x-gemini-key'] = token;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ systemPrompt, userMessage, beginnerMode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = '请求失败';
        try {
          const err = await response.json();
          errorMsg = err.error || errorMsg;
        } catch {
          errorMsg = `请求失败 (${response.status})`;
        }
        setState({ status: 'error', text: '', error: errorMsg });
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

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';

        for (const event of events) {
          for (const line of event.split(/\r?\n/)) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              let text = '';
              if (provider === 'anthropic') {
                // Anthropic format: content_block_delta
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  text = parsed.delta.text;
                }
              } else {
                // Gemini format: candidates[0].content.parts[0].text
                const part = parsed.candidates?.[0]?.content?.parts?.[0];
                if (part?.text) {
                  text = part.text;
                }
              }
              if (text) {
                accumulated += text;
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
  }, [chart, token, provider, beginnerMode]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, status: 'done' }));
  }, []);

  return { state, beginnerMode, setBeginnerMode, start, stop };
}
