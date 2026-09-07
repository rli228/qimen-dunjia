'use client';

import { useState, useMemo } from 'react';
import {
  GATE_INFO,
  GATE_PALACE_DATA,
  GATE_STEM_DATA,
  GATE_GATE_DATA,
  type GatePalaceData,
  type GateStemData,
  type GateGateData,
} from '@/lib/qimen/interpretation/data/gateInteractions';
import { PALACE_NAMES, SAN_QI_LIU_YI, type GateName } from '@/lib/qimen/constants';

type SubView = '总览' | '门加宫' | '门加三奇六仪' | '门加门';
type FortuneFilter = '全部' | '吉' | '凶' | '平';

const GATES: Exclude<GateName, '中'>[] = ['开', '休', '生', '伤', '杜', '景', '死', '惊'];

const fortuneLabel = {
  '吉': 'bg-qimen-green/10 text-qimen-green',
  '凶': 'bg-qimen-red/10 text-qimen-red',
  '平': 'bg-gray-500/10 text-qimen-text-secondary',
};

const fortuneDot = {
  '吉': 'bg-qimen-green',
  '凶': 'bg-qimen-red',
  '平': 'bg-gray-400',
};

export function GateInteractionReference() {
  const [subView, setSubView] = useState<SubView>('总览');
  const [fortune, setFortune] = useState<FortuneFilter>('全部');
  const [gateFilter, setGateFilter] = useState<string>('全部');
  const [query, setQuery] = useState('');

  return (
    <div>
      {/* 子视图切换 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['总览', '门加宫', '门加三奇六仪', '门加门'] as const).map(v => (
          <button
            key={v}
            onClick={() => { setSubView(v); setFortune('全部'); setGateFilter('全部'); setQuery(''); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subView === v ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {subView === '总览' && <GateOverview />}
      {subView === '门加宫' && (
        <FilteredList
          fortune={fortune} setFortune={setFortune}
          gateFilter={gateFilter} setGateFilter={setGateFilter}
          query={query} setQuery={setQuery}
          renderContent={(f, g, q) => <GatePalaceList fortune={f} gateFilter={g} query={q} />}
        />
      )}
      {subView === '门加三奇六仪' && (
        <FilteredList
          fortune={fortune} setFortune={setFortune}
          gateFilter={gateFilter} setGateFilter={setGateFilter}
          query={query} setQuery={setQuery}
          renderContent={(f, g, q) => <GateStemList fortune={f} gateFilter={g} query={q} />}
        />
      )}
      {subView === '门加门' && (
        <FilteredList
          fortune={fortune} setFortune={setFortune}
          gateFilter={gateFilter} setGateFilter={setGateFilter}
          query={query} setQuery={setQuery}
          renderContent={(f, g, q) => <GateGateList fortune={f} gateFilter={g} query={q} />}
        />
      )}
    </div>
  );
}

// ─── 八门总览 ───────────────────────────────────────────────────────────────

function GateOverview() {
  return (
    <div className="space-y-3">
      {GATES.map(gate => {
        const info = GATE_INFO[gate];
        return (
          <div key={gate} className="rounded-lg border border-qimen-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${fortuneLabel[info.category]}`}>
                {info.category === '吉' ? '吉门' : info.category === '凶' ? '凶门' : '中平'}
              </span>
              <span className="text-sm font-bold">{info.name}门</span>
              <span className="text-xs text-qimen-text-secondary">
                {info.wuxing} · 原宫{info.palace}宫
              </span>
            </div>
            <div className="space-y-1 text-sm text-qimen-text-secondary">
              <p><span className="text-qimen-text">含义：</span>{info.meaning}</p>
              <p><span className="text-qimen-text">代表：</span>{info.represents}</p>
              <p><span className="text-qimen-text">占断：</span>{info.divination}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 通用筛选框 ─────────────────────────────────────────────────────────────

function FilteredList({ fortune, setFortune, gateFilter, setGateFilter, query, setQuery, renderContent }: {
  fortune: FortuneFilter; setFortune: (v: FortuneFilter) => void;
  gateFilter: string; setGateFilter: (v: string) => void;
  query: string; setQuery: (v: string) => void;
  renderContent: (f: FortuneFilter, g: string, q: string) => React.ReactNode;
}) {
  return (
    <div>
      <input
        type="text"
        placeholder="搜索含义..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm"
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(['全部', '吉', '凶', '平'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFortune(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              fortune === f ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-1">
        <button
          onClick={() => setGateFilter('全部')}
          className={`rounded px-2 py-1 text-xs ${gateFilter === '全部' ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary'}`}
        >
          全部门
        </button>
        {GATES.map(g => (
          <button
            key={g}
            onClick={() => setGateFilter(g)}
            className={`rounded px-2 py-1 text-xs ${gateFilter === g ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary'}`}
          >
            {g}门
          </button>
        ))}
      </div>
      {renderContent(fortune, gateFilter, query)}
    </div>
  );
}

// ─── 门加宫列表 ─────────────────────────────────────────────────────────────

function GatePalaceList({ fortune, gateFilter, query }: { fortune: FortuneFilter; gateFilter: string; query: string }) {
  const items = useMemo(() => {
    let data = GATE_PALACE_DATA;
    if (fortune !== '全部') data = data.filter(d => d.fortune === fortune);
    if (gateFilter !== '全部') data = data.filter(d => d.gate === gateFilter);
    if (query) data = data.filter(d => d.meaning.includes(query));
    return data;
  }, [fortune, gateFilter, query]);

  return (
    <div className="space-y-3">
      {items.map((d, i) => (
        <div key={i} className="rounded-lg border border-qimen-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${fortuneLabel[d.fortune]}`}>{d.fortune}</span>
            <span className="text-sm font-bold">{d.gate}门 + {PALACE_NAMES[d.palace - 1]}{d.palace}宫</span>
            <span className="text-xs text-qimen-text-secondary">{d.relation}</span>
          </div>
          <p className="text-sm leading-relaxed text-qimen-text-secondary">{d.meaning}</p>
        </div>
      ))}
      {items.length === 0 && <p className="py-8 text-center text-sm text-qimen-text-secondary">未找到匹配结果</p>}
    </div>
  );
}

// ─── 门加三奇六仪列表 ───────────────────────────────────────────────────────

function GateStemList({ fortune, gateFilter, query }: { fortune: FortuneFilter; gateFilter: string; query: string }) {
  const items = useMemo(() => {
    let data = GATE_STEM_DATA;
    if (fortune !== '全部') data = data.filter(d => d.fortune === fortune);
    if (gateFilter !== '全部') data = data.filter(d => d.gate === gateFilter);
    if (query) data = data.filter(d => d.meaning.includes(query));
    return data;
  }, [fortune, gateFilter, query]);

  return (
    <div className="space-y-3">
      {items.map((d, i) => (
        <div key={i} className="rounded-lg border border-qimen-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${fortuneLabel[d.fortune]}`}>{d.fortune}</span>
            <span className="text-sm font-bold">{d.gate}门 + {d.stem}</span>
          </div>
          <p className="text-sm leading-relaxed text-qimen-text-secondary">{d.meaning}</p>
        </div>
      ))}
      {items.length === 0 && <p className="py-8 text-center text-sm text-qimen-text-secondary">未找到匹配结果</p>}
    </div>
  );
}

// ─── 门加门列表 ─────────────────────────────────────────────────────────────

function GateGateList({ fortune, gateFilter, query }: { fortune: FortuneFilter; gateFilter: string; query: string }) {
  const items = useMemo(() => {
    let data = GATE_GATE_DATA;
    if (fortune !== '全部') data = data.filter(d => d.fortune === fortune);
    if (gateFilter !== '全部') data = data.filter(d => d.gate1 === gateFilter);
    if (query) data = data.filter(d => d.meaning.includes(query));
    return data;
  }, [fortune, gateFilter, query]);

  return (
    <div className="space-y-3">
      {items.map((d, i) => (
        <div key={i} className="rounded-lg border border-qimen-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${fortuneLabel[d.fortune]}`}>{d.fortune}</span>
            <span className="text-sm font-bold">{d.gate1}门 + {d.gate2}门</span>
          </div>
          <p className="text-sm leading-relaxed text-qimen-text-secondary">{d.meaning}</p>
        </div>
      ))}
      {items.length === 0 && <p className="py-8 text-center text-sm text-qimen-text-secondary">未找到匹配结果</p>}
    </div>
  );
}
