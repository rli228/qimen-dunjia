'use client';

import { useState, useMemo } from 'react';
import { AUSPICIOUS_PATTERNS } from '@/lib/qimen/interpretation/data/patternsAuspicious';
import { INAUSPICIOUS_PATTERNS } from '@/lib/qimen/interpretation/data/patternsInauspicious';

type FilterType = '全部' | '吉格' | '凶格';

const ALL_PATTERNS = [...AUSPICIOUS_PATTERNS, ...INAUSPICIOUS_PATTERNS];

export function PatternReference() {
  const [filter, setFilter] = useState<FilterType>('全部');
  const [query, setQuery] = useState('');

  const patterns = useMemo(() => {
    let results = ALL_PATTERNS;
    if (filter !== '全部') {
      results = results.filter(p => p.type === filter);
    }
    if (query) {
      const q = query.trim().toLowerCase();
      results = results.filter(
        p =>
          p.name.includes(q) ||
          p.description.includes(q) ||
          p.tags.some(t => t.includes(q)),
      );
    }
    return results;
  }, [filter, query]);

  const jiCount = ALL_PATTERNS.filter(p => p.type === '吉格').length;
  const xiongCount = ALL_PATTERNS.filter(p => p.type === '凶格').length;

  return (
    <div>
      {/* 搜索 */}
      <input
        type="text"
        placeholder="搜索格局名称、描述、标签..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="mb-4 w-full rounded-lg border border-qimen-border bg-qimen-bg px-4 py-2.5 text-sm"
      />

      {/* 筛选 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['全部', '吉格', '凶格'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === type
                ? 'bg-qimen-gold text-white'
                : 'bg-qimen-bg text-qimen-text-secondary hover:text-qimen-text'
            }`}
          >
            {type === '全部' ? `全部 (${ALL_PATTERNS.length})` : type === '吉格' ? `吉格 (${jiCount})` : `凶格 (${xiongCount})`}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-qimen-text-secondary">
          {patterns.length} 个格局
        </span>
      </div>

      {/* 格局列表 */}
      <div className="space-y-4">
        {patterns.map(pattern => (
          <div
            key={`${pattern.type}-${pattern.name}`}
            className="rounded-lg border border-qimen-border p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  pattern.type === '吉格'
                    ? 'bg-qimen-green/10 text-qimen-green'
                    : 'bg-qimen-red/10 text-qimen-red'
                }`}
              >
                {pattern.type}
              </span>
              <span className="text-sm font-bold">{pattern.name}</span>
              {pattern.isChartWide && (
                <span className="rounded bg-qimen-bg px-1.5 py-0.5 text-[10px] text-qimen-text-secondary">
                  全盘
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-qimen-text-secondary">
              {pattern.description}
            </p>

            <div className="mt-2 flex flex-wrap gap-1">
              {pattern.tags.map(tag => (
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

        {patterns.length === 0 && (
          <p className="py-8 text-center text-sm text-qimen-text-secondary">
            未找到匹配的格局
          </p>
        )}
      </div>
    </div>
  );
}
