'use client';

import { useState, useMemo } from 'react';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import type { QimenChart } from '@/lib/qimen/types';
import { EVENT_TYPE_KEYS, type EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import { analyzeYongShen } from '@/lib/qimen/interpretation/yongShenAnalysis';
import { MarriagePanel } from './MarriagePanel';

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

const tierStyle = {
  '大吉': { bg: 'bg-qimen-green/10 border-qimen-green/30', text: 'text-qimen-green', badge: 'bg-qimen-green text-white' },
  '小吉': { bg: 'bg-qimen-green/5 border-qimen-green/20', text: 'text-qimen-green', badge: 'bg-qimen-green/80 text-white' },
  '平':   { bg: 'bg-gray-500/5 border-gray-500/20', text: 'text-qimen-text-secondary', badge: 'bg-gray-500 text-white' },
  '小凶': { bg: 'bg-qimen-red/5 border-qimen-red/20', text: 'text-qimen-red', badge: 'bg-qimen-red/80 text-white' },
  '大凶': { bg: 'bg-qimen-red/10 border-qimen-red/30', text: 'text-qimen-red', badge: 'bg-qimen-red text-white' },
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
      {eventType === '婚姻感情' && (
        <MarriagePanel chart={chart} />
      )}

      {result && eventType !== '婚姻感情' && (
        <div className="space-y-4">
          {/* 一眼结论 */}
          <div className={`rounded-lg border px-4 py-3 ${tierStyle[result.tier].bg}`}>
            <div className="flex items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${tierStyle[result.tier].badge}`}>
                {result.tier}
              </span>
              <span className={`text-base font-semibold ${tierStyle[result.tier].text}`}>
                {result.headline}
              </span>
              <span className={`ml-auto rounded px-2 py-0.5 text-[10px] font-medium ${
                result.coherence === '强' ? 'bg-qimen-green/10 text-qimen-green'
                : result.coherence === '弱' ? 'bg-qimen-red/10 text-qimen-red'
                : 'bg-gray-500/10 text-qimen-text-secondary'
              }`}>
                信号{result.coherence}
              </span>
            </div>
          </div>

          {/* 详细分析（折叠） */}
          <CollapsibleSection title="详细分析" titleClass="text-sm font-semibold text-qimen-text">
            <p className="whitespace-pre-line text-sm leading-relaxed text-qimen-text-secondary">
              {result.conclusion}
            </p>
          </CollapsibleSection>

          {/* 用神详情（可折叠） */}
          <CollapsibleSection title="用神详情" titleClass="text-sm font-semibold text-qimen-text">
            {/* 用神定位 */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-qimen-text-secondary">用神定位</h4>
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

            {/* 用神关系 */}
            {result.relations.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <h4 className="text-xs font-medium text-qimen-text-secondary">用神关系</h4>
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
            )}
          </CollapsibleSection>
        </div>
      )}

      {!result && eventType !== '婚姻感情' && (
        <p className="py-4 text-center text-sm text-qimen-text-secondary">
          请选择一个事类开始分析
        </p>
      )}
    </div>
  );
}
