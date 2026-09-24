'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useApiKey } from '@/hooks/useApiKey';
import { useAgentPipeline } from '@/hooks/useAgentPipeline';
import { NinePalaceGrid } from '@/components/QimenBoard/NinePalaceGrid';
import { EVENT_TEMPLATES } from '@/lib/qimen/interpretation/data/yongShen';
import type { EvaluationScores } from '@/lib/agents/types';
import type { ProviderId } from '@/lib/agents/llm';

const TIER_COLOR: Record<string, string> = {
  '大吉': 'text-qimen-red', '小吉': 'text-qimen-gold', '平': 'text-qimen-text-secondary',
  '小凶': 'text-qimen-blue', '大凶': 'text-qimen-purple',
};

const SCORE_LABELS: Record<keyof EvaluationScores, string> = {
  grounding: '接地性', ruleConsistency: '规则一致', relevance: '相关性', calibration: '校准度',
};

const TOOL_LABELS: Record<string, string> = {
  analyze_yongshen: '用神分析引擎',
  analyze_timing: '应期推算',
  detect_patterns: '格局与克应扫描',
  inspect_palace: '细查宫位',
  analyze_marriage: '婚姻专项分析',
  search_cases: '检索案例库',
  search_classics: '检索古籍',
};

export function AgentPanel({ bare }: { bare?: boolean }) {
  const [provider, setProvider] = useState<ProviderId>('anthropic');
  const { token, setToken, isValid } = useApiKey('anthropic');
  const { state, start, stop, reset } = useAgentPipeline(token, provider);
  const [question, setQuestion] = useState('');
  const [maxRevisions, setMaxRevisions] = useState(1);

  const running = state.status === 'running';
  const r = state.result;
  const ready = provider === 'local' || isValid;

  return (
    <div className={bare ? 'space-y-4' : 'rounded-xl border border-qimen-border bg-qimen-surface p-6 space-y-4'}>
      {!bare && (
        <div>
          <h2 className="text-lg font-bold text-qimen-gold">Agent 流水线解盘</h2>
          <p className="mt-1 text-xs text-qimen-text-secondary">
            分类 agent → 排盘 → 分析 agent（调工具/查案例）→ 评估 agent 审核
          </p>
        </div>
      )}

      {/* 模型来源 */}
      <div>
        <label className="mb-1.5 block text-xs text-qimen-text-secondary">模型</label>
        <div className="flex gap-2">
          {([
            ['anthropic', 'Claude', '需 API Key，质量高'],
            ['local', '本地模型', '免费，需先跑 ollama serve'],
          ] as const).map(([value, label, hint]) => (
            <button
              key={value}
              onClick={() => setProvider(value)}
              title={hint}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                provider === value
                  ? 'bg-qimen-gold text-white'
                  : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-qimen-text-secondary/60">
          {provider === 'anthropic'
            ? 'agent 流水线依赖 tool use，暂不支持 Gemini'
            : '走本机 Ollama。模型与地址由服务端环境变量 OLLAMA_MODEL / OLLAMA_BASE_URL 决定；小模型解盘质量有限，主要用于验证流程'}
        </p>
      </div>

      {/* API Key —— 仅 Claude 需要 */}
      {provider === 'anthropic' && (
        <div>
          <label className="mb-1.5 block text-xs text-qimen-text-secondary">
            Anthropic API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-sm font-mono"
            />
            {isValid && <span className="self-center text-xs text-qimen-green">✓</span>}
          </div>
        </div>
      )}

      {/* 问题输入 */}
      <div>
        <label className="mb-1.5 block text-xs text-qimen-text-secondary">你想问什么</label>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="例：下周二面试那家公司，能拿到 offer 吗？"
          rows={2}
          className="w-full resize-none rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-qimen-text-secondary">
          最大修订轮数
          <select
            value={maxRevisions}
            onChange={e => setMaxRevisions(Number(e.target.value))}
            className="rounded border border-qimen-border bg-qimen-bg px-2 py-1 text-xs"
          >
            <option value={0}>0（不修订，最快）</option>
            <option value={1}>1（推荐）</option>
            <option value={2}>2（最严格）</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => start({ question, maxRevisions })}
          disabled={!ready || !question.trim() || running}
          className="flex-1 rounded-lg bg-qimen-gold px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {running ? '流水线运行中…' : '启动 Agent 流水线'}
        </button>
        {running && (
          <button onClick={stop} className="rounded-lg border border-qimen-border px-4 py-2.5 text-sm hover:bg-qimen-border">
            停止
          </button>
        )}
        {state.status === 'done' && (
          <button onClick={reset} className="rounded-lg border border-qimen-border px-4 py-2.5 text-sm hover:bg-qimen-border">
            清空
          </button>
        )}
      </div>

      {state.error && (
        <div className="rounded-lg border border-qimen-red/30 bg-qimen-red/10 px-4 py-3 text-sm text-qimen-red">
          {state.error}
        </div>
      )}

      {/* 执行轨迹 */}
      {state.trace.length > 0 && (
        <div className="rounded-lg border border-qimen-border bg-qimen-bg p-3">
          <p className="mb-2 text-xs font-medium text-qimen-text-secondary">执行轨迹</p>
          <ol className="space-y-1.5">
            {state.trace.map((t, i) => (
              <li key={i} className="text-xs">
                {t.kind === 'stage' && (
                  <span className="font-medium text-qimen-gold">{t.label}</span>
                )}
                {t.kind === 'tool' && (
                  <span className="ml-4 flex items-start gap-1.5">
                    <span className={t.done ? (t.ok ? 'text-qimen-green' : 'text-qimen-red') : 'animate-pulse text-qimen-text-secondary'}>
                      {t.done ? (t.ok ? '✓' : '✗') : '●'}
                    </span>
                    <span className="flex-1">
                      <span className="text-qimen-text">{TOOL_LABELS[t.label] ?? t.label}</span>
                      {t.ms !== undefined && <span className="ml-1 text-qimen-text-secondary/60">{t.ms}ms</span>}
                      {t.detail && (
                        <span className="block truncate text-qimen-text-secondary/70">{t.detail}</span>
                      )}
                    </span>
                  </span>
                )}
                {t.kind === 'revise' && (
                  <span className="ml-4 text-qimen-blue">↻ {t.label}：{t.detail}</span>
                )}
                {t.kind === 'degrade' && (
                  <span className="ml-4 text-qimen-red">⚠ {t.label}：{t.detail}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Agent 1 结果 */}
      {state.classification && (
        <div className="rounded-lg border border-qimen-border bg-qimen-bg p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-qimen-text-secondary">① 分类 agent</p>
          <p>
            <span className="text-qimen-gold font-medium">
              {EVENT_TEMPLATES[state.classification.eventType].icon} {state.classification.eventType}
            </span>
            <span className="ml-2 text-xs text-qimen-text-secondary">
              置信度 {(state.classification.confidence * 100).toFixed(0)}%
              {state.classification.alternative && ` · 次选 ${state.classification.alternative}`}
            </span>
          </p>
          <p className="mt-1 text-xs text-qimen-text-secondary">{state.classification.reasoning}</p>
          {state.classification.needsClarification && state.classification.clarifyingQuestion && (
            <p className="mt-2 rounded bg-qimen-blue/10 px-2 py-1 text-xs text-qimen-blue">
              建议补充：{state.classification.clarifyingQuestion}
            </p>
          )}
        </div>
      )}

      {/* 盘面 */}
      {state.chart && (
        <div className="mx-auto max-w-md">
          <NinePalaceGrid chart={state.chart} />
        </div>
      )}

      {/* Agent 2 结果 */}
      {r && (
        <div className="space-y-3">
          {r.degraded && (
            <div className="rounded-lg border border-qimen-red/40 bg-qimen-red/10 p-3">
              <p className="text-sm font-medium text-qimen-red">⚠ 这不是 AI 的分析结果</p>
              <p className="mt-1 text-xs text-qimen-text-secondary">
                分析 agent 的结论未通过评估审核，已被丢弃。下面显示的是**规则引擎**直接计算的判定
                —— 完全确定性、可复现，但只做用神加权评分，不结合格局、案例与古籍。
              </p>
              <p className="mt-1.5 text-xs text-qimen-red/80">原因：{r.degraded.reason}</p>
            </div>
          )}
          <div className={`rounded-lg border p-4 ${r.degraded ? 'border-qimen-border bg-qimen-bg' : 'border-qimen-gold/30 bg-qimen-gold/5'}`}>
            <div className="flex items-baseline justify-between gap-3">
              <p className={`text-lg font-bold ${TIER_COLOR[r.analysis.tier] ?? ''}`}>
                {r.analysis.tier} · {r.analysis.headline}
              </p>
              <span className="shrink-0 text-xs text-qimen-text-secondary">把握 {r.analysis.confidence}</span>
            </div>
          </div>

          <div className="rounded-lg border border-qimen-border bg-qimen-bg p-3">
            <p className="mb-2 text-xs font-medium text-qimen-text-secondary">
              {r.degraded ? '规则引擎用神评分' : '证据链'}
            </p>
            <ul className="space-y-1">
              {r.analysis.evidence.map((e, i) => (
                <li key={i} className="text-xs">
                  <span className={e.effect === '利' ? 'text-qimen-green' : e.effect === '不利' ? 'text-qimen-red' : 'text-qimen-text-secondary'}>
                    [{e.effect}]
                  </span>{' '}
                  <span className="text-qimen-text">{e.element}</span>
                  <span className="text-qimen-text-secondary"> — {e.role}</span>
                  <span className="ml-1 rounded bg-qimen-surface px-1 text-[10px] text-qimen-text-secondary/70">{e.source}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg bg-qimen-bg p-4">
            <div className="prose prose-sm max-w-none text-sm text-qimen-text prose-headings:text-qimen-gold prose-strong:text-qimen-text prose-li:my-0.5">
              <ReactMarkdown>{r.analysis.reasoning}</ReactMarkdown>
            </div>
          </div>

          <div className="rounded-lg border border-qimen-green/30 bg-qimen-green/5 p-3 text-sm">
            <p className="mb-1 text-xs font-medium text-qimen-text-secondary">建议</p>
            {r.analysis.advice}
          </div>

          {/* Agent 3 结果 */}
          <div className="rounded-lg border border-qimen-border bg-qimen-bg p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-qimen-text-secondary">④ 评估 agent</p>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                r.evaluation.verdict === 'accept' ? 'bg-qimen-green/15 text-qimen-green'
                : r.evaluation.verdict === 'revise' ? 'bg-qimen-blue/15 text-qimen-blue'
                : 'bg-qimen-red/15 text-qimen-red'
              }`}>
                {r.evaluation.verdict === 'accept' ? '通过' : r.evaluation.verdict === 'revise' ? '有保留' : '不通过'}
                {r.revisions > 0 && ` · 修订 ${r.revisions} 次`}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2">
              {(Object.keys(SCORE_LABELS) as (keyof EvaluationScores)[]).map(k => (
                <div key={k} className="text-center">
                  <p className="text-[10px] text-qimen-text-secondary">{SCORE_LABELS[k]}</p>
                  <p className={`text-sm font-medium ${r.evaluation.scores[k] >= 4 ? 'text-qimen-green' : r.evaluation.scores[k] >= 3 ? 'text-qimen-gold' : 'text-qimen-red'}`}>
                    {r.evaluation.scores[k]}/5
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-qimen-text-secondary">{r.evaluation.note}</p>

            {r.evaluation.issues.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-qimen-border pt-2">
                {r.evaluation.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-qimen-text-secondary">
                    <span className={issue.severity === '严重' ? 'text-qimen-red' : issue.severity === '中等' ? 'text-qimen-gold' : ''}>
                      [{issue.severity}]
                    </span>{' '}
                    {issue.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
