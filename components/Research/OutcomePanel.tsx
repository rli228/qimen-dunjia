'use client';

import { useEffect, useState } from 'react';
import { getAllEvents, recordOutcome } from '@/lib/qimen/research/eventStore';
import { scoreTiming } from '@/lib/qimen/research/timingScore';
import { OUTCOME_DEFINITIONS } from '@/lib/qimen/research/schema';
import type { EventRecord, OutcomeRecord } from '@/lib/qimen/research/schema';
import { EVENT_TEMPLATES } from '@/lib/qimen/interpretation/data/yongShen';
import { BackupPanel } from './BackupPanel';

/**
 * 结果回访
 *
 * 没有这个入口，解盘记录只会堆积而永远得不到标注 —— 那和不记录一样没用。
 * 回访时的「实际发生日期」是唯一能算出客观命中率的字段。
 */
export function OutcomePanel() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{
    outcome: 'true' | 'false' | 'null';
    confidence: 1 | 2 | 3;
    actualResult: string;
    actualDate: string;
  }>({ outcome: 'true', confidence: 2, actualResult: '', actualDate: '' });

  const reload = () => setEvents(getAllEvents());
  useEffect(reload, []);

  const pending = events.filter(e => e.outcome === null);
  const labeled = events.filter(e => e.outcome !== null);
  const score = scoreTiming(events);

  const submit = (id: string) => {
    const rec: OutcomeRecord = {
      recordedAt: new Date().toISOString(),
      outcome: form.outcome === 'null' ? null : form.outcome === 'true',
      confidence: form.confidence,
      actualResult: form.actualResult,
      ...(form.actualDate ? { actualDate: form.actualDate } : {}),
    };
    if (recordOutcome(id, rec)) {
      setEditing(null);
      setForm({ outcome: 'true', confidence: 2, actualResult: '', actualDate: '' });
      reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* 概览 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['已登记', events.length],
          ['待回访', pending.length],
          ['已标注', labeled.length],
          ['可评分', score.scorable],
        ].map(([label, n]) => (
          <div key={label as string} className="rounded-lg border border-qimen-border bg-qimen-bg p-3 text-center">
            <p className="text-xs text-qimen-text-secondary">{label}</p>
            <p className="text-xl font-bold text-qimen-gold">{n}</p>
          </div>
        ))}
      </div>

      {/* 应期命中率 */}
      <div className="rounded-lg border border-qimen-border bg-qimen-surface p-4">
        <h3 className="text-sm font-bold text-qimen-gold">应期命中率</h3>
        <p className="mt-1 text-xs text-qimen-text-secondary">
          唯一不需要主观评分标准的指标：预测的日子对不对是客观的
        </p>
        {score.byMethod.length > 0 ? (
          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="text-left text-qimen-text-secondary">
                <th className="pb-1">方法</th><th className="pb-1 text-right">命中</th>
                <th className="pb-1 text-right">评估</th><th className="pb-1 text-right">命中率</th>
              </tr>
            </thead>
            <tbody>
              {score.byMethod.map(m => (
                <tr key={m.method} className="border-t border-qimen-border">
                  <td className="py-1">{m.method}</td>
                  <td className="py-1 text-right">{m.hits}</td>
                  <td className="py-1 text-right">{m.evaluated}</td>
                  <td className="py-1 text-right font-medium">
                    {m.hitRate === null ? '—' : `${(m.hitRate * 100).toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-xs text-qimen-text-secondary">暂无数据</p>
        )}
        {score.caveat && (
          <p className="mt-3 rounded bg-qimen-red/10 px-3 py-2 text-xs text-qimen-red">⚠ {score.caveat}</p>
        )}
        {score.missingDate > 0 && (
          <p className="mt-2 text-xs text-qimen-text-secondary">
            另有 {score.missingDate} 条已回访但未填实际日期，无法用于应期评估
          </p>
        )}
      </div>

      {/* 备份 */}
      <BackupPanel onRestored={reload} />

      {/* 待回访 */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-qimen-gold">待回访（{pending.length}）</h3>
        {pending.length === 0 && (
          <p className="text-xs text-qimen-text-secondary">
            没有待回访记录。用「Agent 流水线」解盘会自动登记。
          </p>
        )}
        <ul className="space-y-3">
          {pending.map(e => {
            const def = OUTCOME_DEFINITIONS[e.eventType];
            return (
              <li key={e.id} className="rounded-lg border border-qimen-border bg-qimen-bg p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm">{e.questionText}</p>
                  <span className="shrink-0 text-xs text-qimen-text-secondary">
                    {new Date(e.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-qimen-text-secondary">
                  {EVENT_TEMPLATES[e.eventType].icon} {e.eventType}
                  {' · '}规则引擎 {e.systemPrediction.tier}
                  {e.systemPrediction.agent && ` · AI ${e.systemPrediction.agent.tier}`}
                  {e.systemPrediction.agent?.degraded && ' (降级)'}
                </p>
                {e.systemPrediction.timing && (
                  <p className="mt-1 text-xs text-qimen-text-secondary/70">
                    应期候选：{e.systemPrediction.timing.candidates.slice(0, 5).map(c => c.value).join('、')}
                    {e.systemPrediction.timing.candidates.length > 5 && ' …'}
                  </p>
                )}

                {editing === e.id ? (
                  <div className="mt-3 space-y-2 border-t border-qimen-border pt-3">
                    <p className="text-xs text-qimen-text-secondary">
                      预注册判定标准：正例＝{def.positiveLabel}；负例＝{def.negativeLabel}；
                      窗口＝{def.timeHorizon}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {([['true', '正例'], ['false', '负例'], ['null', '模糊/无法判定']] as const).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setForm(f => ({ ...f, outcome: v }))}
                          className={`rounded px-3 py-1 text-xs ${
                            form.outcome === v ? 'bg-qimen-gold text-white' : 'bg-qimen-surface text-qimen-text-secondary'
                          }`}
                        >{l}</button>
                      ))}
                    </div>
                    <label className="block text-xs text-qimen-text-secondary">
                      对标签的确信度
                      <select
                        value={form.confidence}
                        onChange={ev => setForm(f => ({ ...f, confidence: Number(ev.target.value) as 1 | 2 | 3 }))}
                        className="ml-2 rounded border border-qimen-border bg-qimen-bg px-2 py-1"
                      >
                        <option value={1}>1 不确定</option>
                        <option value={2}>2 较确定</option>
                        <option value={3}>3 非常确定</option>
                      </select>
                    </label>
                    <label className="block text-xs text-qimen-text-secondary">
                      实际发生日期（应期评估靠它，不填则无法计入命中率）
                      <input
                        type="date"
                        value={form.actualDate}
                        onChange={ev => setForm(f => ({ ...f, actualDate: ev.target.value }))}
                        className="ml-2 rounded border border-qimen-border bg-qimen-bg px-2 py-1"
                      />
                    </label>
                    <textarea
                      value={form.actualResult}
                      onChange={ev => setForm(f => ({ ...f, actualResult: ev.target.value }))}
                      placeholder="实际结果描述"
                      rows={2}
                      className="w-full resize-none rounded border border-qimen-border bg-qimen-bg px-2 py-1 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submit(e.id)}
                        className="rounded bg-qimen-gold px-3 py-1 text-xs text-white"
                      >保存</button>
                      <button
                        onClick={() => setEditing(null)}
                        className="rounded border border-qimen-border px-3 py-1 text-xs"
                      >取消</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(e.id)}
                    className="mt-2 rounded border border-qimen-border px-3 py-1 text-xs hover:bg-qimen-border"
                  >回访</button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
