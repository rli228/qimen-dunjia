/**
 * 规则解盘文字生成器 — 不依赖 AI，纯规则驱动
 *
 * 根据 InterpretationResult 和 QimenChart 生成结构化文字解读
 */

import type { QimenChart, Pattern, GanInteraction } from '../types';
import type { PalaceIndex } from '../constants';
import { PALACE_NAMES, PALACE_WUXING, GATE_FORTUNE, STAR_FORTUNE } from '../constants';
import type { InterpretationResult, GateVitalityResult, GatePalaceResult, GateStemResult } from './interpreter';

interface TextSection {
  title: string;
  content: string;
}

/**
 * 生成完整的规则解盘文字
 */
export function generateInterpretationText(
  chart: QimenChart,
  result: InterpretationResult,
): TextSection[] {
  const sections: TextSection[] = [];

  sections.push(buildOverview(chart));
  sections.push(buildZhiFuZhiShi(chart, result));
  sections.push(buildPatternSection(result.patterns));
  sections.push(buildKeyGanInteractions(result.ganInteractions));
  sections.push(buildGateVitalitySection(result.gateVitality));
  sections.push(buildGatePalaceSection(result.gatePalace));
  sections.push(buildGateStemSection(result.gateStem));
  sections.push(buildSummary(chart, result));

  return sections;
}

// ─── 总览 ────────────────────────────────────────────────────────────────────

function buildOverview(chart: QimenChart): TextSection {
  const lines: string[] = [];
  lines.push(`此盘为${chart.dunType}${chart.juNumber}局，${chart.yuan}，节气${chart.jieQi}。`);
  lines.push(`四柱：${chart.siZhu.year.gan}${chart.siZhu.year.zhi}年 ${chart.siZhu.month.gan}${chart.siZhu.month.zhi}月 ${chart.siZhu.day.gan}${chart.siZhu.day.zhi}日 ${chart.siZhu.hour.gan}${chart.siZhu.hour.zhi}时。`);
  lines.push(`旬首${chart.xunShou}，空亡${chart.kongWang.join('、')}。`);
  return { title: '盘面总览', content: lines.join('') };
}

// ─── 值符值使 ────────────────────────────────────────────────────────────────

function buildZhiFuZhiShi(chart: QimenChart, result: InterpretationResult): TextSection {
  const lines: string[] = [];

  // 找到值符落宫
  const zhiFuPalace = findStarPalace(chart, chart.zhiFu);
  // 找到值使门落宫
  const zhiShiPalace = findGatePalace(chart, chart.zhiShi);

  const starFortune = STAR_FORTUNE[chart.zhiFu];
  lines.push(`值符${chart.zhiFu}（${starFortune}星）`);
  if (zhiFuPalace) {
    const name = PALACE_NAMES[zhiFuPalace - 1];
    const wx = PALACE_WUXING[zhiFuPalace];
    const p = chart.palaces[zhiFuPalace];
    lines.push(`落${name}${zhiFuPalace}宫（${wx}），天盘${p.tianPanGan}加地盘${p.diPanGan}。`);
  }

  const gateFortune = GATE_FORTUNE[chart.zhiShi];
  lines.push(`值使${chart.zhiShi}门（${gateFortune === '吉' ? '吉门' : gateFortune === '凶' ? '凶门' : '中平'}）`);
  if (zhiShiPalace) {
    const name = PALACE_NAMES[zhiShiPalace - 1];
    const wx = PALACE_WUXING[zhiShiPalace];
    lines.push(`落${name}${zhiShiPalace}宫（${wx}）。`);

    // 查值使门的旺相休囚死
    const vit = result.gateVitality.find(v => v.gate === chart.zhiShi);
    if (vit) {
      lines.push(`值使门当令状态为「${vit.vitality}」。`);
      lines.push(vitalityExplain(vit.vitality));
    }
  }

  return { title: '值符值使', content: lines.join('') };
}

// ─── 格局 ────────────────────────────────────────────────────────────────────

function buildPatternSection(patterns: Pattern[]): TextSection {
  if (patterns.length === 0) {
    return { title: '格局判断', content: '本盘未检测到特殊吉凶格局，整体较为平稳。' };
  }

  const ji = patterns.filter(p => p.type === '吉格');
  const xiong = patterns.filter(p => p.type === '凶格');

  const lines: string[] = [];

  if (ji.length > 0) {
    lines.push(`检测到${ji.length}个吉格：`);
    for (const p of ji) {
      const loc = p.palace ? `${PALACE_NAMES[p.palace - 1]}${p.palace}宫` : '全盘';
      lines.push(`• ${p.name}（${loc}）— ${p.description}。`);
    }
  }

  if (xiong.length > 0) {
    if (ji.length > 0) lines.push('');
    lines.push(`检测到${xiong.length}个凶格：`);
    for (const p of xiong) {
      const loc = p.palace ? `${PALACE_NAMES[p.palace - 1]}${p.palace}宫` : '全盘';
      lines.push(`• ${p.name}（${loc}）— ${p.description}。`);
    }
  }

  // 综合评语
  lines.push('');
  if (ji.length > 0 && xiong.length === 0) {
    lines.push('格局整体偏吉，利于行动。');
  } else if (xiong.length > 0 && ji.length === 0) {
    lines.push('格局整体偏凶，宜谨慎行事，暂缓大的决策。');
  } else {
    lines.push('吉凶格局并存，需结合具体宫位和用神综合判断。');
  }

  return { title: '格局判断', content: lines.join('\n') };
}

