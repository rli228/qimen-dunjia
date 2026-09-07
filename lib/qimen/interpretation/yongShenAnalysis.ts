/**
 * 用神分析引擎
 *
 * 根据事类模板定位用神落宫，分析生克关系，给出结论
 */

import type { QimenChart } from '../types';
import type { PalaceIndex, GateName, StarName, SanQiLiuYi } from '../constants';
import { PALACE_NAMES, PALACE_WUXING, STAR_FORTUNE, GATE_FORTUNE } from '../constants';
import { GATE_WUXING, JIEQI_WUXING, getVitality } from './data/gateWuxing';
import type { EventTypeKey, YongShenRole } from './data/yongShen';
import { EVENT_TEMPLATES } from './data/yongShen';

// ─── 结果类型 ────────────────────────────────────────────────────────────────

export interface YongShenLocation {
  role: YongShenRole;
  palace: PalaceIndex | null;  // null = 未找到（中五宫寄坤二宫等）
  palaceName: string;
  palaceWuxing: string;
  summary: string;             // 该用神的状态总结
  fortune: '吉' | '凶' | '平';
}

export interface YongShenRelation {
  from: string;  // 角色A
  to: string;    // 角色B
  relation: string;  // 关系描述
  fortune: '吉' | '凶' | '平';
}

export interface YongShenResult {
  eventType: EventTypeKey;
  locations: YongShenLocation[];
  relations: YongShenRelation[];
  conclusion: string;
}

// ─── 五行生克 ────────────────────────────────────────────────────────────────

const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

const KE: Record<string, string> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

function describeWuxingRelation(wx1: string, name1: string, wx2: string, name2: string): { desc: string; fortune: '吉' | '凶' | '平' } {
  if (wx1 === wx2) return { desc: `${name1}与${name2}五行比和，关系和谐`, fortune: '吉' };
  if (SHENG[wx1] === wx2) return { desc: `${name1}(${wx1})生${name2}(${wx2})，${name1}泄气于${name2}`, fortune: '平' };
  if (SHENG[wx2] === wx1) return { desc: `${name2}(${wx2})生${name1}(${wx1})，${name1}得${name2}相生`, fortune: '吉' };
  if (KE[wx1] === wx2) return { desc: `${name1}(${wx1})克${name2}(${wx2})，${name1}制约${name2}`, fortune: '平' };
  if (KE[wx2] === wx1) return { desc: `${name2}(${wx2})克${name1}(${wx1})，${name1}受${name2}克制`, fortune: '凶' };
  return { desc: `${name1}与${name2}关系不明`, fortune: '平' };
}

// ─── 天干五行 ────────────────────────────────────────────────────────────────

const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};

// ─── 定位用神 ────────────────────────────────────────────────────────────────

function locateYongShen(chart: QimenChart, role: YongShenRole): YongShenLocation {
  let foundPalace: PalaceIndex | null = null;

  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    const p = chart.palaces[idx];

    if (role.type === 'gan') {
      // 优先匹配天盘干，其次地盘干
      if (p.tianPanGan === role.target || p.diPanGan === role.target) {
        foundPalace = idx;
        break;
      }
    } else if (role.type === 'gate') {
      if (idx !== 5 && p.gate === role.target) {
        foundPalace = idx;
        break;
      }
    } else if (role.type === 'star') {
      if (p.star === role.target) {
        foundPalace = idx;
        break;
      }
    }
  }

  if (!foundPalace) {
    return {
      role,
      palace: null,
      palaceName: '未定位',
      palaceWuxing: '',
      summary: `${role.label}（${role.target}）未在盘面中定位到`,
      fortune: '平',
    };
  }

  const palace = chart.palaces[foundPalace];
  const palaceName = `${PALACE_NAMES[foundPalace - 1]}${foundPalace}宫`;
  const palaceWx = PALACE_WUXING[foundPalace];

  // 评估该宫位的吉凶
  const factors: string[] = [];
  let fortuneScore = 0;

  // 空亡
  if (palace.isEmpty) {
    factors.push('落空亡，力量减弱');
    fortuneScore -= 2;
  }

  // 星吉凶
  const starF = STAR_FORTUNE[palace.star];
  if (starF === '大吉' || starF === '吉') {
    factors.push(`${palace.star}(${starF})`);
    fortuneScore += 1;
  } else if (starF === '大凶' || starF === '凶') {
    factors.push(`${palace.star}(${starF})`);
    fortuneScore -= 1;
  }

  // 门吉凶（跳过中5宫）
  if (foundPalace !== 5) {
    const gateF = GATE_FORTUNE[palace.gate];
    if (gateF === '吉') {
      factors.push(`${palace.gate}门(吉)`);
      fortuneScore += 1;
    } else if (gateF === '凶') {
      factors.push(`${palace.gate}门(凶)`);
      fortuneScore -= 1;
    }
  }

  // 门的旺衰
  if (foundPalace !== 5) {
    const seasonWx = JIEQI_WUXING[chart.jieQi];
    const gateWx = GATE_WUXING[palace.gate];
    if (seasonWx && gateWx) {
      const vitality = getVitality(gateWx, seasonWx);
      if (vitality === '旺' || vitality === '相') {
        factors.push(`门${vitality}`);
        fortuneScore += 1;
      } else if (vitality === '囚' || vitality === '死') {
        factors.push(`门${vitality}`);
        fortuneScore -= 1;
      }
    }
  }

  // 有无三奇（乙丙丁）
  const sanQi = ['乙', '丙', '丁'];
  if (sanQi.includes(palace.tianPanGan)) {
    factors.push(`得${palace.tianPanGan}奇`);
    fortuneScore += 1;
  }

  const fortune: '吉' | '凶' | '平' = fortuneScore >= 2 ? '吉' : fortuneScore <= -2 ? '凶' : '平';
  const summary = `${role.label}（${role.target}）落${palaceName}(${palaceWx})，天盘${palace.tianPanGan}地盘${palace.diPanGan}，${palace.star}、${palace.gate}门、${palace.deity}` +
    (factors.length > 0 ? `。${factors.join('，')}` : '');

  return { role, palace: foundPalace, palaceName, palaceWuxing: palaceWx, summary, fortune };
}

