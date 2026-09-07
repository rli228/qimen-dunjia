/**
 * 解盘主函数 — 组合十干克应、格局判断、八门旺相休囚死
 */

import type { QimenChart, Pattern, GanInteraction } from '../types';
import type { PalaceIndex, GateName, JieQi } from '../constants';
import { lookupGanInteraction } from './data/ganInteractions';
import { GATE_WUXING, JIEQI_WUXING, getVitality, type Vitality } from './data/gateWuxing';
import { AUSPICIOUS_PATTERNS } from './data/patternsAuspicious';
import { INAUSPICIOUS_PATTERNS } from './data/patternsInauspicious';
import { GATE_PALACE_DATA, GATE_STEM_DATA } from './data/gateInteractions';

// ─── 结果类型 ────────────────────────────────────────────────────────────────

export interface GateVitalityResult {
  gate: Exclude<GateName, '中'>;
  palace: PalaceIndex;
  vitality: Vitality;
}

export interface GatePalaceResult {
  gate: Exclude<GateName, '中'>;
  palace: PalaceIndex;
  palaceName: string;
  relation: string;
  fortune: '吉' | '凶' | '平';
  meaning: string;
}

export interface GateStemResult {
  gate: Exclude<GateName, '中'>;
  stem: string;
  palace: PalaceIndex;
  fortune: '吉' | '凶' | '平';
  meaning: string;
}

export interface InterpretationResult {
  ganInteractions: GanInteraction[];
  patterns: Pattern[];
  gateVitality: GateVitalityResult[];
  gatePalace: GatePalaceResult[];
  gateStem: GateStemResult[];
}

// ─── 十干克应检测 ────────────────────────────────────────────────────────────

function getGanInteractions(chart: QimenChart): GanInteraction[] {
  const results: GanInteraction[] = [];
  for (let i = 1; i <= 9; i++) {
    const palace = chart.palaces[i as PalaceIndex];
    results.push(lookupGanInteraction(palace.tianPanGan, palace.diPanGan));
  }
  return results;
}

// ─── 格局检测 ────────────────────────────────────────────────────────────────

function detectPatterns(chart: QimenChart): Pattern[] {
  const allPatterns = [...AUSPICIOUS_PATTERNS, ...INAUSPICIOUS_PATTERNS];
  const results: Pattern[] = [];

  for (const patternDef of allPatterns) {
    const matchedPalaces = patternDef.detect(chart);
    if (matchedPalaces.length === 0) continue;

    if (patternDef.isChartWide) {
      // Chart-wide pattern: single entry with no specific palace
      results.push({
        name: patternDef.name,
        type: patternDef.type,
        palace: undefined,
        description: patternDef.description,
        tags: patternDef.tags,
      });
    } else {
      for (const palace of matchedPalaces) {
        results.push({
          name: patternDef.name,
          type: patternDef.type,
          palace,
          description: patternDef.description,
          tags: patternDef.tags,
        });
      }
    }
  }

  return results;
}

// ─── 八门旺相休囚死 ──────────────────────────────────────────────────────────

function getGateVitality(chart: QimenChart): GateVitalityResult[] {
  const seasonWuxing = JIEQI_WUXING[chart.jieQi];
  if (!seasonWuxing) return [];

  const results: GateVitalityResult[] = [];
  for (let i = 1; i <= 9; i++) {
    const palaceIdx = i as PalaceIndex;
    if (palaceIdx === 5) continue; // 中宫无门
    const palace = chart.palaces[palaceIdx];
    const gateWx = GATE_WUXING[palace.gate];
    if (!gateWx) continue;

    results.push({
      gate: palace.gate,
      palace: palaceIdx,
      vitality: getVitality(gateWx, seasonWuxing),
    });
  }

  return results;
}

// ─── 八门落宫克应 ──────────────────────────────────────────────────────────

function getGatePalaceInteractions(chart: QimenChart): GatePalaceResult[] {
  const results: GatePalaceResult[] = [];
  for (let i = 1; i <= 9; i++) {
    const palaceIdx = i as PalaceIndex;
    if (palaceIdx === 5) continue;
    const palace = chart.palaces[palaceIdx];
    const key = `${palace.gate}_${palaceIdx}`;
    const data = GATE_PALACE_DATA[key];
    if (data) {
      results.push({
        gate: palace.gate,
        palace: palaceIdx,
        palaceName: data.palaceName,
        relation: data.relation,
        fortune: data.fortune,
        meaning: data.meaning,
      });
    }
  }
  return results;
}

// ─── 门加三奇六仪 ──────────────────────────────────────────────────────────

function getGateStemInteractions(chart: QimenChart): GateStemResult[] {
  const results: GateStemResult[] = [];
  for (let i = 1; i <= 9; i++) {
    const palaceIdx = i as PalaceIndex;
    if (palaceIdx === 5) continue;
    const palace = chart.palaces[palaceIdx];
    // 门 + 天盘干
    const key = `${palace.gate}_${palace.tianPanGan}`;
    const data = GATE_STEM_DATA[key];
    if (data) {
      results.push({
        gate: palace.gate,
        stem: palace.tianPanGan,
        palace: palaceIdx,
        fortune: data.fortune,
        meaning: data.meaning,
      });
    }
  }
  return results;
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

export function interpretChart(chart: QimenChart): InterpretationResult {
  return {
    ganInteractions: getGanInteractions(chart),
    patterns: detectPatterns(chart),
    gateVitality: getGateVitality(chart),
    gatePalace: getGatePalaceInteractions(chart),
    gateStem: getGateStemInteractions(chart),
  };
}
