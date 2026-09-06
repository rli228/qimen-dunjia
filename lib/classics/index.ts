import { YANBO_PASSAGES } from './yanbo';
import { MIJUE_PASSAGES } from './mijue';
import { SHIGAN_PASSAGES } from './shigan';
import type { ClassicPassage, ClassicSource } from './types';

export type { ClassicPassage, ClassicSource } from './types';

export const ALL_PASSAGES: ClassicPassage[] = [
  ...YANBO_PASSAGES,
  ...MIJUE_PASSAGES,
  ...SHIGAN_PASSAGES,
];

// 预构建 tag 索引
const TAG_INDEX: Record<string, string[]> = {};
for (const passage of ALL_PASSAGES) {
  for (const tag of passage.tags) {
    if (!TAG_INDEX[tag]) TAG_INDEX[tag] = [];
    TAG_INDEX[tag].push(passage.id);
  }
}

/**
 * 根据 tags 搜索相关古籍段落
 */
export function searchByTags(tags: string[]): ClassicPassage[] {
  const matchedIds = new Set<string>();
  for (const tag of tags) {
    const ids = TAG_INDEX[tag];
    if (ids) ids.forEach(id => matchedIds.add(id));
  }
  return ALL_PASSAGES.filter(p => matchedIds.has(p.id));
}

/**
 * 全文搜索
 */
export function searchText(query: string): ClassicPassage[] {
  if (!query.trim()) return ALL_PASSAGES;
  const q = query.trim().toLowerCase();
  return ALL_PASSAGES.filter(
    p =>
      p.originalText.includes(q) ||
      p.modernTranslation.includes(q) ||
      p.tags.some(t => t.includes(q))
  );
}

/**
 * 按来源筛选
 */
export function getBySource(source: ClassicSource): ClassicPassage[] {
  return ALL_PASSAGES.filter(p => p.source === source);
}
