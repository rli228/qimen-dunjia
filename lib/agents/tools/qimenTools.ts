/**
 * 盘面工具 — Agent 2 调用确定性引擎的入口
 *
 * 这些工具全部是对 lib/qimen/ 里既有引擎的薄封装。
 * 关键点：工具返回的每一行文字都来自真实计算，模型只能复述不能编造，
 *        Agent 3 之后就是拿这些输出去校验 Agent 2 有没有瞎说。
 */

import { z } from 'zod';
import { defineTool } from './registry';
import { PALACE_NAMES, PALACE_WUXING, STAR_FORTUNE, GATE_FORTUNE } from '@/lib/qimen/constants';
import type { PalaceIndex } from '@/lib/qimen/constants';
import { interpretChart } from '@/lib/qimen/interpretation/index';
import { analyzeYongShen } from '@/lib/qimen/interpretation/yongShenAnalysis';
import { analyzeMarriage } from '@/lib/qimen/interpretation/marriageAnalysis';
import { EVENT_TYPE_KEYS, EVENT_TEMPLATES } from '@/lib/qimen/interpretation/data/yongShen';
import type { EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import { GATE_WUXING, JIEQI_WUXING, getVitality } from '@/lib/qimen/interpretation/data/gateWuxing';
import { lookupGanInteraction } from '@/lib/qimen/interpretation/data/ganInteractions';

const eventTypeEnum = z.enum(EVENT_TYPE_KEYS as [EventTypeKey, ...EventTypeKey[]]);

// ─── 用神分析 ────────────────────────────────────────────────────────────────

export const analyzeYongShenTool = defineTool({
  name: 'analyze_yongshen',
  description:
    '对指定事类运行用神分析引擎：定位各用神落宫、计算旺衰评分、分析用神之间的生克关系，' +
    '并给出规则引擎的吉凶等级(tier)和信号一致性(coherence)。这是断事最核心的工具，几乎总应该先调它。' +
    '默认分析分类器判定的事类；传入不同 eventType 可做交叉验证（例如问题同时涉及事业和求财）。',
  schema: z.object({
    eventType: eventTypeEnum.optional().describe('要分析的事类，缺省为当前问题的事类'),
  }),
  run: (input, ctx) => {
    const eventType = input.eventType ?? ctx.eventType;
    const r = analyzeYongShen(ctx.chart, eventType);
    const lines: string[] = [];

    lines.push(`【${eventType} 用神分析】`);
    lines.push(`分析要点：${EVENT_TEMPLATES[eventType].analysisGuide}`);
    lines.push('');
    lines.push('用神落宫：');
    for (const loc of r.locations) {
      const where = loc.palace === null ? '未定位' : `${loc.palaceName}${loc.palace}宫(${loc.palaceWuxing})`;
      lines.push(
        `- ${loc.role.label}[${loc.role.type}:${loc.role.target || loc.role.targetSource}] 权重${loc.role.weight} → ${where}` +
        ` | ${loc.fortune} 评分${loc.score} | ${loc.summary}`
      );
    }

    if (r.relations.length > 0) {
      lines.push('');
      lines.push('用神关系：');
      for (const rel of r.relations) {
        lines.push(`- ${rel.from} ↔ ${rel.to}：${rel.relation}（${rel.fortune}）`);
      }
    }

    lines.push('');
    lines.push(`规则引擎判定：tier=${r.tier}，信号一致性=${r.coherence}`);
    lines.push(`一句话结论：${r.headline}`);
    lines.push('');
    lines.push('详细结论：');
    lines.push(r.conclusion);

    return lines.join('\n');
  },
});

// ─── 格局与克应 ──────────────────────────────────────────────────────────────

export const detectPatternsTool = defineTool({
  name: 'detect_patterns',
  description:
    '全盘扫描：吉格/凶格检测、九宫十干克应、八门旺相休囚死、门加宫、门加三奇六仪。' +
    '用于补充用神分析之外的全局信息，尤其是判断有没有"青龙返首""白虎猖狂"这类会改变大势的格局。',
  schema: z.object({
    onlyNotable: z.boolean().optional().describe('true 时只返回吉凶明确的项，过滤掉"平"，默认 true'),
  }),
  run: (input, ctx) => {
    const onlyNotable = input.onlyNotable ?? true;
    const r = interpretChart(ctx.chart);
    const lines: string[] = [];

    lines.push('【格局】');
    if (r.patterns.length === 0) {
      lines.push('（未检测到已收录的格局）');
    } else {
      for (const p of r.patterns) {
        const loc = p.palace ? `${PALACE_NAMES[p.palace - 1]}${p.palace}宫` : '全盘';
        lines.push(`- ${p.name}（${p.type}）@${loc}：${p.description}`);
      }
    }

    lines.push('');
    lines.push('【十干克应】');
    for (let i = 0; i < r.ganInteractions.length; i++) {
      const gi = r.ganInteractions[i];
      if (onlyNotable && gi.fortune === '平') continue;
      lines.push(`- ${PALACE_NAMES[i]}${i + 1}宫 天${gi.tianGan}地${gi.diGan} → ${gi.name}（${gi.fortune}）：${gi.meaning}`);
    }

    lines.push('');
    lines.push('【八门旺衰】（节气五行：' + (JIEQI_WUXING[ctx.chart.jieQi] ?? '?') + '）');
    for (const gv of r.gateVitality) {
      lines.push(`- ${gv.gate}门@${PALACE_NAMES[gv.palace - 1]}${gv.palace}宫：${gv.vitality}`);
    }

    const gp = onlyNotable ? r.gatePalace.filter(x => x.fortune !== '平') : r.gatePalace;
    if (gp.length > 0) {
      lines.push('');
      lines.push('【门加宫】');
      for (const x of gp) {
        lines.push(`- ${x.gate}门加${PALACE_NAMES[x.palace - 1]}${x.palace}宫：${x.relation}（${x.fortune}）${x.meaning}`);
      }
    }

    const gs = onlyNotable ? r.gateStem.filter(x => x.fortune !== '平') : r.gateStem;
    if (gs.length > 0) {
      lines.push('');
      lines.push('【门加三奇六仪】');
      for (const x of gs) {
        lines.push(`- ${x.gate}门加${x.stem}：（${x.fortune}）${x.meaning}`);
      }
    }

    return lines.join('\n');
  },
});

// ─── 单宫细查 ────────────────────────────────────────────────────────────────

export const inspectPalaceTool = defineTool({
  name: 'inspect_palace',
  description:
    '查看某一宫的全部细节：天地盘干、九星、八门、八神、空亡、宫位五行、门的季节旺衰、该宫十干克应。' +
    '当你需要确认某个用神落宫的具体状态时调用，不要凭印象描述宫位内容。',
  schema: z.object({
    palace: z.number().int().min(1).max(9).describe('宫位编号 1-9（洛书数）'),
  }),
  run: (input, ctx) => {
    const idx = input.palace as PalaceIndex;
    const p = ctx.chart.palaces[idx];
    const seasonWx = JIEQI_WUXING[ctx.chart.jieQi];
    const gateWx = GATE_WUXING[p.gate];
    const vitality = gateWx && seasonWx ? getVitality(gateWx, seasonWx) : '不适用';
    const gi = lookupGanInteraction(p.tianPanGan, p.diPanGan);

    return [
      `【${p.name}${idx}宫】五行：${PALACE_WUXING[idx]}${p.isEmpty ? '  ⚠ 落空亡' : ''}`,
      `天盘干：${p.tianPanGan}　地盘干：${p.diPanGan}${p.anGan ? `　暗干：${p.anGan}` : ''}`,
      `九星：${p.star}（本性${STAR_FORTUNE[p.star]}）`,
      `八门：${p.gate}门（本性${GATE_FORTUNE[p.gate]}，五行${gateWx}，当令${vitality}）`,
      `八神：${p.deity}`,
      `十干克应：${gi.name}（${gi.fortune}）— ${gi.meaning}`,
      idx === (ctx.chart.maStar ?? -1) ? '马星在此宫' : '',
    ].filter(Boolean).join('\n');
  },
});

// ─── 婚姻专项 ────────────────────────────────────────────────────────────────

export const analyzeMarriageTool = defineTool({
  name: 'analyze_marriage',
  description:
    '婚姻感情专项分析：男女双方（庚/乙）画像与落宫状态、乙庚合冲关系、媒人（六合）倾向、' +
    '第三者（丙/丁）介入迹象。只在事类为「婚姻感情」时调用。',
  schema: z.object({}),
  run: (_input, ctx) => {
    const r = analyzeMarriage(ctx.chart);
    const person = (x: typeof r.female) =>
      `${x.label}(${x.gan})：${x.palace === null ? '未定位' : `${x.palaceName}${x.palace}宫(${x.palaceWuxing})`}` +
      `${x.isEmpty ? ' 空亡' : ''} ${x.star}/${x.gate}门/${x.deity} 评分${x.fortuneScore}\n` +
      `  性格：${x.traits.personality}；外貌：${x.traits.appearance}；职业：${x.traits.career}`;

    const lines = [
      `【婚姻专项】tier=${r.tier}　${r.headline}`,
      `匹配度：${r.compatibility}`,
      person(r.female),
      person(r.male),
      `媒人：${r.matchmaker.palace === null ? '未现' : `${r.matchmaker.palaceName}${r.matchmaker.palace}宫`}，倾向${r.matchmaker.favors} — ${r.matchmaker.description}`,
    ];

    if (r.thirdParties.length > 0) {
      lines.push('第三者迹象：');
      for (const t of r.thirdParties) {
        lines.push(`- ${t.label}@${t.palace === null ? '未现' : `${t.palaceName}${t.palace}宫`}，威胁${t.threatsWho ?? '无'} — ${t.description}`);
      }
    }
    if (r.details.length > 0) {
      lines.push('细节：');
      for (const d of r.details) lines.push(`- ${d}`);
    }

    return lines.join('\n');
  },
});
