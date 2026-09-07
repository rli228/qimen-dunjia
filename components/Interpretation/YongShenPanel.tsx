'use client';

import { useState, useMemo } from 'react';
import type { QimenChart } from '@/lib/qimen/types';
import { EVENT_TYPE_KEYS, type EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import { analyzeYongShen } from '@/lib/qimen/interpretation/yongShenAnalysis';

interface Props {
  chart: QimenChart;
  defaultEventType?: EventTypeKey;
}

const fortuneColor = {
  '吉': 'text-qimen-green',
  '凶': 'text-qimen-red',
  '平': 'text-qimen-text-secondary',
};

const fortuneBadge = {
  '吉': 'bg-qimen-green/10 text-qimen-green',
  '凶': 'bg-qimen-red/10 text-qimen-red',
  '平': 'bg-gray-500/10 text-qimen-text-secondary',
};

export function YongShenPanel({ chart, defaultEventType }: Props) {
  const [eventType, setEventType] = useState<EventTypeKey | null>(defaultEventType ?? null);

  const result = useMemo(() => {
    if (!eventType) return null;
    return analyzeYongShen(chart, eventType);
  }, [chart, eventType]);

  return (
    <div className="rounded-xl border border-qimen-border bg-qimen-surface p-6 space-y-5">
      <h2 className="text-lg font-bold text-qimen-gold">用神分析</h2>
      <p className="text-xs text-qimen-text-secondary">
        选择事类，系统自动定位用神并分析吉凶
      </p>

      {/* 事类选择 */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPE_KEYS.map(key => (
          <button
            key={key}
            onClick={() => setEventType(eventType === key ? null : key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              eventType === key
                ? 'bg-qimen-gold text-white'
                : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* 分析结果 */}
      {result && (
        <div className="space-y-4">
          {/* 用神定位 */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">用神定位</h3>
            <div className="space-y-2">
              {result.locations.map((loc, i) => (
                <div key={i} className="rounded-lg bg-qimen-bg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${fortuneBadge[loc.fortune]}`}>
                      {loc.fortune}
                    </span>
                    <span className="text-sm font-medium">{loc.role.label}</span>
                    <span className="text-xs text-qimen-text-secondary">
                      {loc.role.description}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-qimen-text-secondary">
                    {loc.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 用神关系 */}
          {result.relations.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">用神关系</h3>
              <div className="space-y-1.5">
                {result.relations.map((rel, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-qimen-bg px-4 py-2 text-sm">
                    <span className="font-medium">{rel.from}</span>
                    <span className="text-qimen-text-secondary">↔</span>
                    <span className="font-medium">{rel.to}</span>
                    <span className="text-xs text-qimen-text-secondary flex-1">{rel.relation}</span>
                    <span className={`text-xs font-medium ${fortuneColor[rel.fortune]}`}>
                      {rel.fortune}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 结论 */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">综合结论</h3>
            <div className="rounded-lg border border-qimen-gold/20 bg-qimen-gold/5 px-4 py-3">
              <p className="whitespace-pre-line text-sm leading-relaxed text-qimen-text-secondary">
                {result.conclusion}
              </p>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <p className="py-4 text-center text-sm text-qimen-text-secondary">
          请选择一个事类开始分析
        </p>
      )}
    </div>
  );
}