// ─── 分析用神关系 ────────────────────────────────────────────────────────────

function analyzeRelations(locations: YongShenLocation[]): YongShenRelation[] {
  const relations: YongShenRelation[] = [];
  const located = locations.filter(l => l.palace !== null);

  // 比较前两个主要用神之间的关系
  for (let i = 0; i < located.length; i++) {
    for (let j = i + 1; j < located.length; j++) {
      const a = located[i];
      const b = located[j];
      if (!a.palaceWuxing || !b.palaceWuxing) continue;

      const { desc, fortune } = describeWuxingRelation(
        a.palaceWuxing, `${a.role.label}宫`,
        b.palaceWuxing, `${b.role.label}宫`
      );
      relations.push({
        from: a.role.label,
        to: b.role.label,
        relation: desc,
        fortune,
      });
    }
  }

  return relations;
}

// ─── 生成结论 ────────────────────────────────────────────────────────────────

function generateConclusion(
  eventType: EventTypeKey,
  locations: YongShenLocation[],
  relations: YongShenRelation[],
): string {
  const template = EVENT_TEMPLATES[eventType];
  const lines: string[] = [];

  // 统计吉凶
  const jiCount = locations.filter(l => l.fortune === '吉').length + relations.filter(r => r.fortune === '吉').length;
  const xiongCount = locations.filter(l => l.fortune === '凶').length + relations.filter(r => r.fortune === '凶').length;
  const hasKongWang = locations.some(l => l.palace !== null && l.summary.includes('空亡'));

  if (jiCount > xiongCount + 1) {
    lines.push(`【${eventType}】用神整体偏吉，多数用神得位有力。`);
    lines.push(getPositiveAdvice(eventType));
  } else if (xiongCount > jiCount + 1) {
    lines.push(`【${eventType}】用神整体偏凶，关键用神受克或失令。`);
    lines.push(getNegativeAdvice(eventType));
  } else {
    lines.push(`【${eventType}】用神吉凶参半，需谨慎把握。`);
    lines.push(getNeutralAdvice(eventType));
  }

  if (hasKongWang) {
    lines.push('注意：有用神落空亡，所主之事力量不足，需等待填实。');
  }

  lines.push('');
  lines.push(`分析要点：${template.analysisGuide}`);

  return lines.join('\n');
}

function getPositiveAdvice(eventType: EventTypeKey): string {
  const map: Record<EventTypeKey, string> = {
    '婚姻感情': '婚姻有成之象，双方有合意，利于推进感情。',
    '求财经商': '财运亨通，求财可得，利于经商投资。',
    '考试求学': '文运昌盛，考试顺利，利于学业进取。',
    '出行远行': '出行顺利，一路平安，利于远行。',
    '疾病健康': '病情可控，有望康复，利于求医。',
    '官讼诉讼': '诉讼有利，我方占优，可积极应对。',
    '求职面试': '求职顺利，有贵人相助，利于入职。',
    '失物寻找': '失物可寻，注意用神落宫方位。',
  };
  return map[eventType];
}

function getNegativeAdvice(eventType: EventTypeKey): string {
  const map: Record<EventTypeKey, string> = {
    '婚姻感情': '婚姻有阻，双方意见不合，暂缓为宜。',
    '求财经商': '求财不利，投资有亏损风险，宜守不宜攻。',
    '考试求学': '考运欠佳，准备可能不足，需加倍努力。',
    '出行远行': '出行不利，路上恐有阻碍，建议改期。',
    '疾病健康': '病情较重，需积极治疗，不可大意。',
    '官讼诉讼': '诉讼不利，我方处于劣势，宜和解调解。',
    '求职面试': '求职受阻，暂时不利，建议等待时机。',
    '失物寻找': '失物难寻，可能已毁损或远离，寻找困难。',
  };
  return map[eventType];
}

function getNeutralAdvice(eventType: EventTypeKey): string {
  const map: Record<EventTypeKey, string> = {
    '婚姻感情': '婚姻吉凶参半，需双方共同努力经营。',
    '求财经商': '财运一般，有得有失，需谨慎操作。',
    '考试求学': '考运平平，发挥不稳定，需做好充分准备。',
    '出行远行': '出行可行但需注意安全，做好预案。',
    '疾病健康': '病情反复，需耐心调养，按医嘱行事。',
    '官讼诉讼': '诉讼胜负难料，建议多做准备。',
    '求职面试': '求职有机会但竞争激烈，需展示优势。',
    '失物寻找': '失物或可寻回，但需费些时间和精力。',
  };
  return map[eventType];
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

export function analyzeYongShen(chart: QimenChart, eventType: EventTypeKey): YongShenResult {
  const template = EVENT_TEMPLATES[eventType];

  const locations = template.roles.map(role => locateYongShen(chart, role));
  const relations = analyzeRelations(locations);
  const conclusion = generateConclusion(eventType, locations, relations);

  return { eventType, locations, relations, conclusion };
}
