'use client';

import { useState, useRef, useCallback } from 'react';
import { getAllCases } from '@/lib/qimen/research/caseStudy';
import { saveEvent } from '@/lib/qimen/research/eventStore';
import type { ChartInput } from '@/lib/qimen/types';
import type { EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import type { PipelineEvent, PipelineResult, ClassificationResult, PipelineStage } from '@/lib/agents/types';
import type { QimenChart } from '@/lib/qimen/types';

export interface TraceEntry {
  kind: 'stage' | 'tool' | 'revise' | 'degrade';
  label: string;
  detail?: string;
  ok?: boolean;
  ms?: number;
  done?: boolean;
}

export interface AgentPipelineState {
  status: 'idle' | 'running' | 'done' | 'error';
  stage: PipelineStage | null;
  trace: TraceEntry[];
  chart: QimenChart | null;
  classification: ClassificationResult | null;
  result: PipelineResult | null;
  error: string | null;
  /** 本次解盘是否已留档。留档是拿到真实准确率的前提 */
  recorded: boolean;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  classify: '① 分类 agent 判断问题类型',
  cast: '② 排盘（确定性算法）',
  analyze: '③ 分析 agent 调取工具与案例',
  evaluate: '④ 评估 agent 审核结论',
};

const INITIAL: AgentPipelineState = {
  status: 'idle', stage: null, trace: [], chart: null,
  classification: null, result: null, error: null, recorded: false,
};

/**
 * 消费 /api/agent 的 SSE 事件流。
 *
 * 注意案例库是从 localStorage 读的：服务端拿不到用户本地积累的案例，
 * 所以随请求一起上传，让分析 agent 的 search_cases 能检索到。
 */
export function useAgentPipeline(apiKey: string) {
  const [state, setState] = useState<AgentPipelineState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (options: {
    question: string;
    chartInput?: ChartInput;
    forcedEventType?: EventTypeKey;
    maxRevisions?: number;
  }) => {
    if (!apiKey || !options.question.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL, status: 'running' });

    const push = (entry: TraceEntry) =>
      setState(prev => ({ ...prev, trace: [...prev.trace, entry] }));

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          question: options.question,
          chartInput: options.chartInput,
          forcedEventType: options.forcedEventType,
          maxRevisions: options.maxRevisions ?? 1,
          userCases: getAllCases(),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = `请求失败 (${response.status})`;
        try {
          message = (await response.json()).error ?? message;
        } catch { /* 响应不是 JSON，保留默认消息 */ }
        setState(prev => ({ ...prev, status: 'error', error: message }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          for (const line of chunk.split(/\r?\n/)) {
            if (!line.startsWith('data: ')) continue;
            let event: PipelineEvent;
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            switch (event.type) {
              case 'stage':
                if (event.status === 'start') {
                  setState(prev => ({ ...prev, stage: event.stage }));
                  push({
                    kind: 'stage',
                    label: STAGE_LABELS[event.stage] + (event.round && event.round > 1 ? `（第 ${event.round} 轮）` : ''),
                  });
                }
                break;
              case 'chart':
                setState(prev => ({ ...prev, chart: event.chart }));
                break;
              case 'classification':
                setState(prev => ({ ...prev, classification: event.data }));
                break;
              case 'tool_call':
                push({ kind: 'tool', label: event.name, detail: JSON.stringify(event.input) });
                break;
              case 'tool_result':
                setState(prev => {
                  const trace = [...prev.trace];
                  for (let i = trace.length - 1; i >= 0; i--) {
                    if (trace[i].kind === 'tool' && trace[i].label === event.name && !trace[i].done) {
                      trace[i] = { ...trace[i], ok: event.ok, ms: event.ms, done: true, detail: event.summary };
                      break;
                    }
                  }
                  return { ...prev, trace };
                });
                break;
              case 'revise':
                push({ kind: 'revise', label: '评估未通过，退回重做', detail: event.reason });
                break;
              case 'degrade':
                push({ kind: 'degrade', label: '评估不通过，降级为规则引擎结论', detail: event.reason });
                break;
              case 'record': {
                // 服务端构建、此处落盘 —— eventStore 用 localStorage，服务端写不了。
                // 保存失败（隐私模式、存储被禁）不应影响解盘结果的展示。
                let ok = false;
                try {
                  ok = saveEvent(event.data);
                } catch {
                  ok = false;
                }
                setState(prev => ({ ...prev, recorded: ok }));
                break;
              }
              case 'final':
                setState(prev => ({ ...prev, status: 'done', stage: null, result: event.data }));
                break;
              case 'error':
                setState(prev => ({ ...prev, status: 'error', error: event.message }));
                break;
            }
          }
        }
      }

      setState(prev => prev.status === 'running' ? { ...prev, status: 'done', stage: null } : prev);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : '未知错误',
      }));
    }
  }, [apiKey]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, status: 'idle', stage: null }));
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, start, stop, reset };
}
