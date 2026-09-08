/**
 * 用神分析引擎
 *
 * 根据事类模板定位用神落宫，分析生克关系，给出结论
 *
 * 设计原则：
 * - 流派忠实度：忠实反映传统断法的优先级和逻辑
 * - 校准表达：条件式语言，不做断言式预测
 * - 信号一致性：报告各用神信号是否指向同一方向
 */

import type { QimenChart } from '../types';
import type { PalaceIndex, GateName, StarName, SanQiLiuYi } from '../constants';
import { PALACE_NAMES, PALACE_WUXING, STAR_FORTUNE, GATE_FORTUNE, JIA_HIDDEN } from '../constants';
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
  score: number;               // 原始评分（保留程度信息）
}

export interface YongShenRelation {
  from: string;  // 角色A
  to: string;    // 角色B
  relation: string;  // 关系描述
  fortune: '吉' | '凶' | '平';
}

export type Tier = '大吉' | '小吉' | '平' | '小凶' | '大凶';

export interface YongShenResult {
  eventType: EventTypeKey;
  locations: YongShenLocation[];
  relations: YongShenRelation[];
  tier: Tier;                      // 一眼结论
  headline: string;                // 一句话摘要（给小白看）
  conclusion: string;              // 详细分析（给有基础的看）
  coherence: '强' | '中' | '弱';  // 信号一致性
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

// ─── 河图数（定量预测） ──────────────────────────────────────────────────────

const HETU_NUMBERS: Record<string, [number, number]> = {
  '水': [1, 6],
  '火': [2, 7],
  '木': [3, 8],
  '金': [4, 9],
  '土': [5, 10],
};

// ─── 宫位方位 ────────────────────────────────────────────────────────────────

const PALACE_DIRECTION: Record<number, string> = {
  1: '北方', 2: '西南方', 3: '东方', 4: '东南方',
  5: '中央', 6: '西北方', 7: '西方', 8: '东北方', 9: '南方',
};

// ─── 定位用神 ────────────────────────────────────────────────────────────────

function ganToSanQi(gan: string, zhi: string): string {
  if (gan === '甲') {
    return JIA_HIDDEN[gan + zhi] ?? gan;
  }
  return gan;
}

function resolveTarget(chart: QimenChart, role: YongShenRole): string {
  if (!role.targetSource) return role.target;
  switch (role.targetSource) {
    case 'dayGan': return ganToSanQi(chart.siZhu.day.gan, chart.siZhu.day.zhi);
    case 'hourGan': return ganToSanQi(chart.siZhu.hour.gan, chart.siZhu.hour.zhi);
    case 'zhiFu': return chart.zhiFu;
    default: return role.target;
  }
}

function locateYongShen(chart: QimenChart, role: YongShenRole): YongShenLocation {
  const target = resolveTarget(chart, role);
  // Patch role with resolved target for display
  const resolvedRole = { ...role, target };

  let foundPalace: PalaceIndex | null = null;

  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    const p = chart.palaces[idx];

    if (role.type === 'gan') {
      const scope = role.searchScope;
      if (scope === 'diPan') {
        if (p.diPanGan === target) { foundPalace = idx; break; }
      } else if (scope === 'tianPan') {
        if (p.tianPanGan === target) { foundPalace = idx; break; }
      } else {
        // 默认：优先匹配天盘干，其次地盘干
        if (p.tianPanGan === target || p.diPanGan === target) { foundPalace = idx; break; }
      }
    } else if (role.type === 'gate') {
      if (idx !== 5 && p.gate === target) {
        foundPalace = idx;
        break;
      }
    } else if (role.type === 'star') {
      if (p.star === target) {
        foundPalace = idx;
        break;
      }
    }
  }