// ─── 关键十干克应 ────────────────────────────────────────────────────────────

function buildKeyGanInteractions(interactions: GanInteraction[]): TextSection {
  const ji = interactions.filter(gi => gi.fortune === '吉');
  const xiong = interactions.filter(gi => gi.fortune === '凶');

  const lines: string[] = [];

  if (ji.length > 0) {
    lines.push('吉利克应：');
    for (const gi of ji) {
      lines.push(`• ${gi.name}（${gi.tianGan}加${gi.diGan}）— ${gi.meaning}。`);
    }
  }

  if (xiong.length > 0) {
    if (ji.length > 0) lines.push('');
    lines.push('凶险克应：');
    for (const gi of xiong) {
      lines.push(`• ${gi.name}（${gi.tianGan}加${gi.diGan}）— ${gi.meaning}。`);
    }
  }

  if (ji.length === 0 && xiong.length === 0) {
    lines.push('本盘十干克应均为中平，无特别显著的吉凶信号。');
  }

  return { title: '十干克应', content: lines.join('\n') };
}

// ─── 八门旺相休囚死 ──────────────────────────────────────────────────────────

function buildGateVitalitySection(vitality: GateVitalityResult[]): TextSection {
  if (vitality.length === 0) {
    return { title: '八门状态', content: '无法计算当令八门状态。' };
  }

  // 按旺相休囚死分组
  const grouped: Record<string, GateVitalityResult[]> = {};
  for (const v of vitality) {
    if (!grouped[v.vitality]) grouped[v.vitality] = [];
    grouped[v.vitality].push(v);
  }

  const lines: string[] = [];
  const order = ['旺', '相', '休', '囚', '死'] as const;
  for (const state of order) {
    const items = grouped[state];
    if (!items) continue;
    const desc = items.map(v => `${v.gate}门（${PALACE_NAMES[v.palace - 1]}${v.palace}宫）`).join('、');
    lines.push(`${state}：${desc}`);
  }

  lines.push('');
  lines.push('旺、相为得时，力量强；休为平；囚、死为失时，力量弱。');

  // 三吉门状态
  const sanJi = vitality.filter(v => ['开', '休', '生'].includes(v.gate));
  const sanJiWang = sanJi.filter(v => v.vitality === '旺' || v.vitality === '相');
  if (sanJiWang.length >= 2) {
    lines.push(`三吉门中有${sanJiWang.length}门得时，整体格局偏利。`);
  }

  return { title: '八门状态', content: lines.join('\n') };
}

// ─── 门加宫 ──────────────────────────────────────────────────────────────────

function buildGatePalaceSection(gatePalace: GatePalaceResult[]): TextSection {
  if (gatePalace.length === 0) {
    return { title: '门加宫', content: '无门加宫数据。' };
  }

  const ji = gatePalace.filter(g => g.fortune === '吉');
  const xiong = gatePalace.filter(g => g.fortune === '凶');

  const lines: string[] = [];

  if (ji.length > 0) {
    lines.push('吉利组合：');
    for (const g of ji) {
      lines.push(`• ${g.gate}门+${PALACE_NAMES[g.palace - 1]}${g.palace}宫（${g.relation}）— ${g.meaning}`);
    }
  }

  if (xiong.length > 0) {
    if (ji.length > 0) lines.push('');
    lines.push('不利组合：');
    for (const g of xiong) {
      lines.push(`• ${g.gate}门+${PALACE_NAMES[g.palace - 1]}${g.palace}宫（${g.relation}）— ${g.meaning}`);
    }
  }

  if (ji.length === 0 && xiong.length === 0) {
    lines.push('门加宫关系整体平稳，无特别显著的吉凶。');
  }

  return { title: '门加宫', content: lines.join('\n') };
}

// ─── 门加三奇六仪 ────────────────────────────────────────────────────────────

