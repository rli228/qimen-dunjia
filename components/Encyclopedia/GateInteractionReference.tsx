'use client';

import { useState, useMemo } from 'react';
import {
  GATE_INFO,
  GATE_PALACE_DATA,
  GATE_STEM_DATA,
  GATE_GATE_DATA,
} from '@/lib/qimen/interpretation/data/gateInteractions';
import { SAN_QI_LIU_YI } from '@/lib/qimen/constants';
import type { GateName } from '@/lib/qimen/constants';

type ViewMode = 'overview' | 'palace' | 'stem' | 'gate';
type FortuneFilter = '全部' | '吉' | '凶' | '平';

const ALL_GATES: Exclude<GateName, '中'>[] = ['开', '休', '生', '伤', '杜', '景', '死', '惊'];
const ALL_STEMS = SAN_QI_LIU_YI;
const PALACE_LABELS: Record<number, string> = {
  1: '坎一宫(水)', 2: '坤二宫(土)', 3: '震三宫(木)', 4: '巽四宫(木)',
  6: '乾六宫(金)', 7: '兑七宫(金)', 8: '艮八宫(土)', 9: '离九宫(火)',
};
const PALACE_ORDER = [1, 2, 3, 4, 6, 7, 8, 9];

const CATEGORY_COLORS: Record<string, string> = {
  '吉门': 'bg-qimen-green/10 text-qimen-green',
  '凶门': 'bg-qimen-red/10 text-qimen-red',
  '平门': 'bg-yellow-500/10 text-yellow-500',
};

const FORTUNE_COLORS: Record<string, string> = {
  '吉': 'bg-qimen-green/10 text-qimen-green',
  '凶': 'bg-qimen-red/10 text-qimen-red',
  '平': 'bg-yellow-500/10 text-yellow-500',
};

const FORTUNE_DOT: Record<string, string> = {
  '吉': 'bg-qimen-green',
  '凶': 'bg-qimen-red',
  '平': 'bg-yellow-500',
};

// ─── 共用：搜索+筛选+矩阵+列表 ────────────────────────────────────────────