  if (!foundPalace) {
    return {
      role: resolvedRole,
      palace: null,
      palaceName: '未定位',
      palaceWuxing: '',
      summary: `${resolvedRole.label}（${target}）未在盘面中定位到`,
      fortune: '平',
      score: 0,
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

  // Fix 1: 宫位月令旺衰（宫位五行 vs 季节五行，权重较高）
  {
    const seasonWx = JIEQI_WUXING[chart.jieQi];
    if (seasonWx) {
      const palaceVitality = getVitality(palaceWx, seasonWx);
      if (palaceVitality === '旺') {
        factors.push('宫旺');
        fortuneScore += 2;
      } else if (palaceVitality === '相') {
        factors.push('宫相');
        fortuneScore += 1;
      } else if (palaceVitality === '囚') {
        factors.push('宫囚');
        fortuneScore -= 1;
      } else if (palaceVitality === '死') {
        factors.push('宫死');
        fortuneScore -= 2;
      }
    }
  }

  // Fix 3: 值符同宫（值符星与用神同宫，得裁判/权威助力）
  {
    const zhiFuStar = chart.zhiFu;
    if (palace.star === zhiFuStar) {
      factors.push('值符同宫');
      fortuneScore += 1;
    }
  }

  // 有无三奇（乙丙丁）
  const sanQi = ['乙', '丙', '丁'];
  if (sanQi.includes(palace.tianPanGan)) {
    factors.push(`得${palace.tianPanGan}奇`);
    fortuneScore += 1;
  }

  const fortune: '吉' | '凶' | '平' = fortuneScore >= 2 ? '吉' : fortuneScore <= -2 ? '凶' : '平';
  const summary = `${resolvedRole.label}（${target}）落${palaceName}(${palaceWx})，天盘${palace.tianPanGan}地盘${palace.diPanGan}，${palace.star}、${palace.gate}门、${palace.deity}` +
    (factors.length > 0 ? `。${factors.join('，')}` : '');

  return { role: resolvedRole, palace: foundPalace, palaceName, palaceWuxing: palaceWx, summary, fortune, score: fortuneScore };
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

// ─── 信号一致性 ────────────────────────────────────────────────────────────

function getCoherence(locations: YongShenLocation[], relations: YongShenRelation[]): '强' | '中' | '弱' {
  const allFortunes = [
    ...locations.filter(l => l.palace !== null).map(l => l.fortune),
    ...relations.map(r => r.fortune),
  ];
  if (allFortunes.length === 0) return '弱';

  const jiCount = allFortunes.filter(f => f === '吉').length;
  const xiongCount = allFortunes.filter(f => f === '凶').length;
  const total = allFortunes.length;

  // 强：80%以上信号指向同一方向
  const dominant = Math.max(jiCount, xiongCount);
  const ratio = dominant / total;

  if (ratio >= 0.75) return '强';
  if (ratio >= 0.5) return '中';
  return '弱';
}

// ─── 生成结论 ────────────────────────────────────────────────────────────────

function generateConclusion(
  chart: QimenChart,
  eventType: EventTypeKey,
  locations: YongShenLocation[],
  relations: YongShenRelation[],
  coherence: '强' | '中' | '弱',
): { tier: Tier; headline: string; conclusion: string } {
  const template = EVENT_TEMPLATES[eventType];
  const lines: string[] = [];

  // 加权计分：用 role.weight × score
  let weightedScore = 0;
  let totalWeight = 0;
  for (const loc of locations) {
    if (loc.palace !== null) {
      weightedScore += loc.role.weight * loc.score;
      totalWeight += loc.role.weight;
    }
  }

  // 关系得分（权重=1，不加权）
  for (const rel of relations) {
    if (rel.fortune === '吉') weightedScore += 1;
    else if (rel.fortune === '凶') weightedScore -= 1;
  }
  totalWeight += relations.length || 1;

  // 归一化到 [-1, 1] 区间
  let normalized = totalWeight > 0 ? weightedScore / (totalWeight * 2) : 0;

  // 体育竞猜特殊处理：tier基于主客队对比而非总分
  if (eventType === '体育竞猜') {
    const home = locations.find(l => l.role.label === '主队');
    const away = locations.find(l => l.role.label === '客队');
    if (home && away && home.palace !== null && away.palace !== null) {
      let diff = home.score - away.score;

      // Fix 2: 辛双盘比较加分
      let diPanXinPalace: PalaceIndex | null = null;
      let tianPanXinPalace: PalaceIndex | null = null;
      for (let i = 1; i <= 9; i++) {
        const idx = i as PalaceIndex;
        const p = chart.palaces[idx];
        if (!diPanXinPalace && p.diPanGan === '辛') diPanXinPalace = idx;
        if (!tianPanXinPalace && p.tianPanGan === '辛') tianPanXinPalace = idx;
      }
      if (diPanXinPalace && tianPanXinPalace && diPanXinPalace !== tianPanXinPalace) {
        const diWx = PALACE_WUXING[diPanXinPalace];
        const tianWx = PALACE_WUXING[tianPanXinPalace];
        if (KE[diWx] === tianWx) diff += 2;        // 地盘辛克天盘辛→利主队
        else if (KE[tianWx] === diWx) diff -= 2;   // 天盘辛克地盘辛→利客队
      }

      // 映射到 [-1, 1]：diff 范围大约 -8~+8
      normalized = Math.max(-1, Math.min(1, diff / 6));
    }
  }

  // 5档判断
  let tier: Tier;
  if (normalized > 0.4) tier = '大吉';
  else if (normalized > 0.1) tier = '小吉';
  else if (normalized >= -0.1) tier = '平';
  else if (normalized >= -0.4) tier = '小凶';
  else tier = '大凶';

  // 找主用神（weight最大的已定位用神）
  const primaryLocations = locations
    .filter(l => l.palace !== null)
    .sort((a, b) => b.role.weight - a.role.weight);
  const primary = primaryLocations[0];

  // 第一行：基于档位的条件式判断
  const tierLine = getTierStatement(eventType, tier);
  lines.push(tierLine);

  // 第二行：事类特定分析
  if (eventType === '体育竞猜') {
    const sportLine = getSportComparisonLine(locations);
    if (sportLine) lines.push(sportLine);
    // Fix 2: 辛双盘比较
    const xinLine = getXinDualComparison(chart);
    if (xinLine) lines.push(xinLine);
    // 河图数预测金牌数量
    const hetuLine = getHetuPrediction(locations);
    if (hetuLine) lines.push(hetuLine);
  } else if (primary) {
    const dir = PALACE_DIRECTION[primary.palace!] ?? '';
    lines.push(getKeyFactorLine(eventType, primary, dir));
  }

  // 第三行：空亡提示
  const kongWangLocs = locations.filter(l => l.palace !== null && l.summary.includes('空亡'));
  if (kongWangLocs.length > 0) {
    const names = kongWangLocs.map(l => l.role.label).join('、');
    lines.push(`${names}落空亡，所主之事力量不足，需等待填实。`);
  }

  // 第四行：信号一致性
  if (coherence === '弱') {
    lines.push('各用神信号方向不一致，局势不明朗，建议综合多方面信息判断。');
  } else if (coherence === '强') {
    lines.push('各用神信号方向一致，此局指向性较为明确。');
  }

  // 末尾：分析要点
  lines.push('');
  lines.push(`分析要点：${template.analysisGuide}`);

  // 一句话摘要（给小白看）
  const headline = getHeadline(eventType, tier, locations);

  return { tier, headline, conclusion: lines.join('\n') };
}

/** 条件式表达，按5档 × 事类 */
function getTierStatement(eventType: EventTypeKey, tier: Tier): string {
  const statements: Record<Tier, Record<EventTypeKey, string>> = {
    '大吉': {
      '婚姻感情': '【婚姻感情】按传统断法，此局用神得位有力，多项因素利于婚姻感情发展。',
      '求财经商': '【求财经商】按传统断法，此局财星旺相，多项因素利于求财经商。',
      '考试求学': '【考试求学】按传统断法，此局文昌星旺，多项因素利于考试求学。',
      '出行远行': '【出行远行】按传统断法，此局出行用神得力，多项因素利于出行。',
      '疾病健康': '【疾病健康】按传统断法，此局医药用神有力，生机旺盛，病情可控。',
      '官讼诉讼': '【官讼诉讼】按传统断法，此局我方用神得力，多项因素利于诉讼。',
      '求职面试': '【求职面试】按传统断法，此局求职用神旺相，多项因素利于入职。',
      '失物寻找': '【失物寻找】按传统断法，此局失物用神有力，寻回可能性较大。',
      '体育竞猜': '【体育竞猜】按传统断法，此局主队用神占优，多项因素利主队。',
    },
    '小吉': {
      '婚姻感情': '【婚姻感情】按传统断法，此局用神状态尚可，婚姻感情有向好趋势。',
      '求财经商': '【求财经商】按传统断法，此局财运尚可，求财有一定把握。',
      '考试求学': '【考试求学】按传统断法，此局文运尚可，考试有一定优势。',
      '出行远行': '【出行远行】按传统断法，此局出行条件尚可，总体利于出行。',
      '疾病健康': '【疾病健康】按传统断法，此局医药尚有助力，病情趋于稳定。',
      '官讼诉讼': '【官讼诉讼】按传统断法，此局我方略占优势，诉讼可争取。',
      '求职面试': '【求职面试】按传统断法，此局求职条件尚可，有一定机会。',
      '失物寻找': '【失物寻找】按传统断法，此局失物用神尚可，有一定寻回可能。',
      '体育竞猜': '【体育竞猜】按传统断法，此局主队略占优势，但优势不大。',
    },
    '平': {
      '婚姻感情': '【婚姻感情】按传统断法，此局用神吉凶参半，婚姻感情需双方共同经营。',
      '求财经商': '【求财经商】按传统断法，此局财运吉凶参半，求财需谨慎操作。',
      '考试求学': '【考试求学】按传统断法，此局文运吉凶参半，考试发挥有不确定性。',
      '出行远行': '【出行远行】按传统断法，此局出行条件吉凶参半，注意安全预案。',
      '疾病健康': '【疾病健康】按传统断法，此局用神吉凶参半，病情有反复可能，需耐心调养。',
      '官讼诉讼': '【官讼诉讼】按传统断法，此局双方势均力敌，诉讼胜负难料。',
      '求职面试': '【求职面试】按传统断法，此局求职条件吉凶参半，竞争激烈，需展示优势。',
      '失物寻找': '【失物寻找】按传统断法，此局失物用神状态一般，寻找需耗费时间精力。',
      '体育竞猜': '【体育竞猜】按传统断法，此局双方实力接近，平局可能性较大。',
    },
    '小凶': {
      '婚姻感情': '【婚姻感情】按传统断法，此局用神状态欠佳，婚姻感情存在一定阻碍。',
      '求财经商': '【求财经商】按传统断法，此局财运欠佳，求财存在一定风险。',
      '考试求学': '【考试求学】按传统断法，此局文运欠佳，考试准备可能不足。',
      '出行远行': '【出行远行】按传统断法，此局出行条件欠佳，路上可能有阻碍。',
      '疾病健康': '【疾病健康】按传统断法，此局医药用神不力，病情可能加重，需积极治疗。',
      '官讼诉讼': '【官讼诉讼】按传统断法，此局我方处于一定劣势，宜考虑和解。',
      '求职面试': '【求职面试】按传统断法，此局求职条件欠佳，暂时不太有利。',
      '失物寻找': '【失物寻找】按传统断法，此局失物用神不力，寻回有一定困难。',
      '体育竞猜': '【体育竞猜】按传统断法，此局主队处于一定劣势，客队略占优势。',
    },
    '大凶': {
      '婚姻感情': '【婚姻感情】按传统断法，此局用神多处受克失令，婚姻感情阻碍较大，暂缓为宜。',
      '求财经商': '【求财经商】按传统断法，此局用神多处受克失令，求财风险较高，宜守不宜攻。',
      '考试求学': '【考试求学】按传统断法，此局用神多处受克失令，考运不佳，需加倍努力。',
      '出行远行': '【出行远行】按传统断法，此局用神多处受克失令，出行不利，建议改期。',
      '疾病健康': '【疾病健康】按传统断法，此局用神多处受克失令，病情较重，不可大意。',
      '官讼诉讼': '【官讼诉讼】按传统断法，此局用神多处受克失令，我方劣势明显，宜和解调解。',
      '求职面试': '【求职面试】按传统断法，此局用神多处受克失令，求职受阻，建议等待时机。',
      '失物寻找': '【失物寻找】按传统断法，此局用神多处受克失令，失物难寻，寻回可能性低。',
      '体育竞猜': '【体育竞猜】按传统断法，此局主队用神多处不利，客队胜面较大。',
    },
  };
  return statements[tier][eventType];
}

/** 体育竞猜：主客队宫位对比 */
function getSportComparisonLine(locations: YongShenLocation[]): string | null {
  const home = locations.find(l => l.role.label === '主队');
  const away = locations.find(l => l.role.label === '客队');
  if (!home || !away || home.palace === null || away.palace === null) return null;

  const homeDir = PALACE_DIRECTION[home.palace] ?? '';
  const awayDir = PALACE_DIRECTION[away.palace] ?? '';

  if (home.palace === away.palace) {
    return `主客队同落${home.palaceName}，双方势均力敌，平局可能性较大。`;
  }

  const scoreDiff = home.score - away.score;
  if (scoreDiff > 1) {
    return `主队落${home.palaceName}(${homeDir})，状态优于客队落${away.palaceName}(${awayDir})，按传统断法利主队。`;
  } else if (scoreDiff < -1) {
    return `客队落${away.palaceName}(${awayDir})，状态优于主队落${home.palaceName}(${homeDir})，按传统断法利客队。`;
  } else {
    return `主队落${home.palaceName}(${homeDir})，客队落${away.palaceName}(${awayDir})，双方用神状态接近，胜负难判。`;
  }
}

/** Fix 2: 辛（金牌）双盘比较 — 地盘辛 vs 天盘辛，宫位五行谁强 */
function getXinDualComparison(chart: QimenChart): string | null {
  let diPanXinPalace: PalaceIndex | null = null;
  let tianPanXinPalace: PalaceIndex | null = null;

  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    const p = chart.palaces[idx];
    if (!diPanXinPalace && p.diPanGan === '辛') diPanXinPalace = idx;
    if (!tianPanXinPalace && p.tianPanGan === '辛') tianPanXinPalace = idx;
  }

  if (!diPanXinPalace || !tianPanXinPalace) return null;
  if (diPanXinPalace === tianPanXinPalace) return `辛（金牌）天地盘同落${PALACE_NAMES[diPanXinPalace - 1]}${diPanXinPalace}宫，双方均有机会。`;

  const diWx = PALACE_WUXING[diPanXinPalace];
  const tianWx = PALACE_WUXING[tianPanXinPalace];

  // 地盘辛=主队荣誉，天盘辛=客队荣誉
  // 地盘辛宫克天盘辛宫 → 主队夺冠
  if (KE[diWx] === tianWx) {
    return `辛（金牌）地盘在${diPanXinPalace}宫(${diWx})克天盘${tianPanXinPalace}宫(${tianWx})，按传统断法主队夺冠。`;
  } else if (KE[tianWx] === diWx) {
    return `辛（金牌）天盘在${tianPanXinPalace}宫(${tianWx})克地盘${diPanXinPalace}宫(${diWx})，按传统断法客队夺冠。`;
  } else if (SHENG[diWx] === tianWx) {
    return `辛（金牌）地盘${diPanXinPalace}宫(${diWx})生天盘${tianPanXinPalace}宫(${tianWx})，主队荣誉泄于客队。`;
  } else if (SHENG[tianWx] === diWx) {
    return `辛（金牌）天盘${tianPanXinPalace}宫(${tianWx})生地盘${diPanXinPalace}宫(${diWx})，客队荣誉泄于主队，利主队。`;
  }
  return `辛（金牌）地盘在${diPanXinPalace}宫(${diWx})，天盘在${tianPanXinPalace}宫(${tianWx})，比和。`;
}

/** 河图数预测：辛（金牌）落宫五行 → 数量提示 */
function getHetuPrediction(locations: YongShenLocation[]): string | null {
  const jinPai = locations.find(l => l.role.label === '金牌');
  if (!jinPai || !jinPai.palace || !jinPai.palaceWuxing) return null;

  const nums = HETU_NUMBERS[jinPai.palaceWuxing];
  if (!nums) return null;

  const [sheng, cheng] = nums;
  return `辛（金牌）落${jinPai.palaceName}，宫属${jinPai.palaceWuxing}，河图数${sheng}、${cheng}，按传统断法主队金牌数与${sheng}或${cheng}相关（如${sheng}、${sheng + 10}、${cheng}、${cheng + 10}枚）。`;
}

/** 主用神具体状态行（含方位建议） */
function getKeyFactorLine(eventType: EventTypeKey, primary: YongShenLocation, direction: string): string {
  const label = primary.role.label;
  const fortuneDesc = primary.fortune === '吉' ? '得位有力' : primary.fortune === '凶' ? '受克失令' : '状态平平';
  const dirHint = direction ? `，落宫方位在${direction}` : '';

  return `主用神${label}（${primary.role.target}）落${primary.palaceName}，${fortuneDesc}${dirHint}。`;
}

/** 一句话摘要：简洁直观，小白一眼能懂 */
function getHeadline(eventType: EventTypeKey, tier: Tier, locations: YongShenLocation[]): string {
  const headlines: Record<Tier, Record<EventTypeKey, string>> = {
    '大吉': {
      '婚姻感情': '感情大利，宜推进',
      '求财经商': '财运旺盛，大利求财',
      '考试求学': '文运大旺，利考试',
      '出行远行': '出行大吉，一路顺遂',
      '疾病健康': '病情可控，康复有望',
      '官讼诉讼': '我方占优，利诉讼',
      '求职面试': '机遇大好，利入职',
      '失物寻找': '可以找回',
      '体育竞猜': '主队胜面大',
    },
    '小吉': {
      '婚姻感情': '感情有利，可争取',
      '求财经商': '财运尚可，小有收获',
      '考试求学': '文运尚可，有一定优势',
      '出行远行': '出行可行，总体顺利',
      '疾病健康': '病情趋稳，耐心调养',
      '官讼诉讼': '略占优势，可争取',
      '求职面试': '有一定机会',
      '失物寻找': '有望找回，需耐心',
      '体育竞猜': '主队略优',
    },
    '平': {
      '婚姻感情': '吉凶参半，需经营',
      '求财经商': '财运平平，谨慎操作',
      '考试求学': '发挥不定，需努力',
      '出行远行': '出行一般，注意安全',
      '疾病健康': '病情反复，耐心调养',
      '官讼诉讼': '势均力敌，胜负难料',
      '求职面试': '竞争激烈，需展示优势',
      '失物寻找': '寻找费力，结果不定',
      '体育竞猜': '双方接近，可能平局',
    },
    '小凶': {
      '婚姻感情': '存在阻碍，暂缓为宜',
      '求财经商': '财运欠佳，有风险',
      '考试求学': '准备不足，需加倍努力',
      '出行远行': '路上有阻，建议改期',
      '疾病健康': '病情可能加重，积极治疗',
      '官讼诉讼': '我方劣势，宜和解',
      '求职面试': '时机不佳，建议等待',
      '失物寻找': '找回困难',
      '体育竞猜': '客队略优',
    },
    '大凶': {
      '婚姻感情': '阻碍较大，暂缓为宜',
      '求财经商': '风险高，宜守不宜攻',
      '考试求学': '考运不佳，需加倍努力',
      '出行远行': '不利出行，建议改期',
      '疾病健康': '病情较重，不可大意',
      '官讼诉讼': '劣势明显，宜调解',
      '求职面试': '受阻较大，等待时机',
      '失物寻找': '难以找回',
      '体育竞猜': '客队胜面大',
    },
  };

  return headlines[tier][eventType];
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

export function analyzeYongShen(chart: QimenChart, eventType: EventTypeKey): YongShenResult {
  const template = EVENT_TEMPLATES[eventType];

  const locations = template.roles.map(role => locateYongShen(chart, role));
  const relations = analyzeRelations(locations);
  const coherence = getCoherence(locations, relations);
  const { tier, headline, conclusion } = generateConclusion(chart, eventType, locations, relations, coherence);

  return { eventType, locations, relations, tier, headline, conclusion, coherence };
}
