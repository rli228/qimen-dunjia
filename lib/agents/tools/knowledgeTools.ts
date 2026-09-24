/**
 * 知识检索工具 — 案例库 + 古籍
 *
 * 这是"调取案例"那一环。检索用的是朴素的加权关键词匹配，不是向量检索：
 * 案例总量还在两位数，BM25/embedding 的收益远不如一个能解释为什么命中的打分函数，
 * 而且 Agent 3 需要能复核"这条案例凭什么被引用"。等案例上千再换。
 */

import { z } from 'zod';
import { defineTool } from './registry';
import { EVENT_TYPE_KEYS } from '@/lib/qimen/interpretation/data/yongShen';
import type { EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import type { CaseStudy } from '@/lib/qimen/research/caseStudy';
import { searchByTags, searchText, ALL_PASSAGES } from '@/lib/classics/index';

const eventTypeEnum = z.enum(EVENT_TYPE_KEYS as [EventTypeKey, ...EventTypeKey[]]);

// ─── 案例检索 ────────────────────────────────────────────────────────────────

/** 可解释的打分：事类命中 3 分，标签命中 2 分/个，关键词命中 1 分/处 */
function scoreCase(c: CaseStudy, eventType: EventTypeKey | undefined, tags: string[], keyword: string | undefined): number {
  let score = 0;
  if (eventType && c.eventType === eventType) score += 3;
  for (const t of tags) {
    if (c.tags.some(ct => ct.includes(t) || t.includes(ct))) score += 2;
  }
  if (keyword) {
    const hay = `${c.question} ${c.interpretation.reasoning} ${c.interpretation.conclusion} ${c.tags.join(' ')}`;
    if (hay.includes(keyword)) score += 1;
    for (const kf of c.interpretation.keyFactors) {
      if (kf.element.includes(keyword)) score += 1;
    }
  }
  return score;
}

function renderCase(c: CaseStudy): string {
  const lines: string[] = [];
  lines.push(`── 案例 ${c.id}（${c.eventType} / ${c.difficulty} / 来源:${c.source}${c.bookRef ? ` 《${c.bookRef.title}》` : ''}）`);
  lines.push(`问题：${c.question}`);
  lines.push(`盘面：${c.chartInfo.dateTime}，${c.chartInfo.jieQi}${c.chartInfo.yuan}，${c.chartInfo.dunType}${c.chartInfo.juNumber}局，值符${c.chartInfo.zhiFu}值使${c.chartInfo.zhiShi}`);
  if (c.chartInfo.palaceNotes) lines.push(`盘面要点：${c.chartInfo.palaceNotes}`);
  lines.push('关键因素：');
  for (const kf of c.interpretation.keyFactors) {
    lines.push(`  · [${kf.effect}] ${kf.element}（${kf.role}）${kf.note ? ' — ' + kf.note : ''}`);
  }
  lines.push(`推理：${c.interpretation.reasoning}`);
  lines.push(`结论：${c.interpretation.conclusion}（解盘者确信度 ${c.interpretation.confidence}/5）`);
  if (c.actualOutcome) {
    lines.push(`实际结果：${c.actualOutcome}　断准=${c.outcomeCorrect === null || c.outcomeCorrect === undefined ? '未知' : c.outcomeCorrect ? '是' : '否'}`);
  }
  if (c.tags.length) lines.push(`标签：${c.tags.join('、')}`);
  return lines.join('\n');
}

export const searchCasesTool = defineTool({
  name: 'search_cases',
  description:
    '检索人工解盘案例库（书籍/老师/自己练习积累）。返回的案例包含完整推理过程、关键因素和真实结果，' +
    '用来对照当前盘面的断法是否成立。同事类且有真实结果的案例最有参考价值。' +
    '注意：案例的盘面与当前盘面不同，只能借鉴其**断法逻辑**，不能照搬结论。',
  schema: z.object({
    eventType: eventTypeEnum.optional().describe('按事类筛选，缺省为当前事类'),
    tags: z.array(z.string()).optional().describe('知识点标签，如 ["乙庚合","空亡"]'),
    keyword: z.string().optional().describe('自由关键词，会在问题/推理/关键因素中匹配'),
    limit: z.number().int().min(1).max(5).optional().describe('返回条数上限，默认 3'),
  }),
  run: (input, ctx) => {
    const eventType = input.eventType ?? ctx.eventType;
    const tags = input.tags ?? [];
    const limit = input.limit ?? 3;

    const scored = ctx.cases
      .map(c => ({ c, score: scoreCase(c, eventType, tags, input.keyword) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (scored.length === 0) {
      return `案例库中没有匹配的案例（库中共 ${ctx.cases.length} 条）。不要因此编造案例，直接基于盘面和规则引擎分析即可。`;
    }

    return scored.map(x => `[匹配分 ${x.score}]\n${renderCase(x.c)}`).join('\n\n');
  },
});

// ─── 古籍检索 ────────────────────────────────────────────────────────────────

export const searchClassicsTool = defineTool({
  name: 'search_classics',
  description:
    '检索古籍原文（烟波钓叟歌 / 奇门秘诀 / 十干克应），返回原文与白话翻译。' +
    '用于为某个断语找传统依据。引用时必须注明出处。',
  schema: z.object({
    keyword: z.string().optional().describe('全文关键词，如 "青龙返首"、"空亡"'),
    tags: z.array(z.string()).optional().describe('标签检索，与 keyword 二选一或并用'),
    limit: z.number().int().min(1).max(5).optional().describe('返回条数上限，默认 3'),
  }),
  run: (input) => {
    const limit = input.limit ?? 3;
    const byTag = input.tags?.length ? searchByTags(input.tags) : [];
    const byText = input.keyword ? searchText(input.keyword) : [];

    const seen = new Set<string>();
    const merged = [...byTag, ...byText].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).slice(0, limit);

    if (merged.length === 0) {
      return `古籍库中没有匹配段落（库中共 ${ALL_PASSAGES.length} 段）。不要编造古籍原文。`;
    }

    return merged.map(p =>
      `── 《${p.source}》[${p.topic}]\n原文：${p.originalText}\n白话：${p.modernTranslation}\n标签：${p.tags.join('、')}`
    ).join('\n\n');
  },
});