function FortuneFilterBar({ fortune, setFortune }: { fortune: FortuneFilter; setFortune: (f: FortuneFilter) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {(['全部', '吉', '凶', '平'] as const).map(f => (
        <button
          key={f}
          onClick={() => setFortune(f)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            fortune === f
              ? 'bg-qimen-gold text-white'
              : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function GateFilterBar({ selected, setSelected }: { selected: string | null; setSelected: (g: string | null) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <span className="self-center text-xs text-qimen-text-secondary mr-1">选门：</span>
      <button
        onClick={() => setSelected(null)}
        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
          selected === null ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
        }`}
      >
        全部
      </button>
      {ALL_GATES.map(g => (
        <button
          key={g}
          onClick={() => setSelected(g)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            selected === g ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
          }`}
        >
          {g}门
        </button>
      ))}
    </div>
  );
}

function MatrixLegend() {
  return (
    <div className="mt-2 flex items-center gap-4 text-xs text-qimen-text-secondary">
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-qimen-green" /> 吉</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-qimen-red" /> 凶</span>
      <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> 平</span>
    </div>
  );
}

function EmptyState() {
  return <p className="py-8 text-center text-sm text-qimen-text-secondary">未找到匹配的克应</p>;
}

// ─── 主组件 ──────────────────────────────────────────────────────────────────

export function GateInteractionReference() {
  const [view, setView] = useState<ViewMode>('overview');
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [fortune, setFortune] = useState<FortuneFilter>('全部');
  const [query, setQuery] = useState('');

  // 切换视图时重置筛选
  const switchView = (v: ViewMode) => {
    setView(v);
    setSelectedGate(null);
    setFortune('全部');
    setQuery('');
  };

  return (
    <div>
      {/* 视图切换 */}
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-qimen-border p-0.5 w-fit">
        {([
          { key: 'overview', label: '八门总览' },
          { key: 'palace', label: '门加宫' },
          { key: 'stem', label: '门加三奇六仪' },
          { key: 'gate', label: '门加门' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => switchView(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === t.key ? 'bg-qimen-gold text-white' : 'text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'overview' && <OverviewView />}
      {view === 'palace' && (
        <PalaceView
          query={query} setQuery={setQuery}
          fortune={fortune} setFortune={setFortune}
          selectedGate={selectedGate} setSelectedGate={setSelectedGate}
        />
      )}
      {view === 'stem' && (
        <StemView
          query={query} setQuery={setQuery}
          fortune={fortune} setFortune={setFortune}
          selectedGate={selectedGate} setSelectedGate={setSelectedGate}
        />
      )}
      {view === 'gate' && (
        <GateGateView
          query={query} setQuery={setQuery}
          fortune={fortune} setFortune={setFortune}
          selectedGate={selectedGate} setSelectedGate={setSelectedGate}
        />
      )}
    </div>
  );
}

// ─── 八门总览 ────────────────────────────────────────────────────────────────

function OverviewView() {
  return (
    <div className="space-y-4">
      {GATE_INFO.map(gate => (
        <div key={gate.name} className="rounded-lg border border-qimen-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[gate.category]}`}>
              {gate.category}
            </span>
            <span className="text-base font-bold">{gate.name}门</span>
            <span className="text-xs text-qimen-text-secondary">
              {gate.wuxing} · {gate.direction} · 原宫{gate.palace}宫
            </span>
          </div>
          <p className="mb-2 text-sm leading-relaxed text-qimen-text-secondary">{gate.meaning}</p>
          <div className="mb-2">
            <span className="text-xs font-medium text-qimen-gold">代表事物：</span>
            <span className="text-xs text-qimen-text-secondary">{gate.represents}</span>
          </div>
          <div>
            <span className="text-xs font-medium text-qimen-gold">占断要点：</span>
            <span className="text-xs text-qimen-text-secondary">{gate.divination}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 门加宫 ──────────────────────────────────────────────────────────────────

interface FilterProps {
  query: string; setQuery: (q: string) => void;
  fortune: FortuneFilter; setFortune: (f: FortuneFilter) => void;
  selectedGate: string | null; setSelectedGate: (g: string | null) => void;
}

function PalaceView({ query, setQuery, fortune, setFortune, selectedGate, setSelectedGate }: FilterProps) {
  const entries = useMemo(() => {
    return Object.entries(GATE_PALACE_DATA).map(([key, data]) => {
      const [gate, palace] = key.split('_');
      return { key, gate, palace: Number(palace), ...data };
    });
  }, []);

  const filtered = useMemo(() => {
    let r = entries;
    if (selectedGate) r = r.filter(e => e.gate === selectedGate);
    if (fortune !== '全部') r = r.filter(e => e.fortune === fortune);
    if (query.trim()) {
      const q = query.trim();
      r = r.filter(e => e.meaning.includes(q) || e.gate.includes(q) || e.palaceName.includes(q) || e.relation.includes(q));
    }
    return r;
  }, [entries, selectedGate, fortune, query]);

  return (
    <div>
      <input type="text" placeholder="搜索克应含义..." value={query} onChange={e => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm" />
      <FortuneFilterBar fortune={fortune} setFortune={setFortune} />
      <GateFilterBar selected={selectedGate} setSelected={setSelectedGate} />

      {/* 矩阵 */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="border border-qimen-border bg-qimen-surface p-2 text-qimen-gold">门＼宫</th>
              {PALACE_ORDER.map(p => (
                <th key={p} className="border border-qimen-border bg-qimen-surface p-1.5 font-medium text-[11px]">
                  {PALACE_LABELS[p].slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_GATES.map(gate => (
              <tr key={gate}>
                <td className="border border-qimen-border bg-qimen-surface p-2 font-medium text-qimen-gold">{gate}</td>
                {PALACE_ORDER.map(p => {
                  const data = GATE_PALACE_DATA[`${gate}_${p}`];
                  if (!data) return <td key={p} className="border border-qimen-border p-1">-</td>;
                  return (
                    <td key={p} className="border border-qimen-border p-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${FORTUNE_DOT[data.fortune]}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <MatrixLegend />
      </div>

      <div className="mb-2 text-right text-xs text-qimen-text-secondary">{filtered.length} 条克应</div>
      <div className="space-y-3">
        {filtered.map(entry => (
          <div key={entry.key} className="rounded-lg border border-qimen-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${FORTUNE_COLORS[entry.fortune]}`}>{entry.fortune}</span>
              <span className="text-sm font-bold">{entry.gate}门 → {entry.palaceName}</span>
            </div>
            <div className="mb-1 text-xs text-qimen-gold">{entry.relation}</div>
            <p className="text-sm leading-relaxed text-qimen-text-secondary">{entry.meaning}</p>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

// ─── 门加三奇六仪 ────────────────────────────────────────────────────────────

function StemView({ query, setQuery, fortune, setFortune, selectedGate, setSelectedGate }: FilterProps) {
  const entries = useMemo(() => {
    return Object.entries(GATE_STEM_DATA).map(([key, data]) => {
      const [gate, stem] = key.split('_');
      return { key, gate, stem, ...data };
    });
  }, []);

  const filtered = useMemo(() => {
    let r = entries;
    if (selectedGate) r = r.filter(e => e.gate === selectedGate);
    if (fortune !== '全部') r = r.filter(e => e.fortune === fortune);
    if (query.trim()) {
      const q = query.trim();
      r = r.filter(e => e.meaning.includes(q) || e.gate.includes(q) || e.stem.includes(q));
    }
    return r;
  }, [entries, selectedGate, fortune, query]);

  return (
    <div>
      <input type="text" placeholder="搜索克应含义..." value={query} onChange={e => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm" />
      <FortuneFilterBar fortune={fortune} setFortune={setFortune} />
      <GateFilterBar selected={selectedGate} setSelected={setSelectedGate} />

      {/* 矩阵 */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="border border-qimen-border bg-qimen-surface p-2 text-qimen-gold">门＼干</th>
              {ALL_STEMS.map(s => (
                <th key={s} className="border border-qimen-border bg-qimen-surface p-1.5 font-medium">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_GATES.map(gate => (
              <tr key={gate}>
                <td className="border border-qimen-border bg-qimen-surface p-2 font-medium text-qimen-gold">{gate}</td>
                {ALL_STEMS.map(s => {
                  const data = GATE_STEM_DATA[`${gate}_${s}`];
                  if (!data) return <td key={s} className="border border-qimen-border p-1">-</td>;
                  return (
                    <td key={s} className="border border-qimen-border p-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${FORTUNE_DOT[data.fortune]}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <MatrixLegend />
      </div>

      <div className="mb-2 text-right text-xs text-qimen-text-secondary">{filtered.length} 条克应</div>
      <div className="space-y-3">
        {filtered.map(entry => (
          <div key={entry.key} className="rounded-lg border border-qimen-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${FORTUNE_COLORS[entry.fortune]}`}>{entry.fortune}</span>
              <span className="text-sm font-bold">{entry.gate}门 + {entry.stem}</span>
            </div>
            <p className="text-sm leading-relaxed text-qimen-text-secondary">{entry.meaning}</p>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

// ─── 门加门 ──────────────────────────────────────────────────────────────────

function GateGateView({ query, setQuery, fortune, setFortune, selectedGate, setSelectedGate }: FilterProps) {
  const entries = useMemo(() => {
    return Object.entries(GATE_GATE_DATA).map(([key, data]) => {
      const [gate1, gate2] = key.split('_');
      return { key, gate1, gate2, ...data };
    });
  }, []);

  const filtered = useMemo(() => {
    let r = entries;
    if (selectedGate) r = r.filter(e => e.gate1 === selectedGate);
    if (fortune !== '全部') r = r.filter(e => e.fortune === fortune);
    if (query.trim()) {
      const q = query.trim();
      r = r.filter(e => e.meaning.includes(q) || e.gate1.includes(q) || e.gate2.includes(q));
    }
    return r;
  }, [entries, selectedGate, fortune, query]);

  return (
    <div>
      <input type="text" placeholder="搜索克应含义..." value={query} onChange={e => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm" />
      <FortuneFilterBar fortune={fortune} setFortune={setFortune} />
      <GateFilterBar selected={selectedGate} setSelected={setSelectedGate} />

      {/* 矩阵 */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="border border-qimen-border bg-qimen-surface p-2 text-qimen-gold">用＼对</th>
              {ALL_GATES.map(g => (
                <th key={g} className="border border-qimen-border bg-qimen-surface p-1.5 font-medium">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_GATES.map(gate1 => (
              <tr key={gate1}>
                <td className="border border-qimen-border bg-qimen-surface p-2 font-medium text-qimen-gold">{gate1}</td>
                {ALL_GATES.map(gate2 => {
                  const data = GATE_GATE_DATA[`${gate1}_${gate2}`];
                  if (!data) return <td key={gate2} className="border border-qimen-border p-1">-</td>;
                  return (
                    <td key={gate2} className="border border-qimen-border p-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${FORTUNE_DOT[data.fortune]}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <MatrixLegend />
      </div>

      <p className="mb-4 text-xs text-qimen-text-secondary">
        行 = 用神宫之门，列 = 对方宫之门
      </p>

      <div className="mb-2 text-right text-xs text-qimen-text-secondary">{filtered.length} 条克应</div>
      <div className="space-y-3">
        {filtered.map(entry => (
          <div key={entry.key} className="rounded-lg border border-qimen-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${FORTUNE_COLORS[entry.fortune]}`}>{entry.fortune}</span>
              <span className="text-sm font-bold">{entry.gate1}门 → {entry.gate2}门</span>
            </div>
            <p className="text-sm leading-relaxed text-qimen-text-secondary">{entry.meaning}</p>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}
