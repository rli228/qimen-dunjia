'use client';

import { useState, useMemo } from 'react';
import { GAN_INTERACTION_DATA } from '@/lib/qimen/interpretation/data/ganInteractions';
import { SAN_QI_LIU_YI } from '@/lib/qimen/constants';

type FortuneFilter = '全部' | '吉' | '凶' | '平';
type ViewMode = 'list' | 'matrix';

const ALL_ENTRIES = Object.entries(GAN_INTERACTION_DATA).map(([key, data]) => {
  const [tian, di] = key.split('_');
  return { key, tian, di, ...data };
});

const fortuneColor = {
  '吉': 'text-qimen-green',
  '凶': 'text-qimen-red',
  '平': 'text-qimen-text-secondary',
};

const fortuneBg = {
  '吉': 'bg-qimen-green',
  '凶': 'bg-qimen-red',
  '平': 'bg-gray-400',
};

export function GanInteractionReference() {
  const [view, setView] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<FortuneFilter>('全部');
  const [ganFilter, setGanFilter] = useState<string>('全部');
  const [query, setQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const entries = useMemo(() => {
    let results = ALL_ENTRIES;
    if (filter !== '全部') results = results.filter(e => e.fortune === filter);
    if (ganFilter !== '全部') results = results.filter(e => e.tian === ganFilter);
    if (query) {
      const q = query.trim();
      results = results.filter(e => e.name.includes(q) || e.meaning.includes(q));
    }
    return results;
  }, [filter, ganFilter, query]);

  const counts = useMemo(() => ({
    total: ALL_ENTRIES.length,
    ji: ALL_ENTRIES.filter(e => e.fortune === '吉').length,
    xiong: ALL_ENTRIES.filter(e => e.fortune === '凶').length,
    ping: ALL_ENTRIES.filter(e => e.fortune === '平').length,
  }), []);

  const selectedData = selectedCell ? GAN_INTERACTION_DATA[selectedCell] : null;
  const [selTian, selDi] = selectedCell ? selectedCell.split('_') : ['', ''];

  return (
    <div>
      {/* 视图切换 */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setView('list')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'list' ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
          }`}
        >
          列表
        </button>
        <button
          onClick={() => setView('matrix')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            view === 'matrix' ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
          }`}
        >
          九宫矩阵
        </button>
      </div>

      {view === 'list' ? (
        <>
          {/* 搜索 */}
          <input
            type="text"
            placeholder="搜索克应名称、含义..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm"
          />

          {/* 筛选栏 */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(['全部', '吉', '凶', '平'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === type ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
                }`}
              >
                {type === '全部' ? `全部 (${counts.total})` : `${type} (${counts[type === '吉' ? 'ji' : type === '凶' ? 'xiong' : 'ping']})`}
              </button>
            ))}
          </div>

          {/* 天盘干筛选 */}
          <div className="mb-6 flex flex-wrap gap-1">
            <button
              onClick={() => setGanFilter('全部')}
              className={`rounded px-2 py-1 text-xs ${ganFilter === '全部' ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary'}`}
            >
              全部天干
            </button>
            {SAN_QI_LIU_YI.map(gan => (
              <button
                key={gan}
                onClick={() => setGanFilter(gan)}
                className={`rounded px-2 py-1 text-xs ${ganFilter === gan ? 'bg-qimen-gold text-white' : 'bg-qimen-bg text-qimen-text-secondary'}`}
              >
                {gan}
              </button>
            ))}
            <span className="ml-auto self-center text-xs text-qimen-text-secondary">
              {entries.length} 条
            </span>
          </div>

          {/* 列表 */}
          <div className="space-y-3">
            {entries.map(e => (
              <div key={e.key} className="rounded-lg border border-qimen-border p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                    e.fortune === '吉' ? 'bg-qimen-green/10 text-qimen-green'
                      : e.fortune === '凶' ? 'bg-qimen-red/10 text-qimen-red'
                        : 'bg-gray-500/10 text-qimen-text-secondary'
                  }`}>
                    {e.fortune}
                  </span>
                  <span className="text-sm font-bold">{e.name}</span>
                  <span className="text-xs text-qimen-text-secondary">
                    {e.tian}+{e.di}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-qimen-text-secondary">{e.meaning}</p>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="py-8 text-center text-sm text-qimen-text-secondary">未找到匹配的克应</p>
            )}
          </div>
        </>
      ) : (
        /* 矩阵视图 */
        <div>
          <p className="mb-3 text-xs text-qimen-text-secondary">
            行=天盘干，列=地盘干，点击格子查看详情
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr>
                  <th className="p-1.5">天＼地</th>
                  {SAN_QI_LIU_YI.map(di => (
                    <th key={di} className="p-1.5 font-medium">{di}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAN_QI_LIU_YI.map(tian => (
                  <tr key={tian}>
                    <td className="p-1.5 font-medium">{tian}</td>
                    {SAN_QI_LIU_YI.map(di => {
                      const key = `${tian}_${di}`;
                      const data = GAN_INTERACTION_DATA[key];
                      const isSelected = selectedCell === key;
                      return (
                        <td key={key} className="p-1">
                          <button
                            onClick={() => setSelectedCell(isSelected ? null : key)}
                            className={`mx-auto flex h-7 w-7 items-center justify-center rounded transition-all ${
                              isSelected ? 'ring-2 ring-qimen-gold' : 'hover:bg-qimen-bg'
                            }`}
                          >
                            <span className={`inline-block h-3 w-3 rounded-full ${data ? fortuneBg[data.fortune] : 'bg-gray-300'}`} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 图例 */}
          <div className="mt-3 flex gap-4 text-xs text-qimen-text-secondary">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-qimen-green" /> 吉</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-qimen-red" /> 凶</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400" /> 平</span>
          </div>

          {/* 选中详情 */}
          {selectedData && (
            <div className="mt-4 rounded-lg border border-qimen-gold/30 bg-qimen-gold/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  selectedData.fortune === '吉' ? 'bg-qimen-green/10 text-qimen-green'
                    : selectedData.fortune === '凶' ? 'bg-qimen-red/10 text-qimen-red'
                      : 'bg-gray-500/10 text-qimen-text-secondary'
                }`}>
                  {selectedData.fortune}
                </span>
                <span className="text-sm font-bold">{selectedData.name}</span>
                <span className="text-xs text-qimen-text-secondary">{selTian}+{selDi}</span>
              </div>
              <p className="text-sm leading-relaxed text-qimen-text-secondary">{selectedData.meaning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
