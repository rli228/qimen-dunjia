'use client';

import { useState, useMemo } from 'react';
import { GAN_INTERACTION_DATA } from '@/lib/qimen/interpretation/data/ganInteractions';
import { SAN_QI_LIU_YI } from '@/lib/qimen/constants';

type FortuneFilter = '全部' | '吉' | '凶' | '平';
type ViewMode = 'list' | 'matrix';

const ALL_GAN = SAN_QI_LIU_YI;

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

function getAllEntries() {
  return Object.entries(GAN_INTERACTION_DATA).map(([key, data]) => {
    const [tianGan, diGan] = key.split('_');
    return { key, tianGan, diGan, ...data };
  });
}

export function GanInteractionReference() {
  const [view, setView] = useState<ViewMode>('list');
  const [fortune, setFortune] = useState<FortuneFilter>('全部');
  const [tianGanFilter, setTianGanFilter] = useState<string>('全部');
  const [query, setQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const allEntries = useMemo(() => getAllEntries(), []);

  const filteredEntries = useMemo(() => {
    let results = allEntries;
    if (fortune !== '全部') {
      results = results.filter(e => e.fortune === fortune);
    }
    if (tianGanFilter !== '全部') {
      results = results.filter(e => e.tianGan === tianGanFilter);
    }
    if (query) {
      const q = query.trim().toLowerCase();
      results = results.filter(
        e => e.name.includes(q) || e.meaning.includes(q) || e.tianGan.includes(q) || e.diGan.includes(q),
      );
    }
    return results;
  }, [allEntries, fortune, tianGanFilter, query]);

  const counts = useMemo(() => ({
    total: allEntries.length,
    ji: allEntries.filter(e => e.fortune === '吉').length,
    xiong: allEntries.filter(e => e.fortune === '凶').length,
    ping: allEntries.filter(e => e.fortune === '平').length,
  }), [allEntries]);

  return (
    <div>
      {/* 搜索 */}
      <input
        type="text"
        placeholder="搜索克应名称、含义..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm"
      />

      {/* 筛选行 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* 吉凶筛选 */}
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
            {f === '全部' ? `全部 (${counts.total})`
              : f === '吉' ? `吉 (${counts.ji})`
              : f === '凶' ? `凶 (${counts.xiong})`
              : `平 (${counts.ping})`}
          </button>
        ))}

        {/* 视图切换 */}
        <div className="ml-auto flex gap-1 rounded-lg border border-qimen-border p-0.5">
          <button
            onClick={() => setView('list')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'list' ? 'bg-qimen-gold text-white' : 'text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            列表
          </button>
          <button
            onClick={() => setView('matrix')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'matrix' ? 'bg-qimen-gold text-white' : 'text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            矩阵
          </button>
        </div>
      </div>

      {/* 天盘干筛选（仅列表模式） */}
      {view === 'list' && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <span className="self-center text-xs text-qimen-text-secondary mr-1">天盘干：</span>
          <button
            onClick={() => setTianGanFilter('全部')}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              tianGanFilter === '全部'
                ? 'bg-qimen-gold text-white'
                : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            全部
          </button>
          {ALL_GAN.map(g => (
            <button
              key={g}
              onClick={() => setTianGanFilter(g)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                tianGanFilter === g
                  ? 'bg-qimen-gold text-white'
                  : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* 列表视图 */}
      {view === 'list' && (
        <>
          <div className="mb-2 text-right text-xs text-qimen-text-secondary">
            {filteredEntries.length} 条克应
          </div>
          <div className="space-y-3">
            {filteredEntries.map(entry => (
              <div
                key={entry.key}
                className="rounded-lg border border-qimen-border p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${FORTUNE_COLORS[entry.fortune]}`}>
                    {entry.fortune}
                  </span>
                  <span className="text-sm font-bold">{entry.name}</span>
                  <span className="text-xs text-qimen-text-secondary">
                    {entry.tianGan}+{entry.diGan}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-qimen-text-secondary">
                  {entry.meaning}
                </p>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <p className="py-8 text-center text-sm text-qimen-text-secondary">
                未找到匹配的克应
              </p>
            )}
          </div>
        </>
      )}

      {/* 矩阵视图 */}
      {view === 'matrix' && (
        <div>
          <div className="mb-3 text-xs text-qimen-text-secondary">
            行 = 天盘干，列 = 地盘干，点击查看详情
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="border border-qimen-border bg-qimen-surface p-2 text-qimen-gold">
                    天＼地
                  </th>
                  {ALL_GAN.map(g => (
                    <th key={g} className="border border-qimen-border bg-qimen-surface p-2 font-medium">
                      {g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALL_GAN.map(tian => (
                  <tr key={tian}>
                    <td className="border border-qimen-border bg-qimen-surface p-2 font-medium text-qimen-gold">
                      {tian}
                    </td>
                    {ALL_GAN.map(di => {
                      const key = `${tian}_${di}`;
                      const data = GAN_INTERACTION_DATA[key];
                      if (!data) return <td key={di} className="border border-qimen-border p-2">-</td>;
                      const isSelected = selectedCell === key;
                      return (
                        <td
                          key={di}
                          onClick={() => setSelectedCell(isSelected ? null : key)}
                          className={`cursor-pointer border border-qimen-border p-1.5 transition-colors hover:bg-qimen-gold/10 ${
                            isSelected ? 'bg-qimen-gold/20 ring-1 ring-qimen-gold' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${FORTUNE_DOT[data.fortune]}`} />
                            <span className="text-[10px] leading-tight">{data.name.length > 4 ? data.name.slice(0, 4) : data.name}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 选中详情 */}
          {selectedCell && GAN_INTERACTION_DATA[selectedCell] && (
            <div className="mt-4 rounded-lg border border-qimen-gold/30 bg-qimen-gold/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${FORTUNE_COLORS[GAN_INTERACTION_DATA[selectedCell].fortune]}`}>
                  {GAN_INTERACTION_DATA[selectedCell].fortune}
                </span>
                <span className="text-sm font-bold">{GAN_INTERACTION_DATA[selectedCell].name}</span>
                <span className="text-xs text-qimen-text-secondary">
                  {selectedCell.replace('_', '+')}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-qimen-text-secondary">
                {GAN_INTERACTION_DATA[selectedCell].meaning}
              </p>
            </div>
          )}

          {/* 图例 */}
          <div className="mt-3 flex items-center gap-4 text-xs text-qimen-text-secondary">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-qimen-green" /> 吉
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-qimen-red" /> 凶
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> 平
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
