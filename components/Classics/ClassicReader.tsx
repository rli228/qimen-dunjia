'use client';

import { useState, useMemo } from 'react';
import { ALL_PASSAGES, searchText, getBySource, type ClassicSource } from '@/lib/classics/index';

const SOURCES: (ClassicSource | '全部')[] = ['全部', '烟波钓叟歌', '奇门秘诀', '十干克应'];

const sourceColor: Record<string, string> = {
  '烟波钓叟歌': 'bg-qimen-gold/10 text-qimen-gold',
  '奇门秘诀': 'bg-qimen-red/10 text-qimen-red',
  '十干克应': 'bg-qimen-green/10 text-qimen-green',
};

interface Props {
  highlightId?: string;
}

export function ClassicReader({ highlightId }: Props) {
  const [query, setQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<ClassicSource | '全部'>('全部');

  const passages = useMemo(() => {
    let results = query ? searchText(query) : ALL_PASSAGES;
    if (selectedSource !== '全部') {
      results = results.filter(p => p.source === selectedSource);
    }
    return results;
  }, [query, selectedSource]);

  return (
    <div>
      {/* 搜索 */}
      <input
        type="text"
        placeholder="搜索古籍..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm"
      />

      {/* 来源筛选 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {SOURCES.map(source => (
          <button
            key={source}
            onClick={() => setSelectedSource(source)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedSource === source
                ? 'bg-qimen-gold text-white'
                : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            {source}
          </button>
        ))}
        <span className="ml-auto text-xs text-qimen-text-secondary self-center">
          {passages.length} 条
        </span>
      </div>

      {/* 段落列表 */}
      <div className="space-y-4">
        {passages.map(passage => (
          <div
            key={passage.id}
            id={passage.id}
            className={`rounded-lg border p-4 transition-all ${
              highlightId === passage.id
                ? 'border-qimen-gold ring-2 ring-qimen-gold/30'
                : 'border-qimen-border'
            }`}
          >
            {/* 来源标签 */}
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${sourceColor[passage.source] || ''}`}>
                {passage.source}
              </span>
              <span className="text-[10px] text-qimen-text-secondary">{passage.topic}</span>
            </div>

            {/* 原文 */}
            <p className="text-sm leading-relaxed font-medium">{passage.originalText}</p>

            {/* 译文 */}
            {passage.modernTranslation && (
              <p className="mt-2 text-xs leading-relaxed text-qimen-text-secondary">
                {passage.modernTranslation}
              </p>
            )}

            {/* 标签 */}
            <div className="mt-2 flex flex-wrap gap-1">
              {passage.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded bg-qimen-bg px-1.5 py-0.5 text-[10px] text-qimen-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
