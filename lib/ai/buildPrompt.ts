/**
 * Claude API prompt 构造
 *
 * 将 QimenChart 和 InterpretationResult 序列化为结构化 prompt
 */

import type { QimenChart, Pattern, GanInteraction } from '@/lib/qimen/types';
import type { InterpretationResult } from '@/lib/qimen/interpretation/interpreter';
import { PALACE_NAMES, PALACE_WUXING } from '@/lib/qimen/constants';
import type { PalaceIndex } from '@/lib/qimen/constants';

export type EventType = '求财' | '事业' | '婚姻' | '出行' | '健康' | '综合';

export const EVENT_TYPES: EventType[] = ['综合', '求财', '事业', '婚姻', '出行', '健康'];

/**
 * 精简版系统提示（给小模型用，减少 token 消耗）
 */
export function buildCompactSystemPrompt(): string {
  return `你是奇门遁甲分析师。根据盘面信息，结合用户问题，给出简明的吉凶判断和建议。用通俗语言回答，控制在300字以内。`;
}

/**
 * 精简版用户消息（给小模型用）
 */
export function buildCompactUserMessage(
  chart: QimenChart,
  interpretation: InterpretationResult,
  options: { question?: string; eventType?: EventType },
): string {
  const lines: string[] = [];

  // 只保留关键信息
  lines.push(`${chart.dunType}${chart.juNumber}局，${chart.yuan}，${chart.jieQi}`);
  lines.push(`值符${chart.zhiFu}，值使${chart.zhiShi}门`);

  // 格局（只列名称）
  if (interpretation.patterns.length > 0) {
    const names = interpretation.patterns.map(p => `${p.name}(${p.type})`).join('、');
    lines.push(`格局：${names}`);
  }

  // 关键克应（只列吉凶）
  const ji = interpretation.ganInteractions.filter(gi => gi.fortune === '吉');
  const xiong = interpretation.ganInteractions.filter(gi => gi.fortune === '凶');
  if (ji.length > 0) lines.push(`吉：${ji.map(g => g.name).join('、')}`);
  if (xiong.length > 0) lines.push(`凶：${xiong.map(g => g.name).join('、')}`);

  lines.push('');
  if (options.question) {
    lines.push(`问题：${options.question}`);
    lines.push('请针对此问题分析吉凶并给出建议。');
  } else {
    lines.push(`请分析【${options.eventType || '综合'}】方面的吉凶。`);
  }

  return lines.join('\n');
}

/**
 * 序列化盘面为文本
 */
export function serializeChart(chart: QimenChart): string {
  const lines: string[] = [];

  // 基本信息
  lines.push(`【基本信息】`);
  lines.push(`${chart.dunType}${chart.juNumber}局 · ${chart.yuan} · 节气：${chart.jieQi}`);
  lines.push(`四柱：${chart.siZhu.year.gan}${chart.siZhu.year.zhi}年 ${chart.siZhu.month.gan}${chart.siZhu.month.zhi}月 ${chart.siZhu.day.gan}${chart.siZhu.day.zhi}日 ${chart.siZhu.hour.gan}${chart.siZhu.hour.zhi}时`);
  lines.push(`值符：${chart.zhiFu}  值使：${chart.zhiShi}门`);
  lines.push(`旬首：${chart.xunShou}  空亡：${chart.kongWang.join('、')}`);
  lines.push('');

  // 九宫盘面
  lines.push(`【九宫盘面】`);
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    const p = chart.palaces[idx];
    const name = PALACE_NAMES[idx - 1];
    const wx = PALACE_WUXING[idx];
    const empty = p.isEmpty ? ' [空亡]' : '';
    lines.push(
      `${name}${idx}宫(${wx}): 天盘${p.tianPanGan} 地盘${p.diPanGan} | ${p.star} | ${p.gate}门 | ${p.deity}${empty}`
    );
  }

  return lines.join('\n');
}

/**
 * 构建系统提示
 */
export function buildSystemPrompt(beginnerMode: boolean): string {
  const base = `你是一位精通奇门遁甲的专业分析师。用户会提供一个已经排好的奇门遁甲盘面数据和他们的问题。

你必须严格基于提供的盘面数据进行分析，不要编造盘面中不存在的信息。

分析步骤：
1. 先看值符（当值九星）和值使（当值八门）分别落在哪个宫位，状态如何
2. 根据用户的问题确定用神，找到用神所在宫位
3. 分析该宫位的天盘干、地盘干组合（十干克应），以及九星、八门、八神的配合
4. 参考已检测到的格局（吉格/凶格）
5. 综合以上信息，给出针对用户问题的具体判断和建议

关键规则：
- 分析时必须引用盘面中的具体数据（如"天心星落坎一宫"、"开门配天盘丙"等）
- 不要泛泛而谈，要结合具体宫位和符号组合进行分析`;

  if (beginnerMode) {
    return base + `

【重要】用户是奇门遁甲初学者。请在分析时：
- 每一步都解释"为什么"这样判断
- 用通俗易懂的语言解释专业术语
- 分步骤展示你的推理过程（先看什么→再看什么→最后综合）
- 在关键判断处标注依据（如"因为开门属金，落在离九宫属火，火克金，所以门迫"）`;
  }

  return base + '\n\n请直接给出分析结论，附简要依据。';
}

/**
 * 构建用户消息
 *
 * question: 用户的原始问题（问事起盘模式）
 * eventType: 事件分类（手动模式下使用，可选）
 */
export function buildUserMessage(
  chart: QimenChart,
  interpretation: InterpretationResult,
  options: { question?: string; eventType?: EventType },
): string {
  const lines: string[] = [];

  lines.push('<chart_data>');
  lines.push(serializeChart(chart));
  lines.push('</chart_data>');
  lines.push('');

  // 已检测的格局
  if (interpretation.patterns.length > 0) {
    lines.push('<detected_patterns>');
    for (const p of interpretation.patterns) {
      const loc = p.palace ? `在${PALACE_NAMES[p.palace - 1]}${p.palace}宫` : '（全盘）';
      lines.push(`- ${p.name}（${p.type}）${loc}：${p.description}`);
    }
    lines.push('</detected_patterns>');
    lines.push('');
  }

  // 十干克应摘要（只列出吉凶的）
  const notable = interpretation.ganInteractions.filter(gi => gi.fortune !== '平');
  if (notable.length > 0) {
    lines.push('<gan_interactions>');
    for (const gi of notable) {
      lines.push(`- ${gi.name}（${gi.fortune}）：${gi.meaning}`);
    }
    lines.push('</gan_interactions>');
    lines.push('');
  }

  if (options.question) {
    lines.push(`<user_question>${options.question}</user_question>`);
    lines.push('');
    lines.push('请严格基于上面提供的盘面数据，针对用户的问题进行分析。分析时必须引用盘面中的具体宫位、星、门、干等数据，不要脱离盘面空谈。');
  } else {
    lines.push(`请严格基于上面提供的盘面数据，针对【${options.eventType || '综合'}】事宜进行分析。分析时必须引用盘面中的具体数据。`);
  }

  return lines.join('\n');
}