function buildGateStemSection(gateStem: GateStemResult[]): TextSection {
  if (gateStem.length === 0) {
    return { title: '门加三奇六仪', content: '无门加干数据。' };
  }

  const ji = gateStem.filter(g => g.fortune === '吉');
  const xiong = gateStem.filter(g => g.fortune === '凶');

  const lines: string[] = [];

  if (ji.length > 0) {
    lines.push('吉利组合：');
    for (const g of ji) {
      lines.push(`• ${g.gate}门+${g.stem} — ${g.meaning}`);
    }
  }

  if (xiong.length > 0) {
    if (ji.length > 0) lines.push('');
    lines.push('不利组合：');
    for (const g of xiong) {
      lines.push(`• ${g.gate}门+${g.stem} — ${g.meaning}`);
    }
  }

  if (ji.length === 0 && xiong.length === 0) {
    lines.push('门加干关系整体平稳，无特别显著的吉凶。');
  }

  return { title: '门加三奇六仪', content: lines.join('\n') };
}

// ─── 综合判断 ────────────────────────────────────────────────────────────────

function buildSummary(chart: QimenChart, result: InterpretationResult): TextSection {
  const lines: string[] = [];
  let score = 0; // 简易吉凶评分

  // 格局加分
  const jiPatterns = result.patterns.filter(p => p.type === '吉格').length;
  const xiongPatterns = result.patterns.filter(p => p.type === '凶格').length;
  score += jiPatterns * 2;
  score -= xiongPatterns * 2;

  // 十干克应加分
  const jiGan = result.ganInteractions.filter(gi => gi.fortune === '吉').length;
  const xiongGan = result.ganInteractions.filter(gi => gi.fortune === '凶').length;
  score += jiGan;
  score -= xiongGan;

  // 值符值使加分
  const starF = STAR_FORTUNE[chart.zhiFu];
  if (starF === '大吉' || starF === '吉') score += 1;
  if (starF === '大凶' || starF === '凶') score -= 1;

  const gateF = GATE_FORTUNE[chart.zhiShi];
  if (gateF === '吉') score += 1;
  if (gateF === '凶') score -= 1;

  // 门加宫加分
  const jiGatePalace = result.gatePalace.filter(g => g.fortune === '吉').length;
  const xiongGatePalace = result.gatePalace.filter(g => g.fortune === '凶').length;
  score += Math.floor(jiGatePalace / 2);
  score -= Math.floor(xiongGatePalace / 2);

  // 门加干加分
  const jiGateStem = result.gateStem.filter(g => g.fortune === '吉').length;
  const xiongGateStem = result.gateStem.filter(g => g.fortune === '凶').length;
  score += Math.floor(jiGateStem / 2);
  score -= Math.floor(xiongGateStem / 2);

  // 值使门旺相加分
  const zhiShiVit = result.gateVitality.find(v => v.gate === chart.zhiShi);
  if (zhiShiVit) {
    if (zhiShiVit.vitality === '旺' || zhiShiVit.vitality === '相') score += 1;
    if (zhiShiVit.vitality === '囚' || zhiShiVit.vitality === '死') score -= 1;
  }

  // 空亡减分
  const emptyPalaces = Object.values(chart.palaces).filter(p => p.isEmpty);
  if (emptyPalaces.length > 0) {
    lines.push(`注意：${emptyPalaces.map(p => PALACE_NAMES[p.index - 1] + p.index + '宫').join('、')}落空亡，该宫位所主之事力量减弱。`);
  }

  // 综合评语
  lines.push('');
  if (score >= 4) {
    lines.push('【综合判断】此盘整体偏吉，利于行动、求谋。格局吉利因素较多，可积极把握机会。');
  } else if (score >= 1) {
    lines.push('【综合判断】此盘小吉，有利因素略多于不利。可以行动但需注意防范风险。');
  } else if (score >= -1) {
    lines.push('【综合判断】此盘吉凶参半，形势不明朗。建议谨慎行事，观望为主，不宜冒进。');
  } else if (score >= -4) {
    lines.push('【综合判断】此盘偏凶，不利因素较多。宜守不宜攻，暂缓重大决策，等待时机。');
  } else {
    lines.push('【综合判断】此盘大凶，多重凶格凶应叠加。强烈建议暂停行动，静待转机。');
  }

  return { title: '综合判断', content: lines.join('\n') };
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

function findStarPalace(chart: QimenChart, star: string): PalaceIndex | null {
  for (let i = 1; i <= 9; i++) {
    if (chart.palaces[i as PalaceIndex].star === star) return i as PalaceIndex;
  }
  return null;
}

function findGatePalace(chart: QimenChart, gate: string): PalaceIndex | null {
  for (let i = 1; i <= 9; i++) {
    const p = chart.palaces[i as PalaceIndex];
    if (i !== 5 && p.gate === gate) return i as PalaceIndex;
  }
  return null;
}

function vitalityExplain(v: string): string {
  switch (v) {
    case '旺': return '值使门当令得旺，力量最强，所主之事顺遂有力。';
    case '相': return '值使门得相，力量较强，事情发展较为顺利。';
    case '休': return '值使门处休态，力量平平，事情发展需要时间。';
    case '囚': return '值使门受囚，力量受困，事情推进困难，宜等待。';
    case '死': return '值使门处死地，力量最弱，事情难以成就，不宜妄动。';
    default: return '';
  }
}
