/**
 * 特征提取器
 *
 * 将 QimenChart → ChartFeatures（结构化特征向量）
 * 将 QimenChart → ChartSnapshot（完整快照，可重建盘面）
 *
 * 特征设计：
 * - 全部离散/有限值，适合树模型
 * - 编号索引便于 one-hot 编码
 * - 保持可解释性：每个特征都能映射回传统术语
 */

import type { QimenChart } from '../types';
import type { PalaceIndex } from '../constants';
import {
  SAN_QI_LIU_YI,
  STAR_NAMES,
  GATE_NAMES,
  DEITY_NAMES_YANG,
  JIE_QI,
} from '../constants';
import { analyzeYongShen } from '../interpretation/yongShenAnalysis';
import type { EventTypeKey } from '../interpretation/data/yongShen';
import type {
  ChartSnapshot,
  PalaceSnapshot,
  ChartFeatures,
  PalaceFeatureRow,
  SystemPrediction,
} from './schema';

// ─── 索引查找表 ──────────────────────────────────────────────────────────────

const SAN_QI_INDEX = Object.fromEntries(SAN_QI_LIU_YI.map((g, i) => [g, i]));
const STAR_INDEX = Object.fromEntries(STAR_NAMES.map((s, i) => [s, i]));
const GATE_INDEX = Object.fromEntries(
  GATE_NAMES.filter(g => g !== '中').map((g, i) => [g, i])
);
const DEITY_INDEX: Record<string, number> = {};
[...DEITY_NAMES_YANG, '勾陈' as const, '朱雀' as const].forEach((d, i) => {
  if (!(d in DEITY_INDEX)) DEITY_INDEX[d] = i;
});
const JIEQI_INDEX = Object.fromEntries(JIE_QI.map((j, i) => [j, i]));

// ─── 盘面快照 ────────────────────────────────────────────────────────────────

export function extractSnapshot(chart: QimenChart): ChartSnapshot {
  const palaces: PalaceSnapshot[] = [];
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    const p = chart.palaces[idx];
    palaces.push({
      index: idx,
      diPanGan: p.diPanGan,
      tianPanGan: p.tianPanGan,
      star: p.star,
      gate: p.gate,
      deity: p.deity,
      isEmpty: p.isEmpty,
    });
  }

  return {
    jieQi: chart.jieQi,
    yuan: chart.yuan,
    dunType: chart.dunType,
    juNumber: chart.juNumber,
    zhiFu: chart.zhiFu,
    zhiShi: chart.zhiShi,
    xunShou: chart.xunShou,
    kongWang: [...chart.kongWang],
    siZhu: {
      year: chart.siZhu.year.gan + chart.siZhu.year.zhi,
      month: chart.siZhu.month.gan + chart.siZhu.month.zhi,
      day: chart.siZhu.day.gan + chart.siZhu.day.zhi,
      hour: chart.siZhu.hour.gan + chart.siZhu.hour.zhi,
    },
    palaces,
  };
}

// ─── 结构化特征 ──────────────────────────────────────────────────────────────

export function extractFeatures(
  chart: QimenChart,
  eventType: EventTypeKey,
): ChartFeatures {
  // 宫位特征
  const palaceFeatures: PalaceFeatureRow[] = [];
  let kongWangCount = 0;

  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    const p = chart.palaces[idx];
    if (p.isEmpty) kongWangCount++;

    palaceFeatures.push({
      index: idx,
      diPanGanIndex: SAN_QI_INDEX[p.diPanGan] ?? -1,
      tianPanGanIndex: SAN_QI_INDEX[p.tianPanGan] ?? -1,
      starIndex: STAR_INDEX[p.star] ?? -1,
      gateIndex: GATE_INDEX[p.gate] ?? -1,
      deityIndex: DEITY_INDEX[p.deity] ?? -1,
      isEmpty: p.isEmpty ? 1 : 0,
    });
  }

  // 用神分析结果
  const ysResult = analyzeYongShen(chart, eventType);

  const yongShenScores = ysResult.locations.map(l => l.score);
  const yongShenPalaces = ysResult.locations.map(l => l.palace ?? -1);
  const yongShenRelationScores = ysResult.relations.map(r =>
    r.fortune === '吉' ? 1 : r.fortune === '凶' ? -1 : 0
  );

  // 加权总分
  let weightedScore = 0;
  let totalWeight = 0;
  for (const loc of ysResult.locations) {
    if (loc.palace !== null) {
      weightedScore += loc.role.weight * loc.score;
      totalWeight += loc.role.weight;
    }
  }
  for (const rel of ysResult.relations) {
    if (rel.fortune === '吉') weightedScore += 1;
    else if (rel.fortune === '凶') weightedScore -= 1;
  }

  const coherenceMap = { '强': 2, '中': 1, '弱': 0 } as const;

  return {
    dunType: chart.dunType === '阳遁' ? 1 : 0,
    juNumber: chart.juNumber,
    jieQiIndex: JIEQI_INDEX[chart.jieQi] ?? -1,
    zhiFuIndex: STAR_INDEX[chart.zhiFu] ?? -1,
    zhiShiIndex: GATE_INDEX[chart.zhiShi] ?? -1,
    kongWangCount,
    palaceFeatures,
    yongShenScores,
    yongShenPalaces,
    yongShenRelationScores,
    weightedScore,
    coherence: coherenceMap[ysResult.coherence],
    auspiciousPatternCount: 0,  // TODO: 接入格局检测
    inauspiciousPatternCount: 0,
  };
}

// ─── 系统预测输出 ─────────────────────────────────────────────────────────────

export function extractPrediction(
  chart: QimenChart,
  eventType: EventTypeKey,
): SystemPrediction {
  const result = analyzeYongShen(chart, eventType);

  // 从结论第一行提取 tier
  const firstLine = result.conclusion.split('\n')[0];
  let tier = '平';
  if (firstLine.includes('多项因素利') || firstLine.includes('生机旺盛') || firstLine.includes('寻回可能性较大')) tier = '大吉';
  else if (firstLine.includes('尚可') || firstLine.includes('有一定') || firstLine.includes('略占优势')) tier = '小吉';
  else if (firstLine.includes('欠佳') || firstLine.includes('一定阻碍') || firstLine.includes('一定劣势')) tier = '小凶';
  else if (firstLine.includes('多处受克失令') || firstLine.includes('多处不利')) tier = '大凶';
  else if (firstLine.includes('吉凶参半') || firstLine.includes('势均力敌') || firstLine.includes('实力接近')) tier = '平';

  return {
    tier,
    coherence: result.coherence,
    conclusion: result.conclusion,
  };
}
