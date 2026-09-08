/**
 * 恋爱婚姻专项分析
 *
 * 取用规则：
 * - 天盘乙奇 = 女方，天盘庚 = 男方
 * - 六合（八神）= 媒人
 * - 丁奇 = 第三者女，丙奇 = 第三者男
 * - 乙庚落宫关系 = 核心判断
 * - 落宫门/星/神 → 人物画像
 */

import type { QimenChart } from '../types';
import type { PalaceIndex, GateName, StarName, DeityName } from '../constants';
import { PALACE_NAMES, PALACE_WUXING, STAR_FORTUNE, GATE_FORTUNE } from '../constants';
import { JIEQI_WUXING, getVitality } from './data/gateWuxing';
import type { Tier } from './yongShenAnalysis';

// ─── 五行生克 ────────────────────────────────────────────────────────────────

const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

const KE: Record<string, string> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

// ─── 结果类型 ────────────────────────────────────────────────────────────────

export interface PersonProfile {
  label: '女方' | '男方';
  gan: string;               // 乙 or 庚
  palace: PalaceIndex | null;
  palaceName: string;
  palaceWuxing: string;
  gate: string;
  star: string;
  deity: string;
  isEmpty: boolean;
  traits: PersonTraits;
  fortuneScore: number;      // 综合评分
}

export interface PersonTraits {
  personality: string;       // 性格
  appearance: string;        // 长相身材
  career: string;            // 职业状态
}

export interface ThirdParty {
  label: '第三者女(丁)' | '第三者男(丙)';
  gan: string;
  palace: PalaceIndex | null;
  palaceName: string;
  threatsWho: '女方' | '男方' | '双方' | null;  // 威胁哪方
  description: string;
}

export interface MatchmakerInfo {
  palace: PalaceIndex | null;
  palaceName: string;
  favors: '女方' | '男方' | '双方' | '中立';
  description: string;
}

export interface MarriageResult {
  tier: Tier;
  headline: string;
  compatibility: string;     // 乙庚关系描述
  female: PersonProfile;
  male: PersonProfile;
  matchmaker: MatchmakerInfo;
  thirdParties: ThirdParty[];
  details: string[];         // 详细分析行
}

// ─── 人物画像映射 ────────────────────────────────────────────────────────────

const GATE_TRAITS: Record<string, PersonTraits> = {
  '开': { personality: '大方豪爽，有领导力', appearance: '端庄大气', career: '管理层、公务员、企业主' },
  '休': { personality: '温和宽厚，善交际', appearance: '面容和善', career: '公职、文员、服务业' },
  '生': { personality: '务实稳重，有财运', appearance: '体态丰满', career: '经商、房产、金融' },
  '伤': { personality: '急躁好动，争强好胜', appearance: '身材健壮', career: '运动员、司机、军警' },
  '杜': { personality: '内向谨慎，心思缜密', appearance: '五官秀气', career: '技术、研究、文秘' },
  '景': { personality: '聪明热情，好表现', appearance: '面相俊美', career: '文化、教育、传媒' },
  '死': { personality: '固执死板，不善变通', appearance: '面色暗沉', career: '务农、殡葬、冷门行业' },
  '惊': { personality: '口才好，善辩但多虑', appearance: '神态不安', career: '律师、教师、演说' },
};

const STAR_TRAITS: Record<string, { personality: string; appearance: string }> = {
  '天心': { personality: '聪慧正直', appearance: '相貌端正，气质儒雅' },
  '天任': { personality: '忠厚老实', appearance: '体态敦厚' },
  '天辅': { personality: '温文尔雅', appearance: '文质彬彬' },
  '天冲': { personality: '果断勇敢', appearance: '身材高大' },
  '天禽': { personality: '中正平和', appearance: '面相圆润' },
  '天蓬': { personality: '聪明但城府深', appearance: '面色较暗' },
  '天芮': { personality: '小心谨慎', appearance: '体弱多病相' },
  '天柱': { personality: '伶俐善言', appearance: '身材瘦削' },
  '天英': { personality: '性情急躁', appearance: '面色红润' },
};

const DEITY_TRAITS: Record<string, string> = {
  '值符': '身份尊贵，有地位',
  '螣蛇': '心思多变，爱幻想',
  '太阴': '温柔阴柔，有心计',
  '六合': '善于交际，人缘好',
  '白虎': '性格刚烈，脾气大',
  '玄武': '机智灵活，但不够坦诚',
  '九地': '沉稳内敛，厚道踏实',
  '九天': '志向高远，有野心',
  '勾陈': '做事拖沓，犹豫不决',
  '朱雀': '口才好，是非多',
};

// ─── 定位函数 ────────────────────────────────────────────────────────────────

function findTianPanGan(chart: QimenChart, gan: string): PalaceIndex | null {
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    if (chart.palaces[idx].tianPanGan === gan) return idx;
  }
  return null;
}

function findDeity(chart: QimenChart, deity: string): PalaceIndex | null {
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    if (chart.palaces[idx].deity === deity) return idx;
  }
  return null;
}

function palaceLabel(idx: PalaceIndex): string {
  return `${PALACE_NAMES[idx - 1]}${idx}宫`;
}

// ─── 五行关系描述 ────────────────────────────────────────────────────────────

function describeRelation(wx1: string, name1: string, wx2: string, name2: string): { desc: string; fortune: '吉' | '凶' | '平' } {
  if (wx1 === wx2) return { desc: `${name1}(${wx1})与${name2}(${wx2})比和，关系和谐`, fortune: '吉' };
  if (SHENG[wx1] === wx2) return { desc: `${name1}(${wx1})生${name2}(${wx2})，${name1}付出较多`, fortune: '平' };
  if (SHENG[wx2] === wx1) return { desc: `${name2}(${wx2})生${name1}(${wx1})，${name2}付出较多`, fortune: '平' };
  if (KE[wx1] === wx2) return { desc: `${name1}(${wx1})克${name2}(${wx2})，${name1}压制${name2}`, fortune: '凶' };
  if (KE[wx2] === wx1) return { desc: `${name2}(${wx2})克${name1}(${wx1})，${name2}压制${name1}`, fortune: '凶' };
  return { desc: `${name1}与${name2}关系不明`, fortune: '平' };
}

// ─── 人物画像 ────────────────────────────────────────────────────────────────

function buildProfile(chart: QimenChart, label: '女方' | '男方', gan: string): PersonProfile {
  const palace = findTianPanGan(chart, gan);

  if (!palace) {
    return {
      label, gan, palace: null, palaceName: '未定位', palaceWuxing: '',
      gate: '', star: '', deity: '', isEmpty: false,
      traits: { personality: '无法判断', appearance: '无法判断', career: '无法判断' },
      fortuneScore: 0,
    };
  }

  const p = chart.palaces[palace];
  const gateName = p.gate as string;
  const starName = p.star as string;
  const deityName = p.deity as string;
  const palaceWx = PALACE_WUXING[palace];

  // 综合画像
  const gateT = GATE_TRAITS[gateName] ?? { personality: '', appearance: '', career: '' };
  const starT = STAR_TRAITS[starName] ?? { personality: '', appearance: '' };
  const deityT = DEITY_TRAITS[deityName] ?? '';

  const personality = [starT.personality, gateT.personality, deityT].filter(Boolean).join('，');
  const appearance = [starT.appearance, gateT.appearance].filter(Boolean).join('，');
  const career = gateT.career;

  // 评分
  let score = 0;
  const starF = STAR_FORTUNE[p.star];
  if (starF === '大吉' || starF === '吉') score += 1;
  else if (starF === '大凶' || starF === '凶') score -= 1;

  const gateF = GATE_FORTUNE[p.gate];
  if (gateF === '吉') score += 1;
  else if (gateF === '凶') score -= 1;

  if (p.isEmpty) score -= 2;

  // 宫位旺衰
  const seasonWx = JIEQI_WUXING[chart.jieQi];
  if (seasonWx) {
    const v = getVitality(palaceWx, seasonWx);
    if (v === '旺') score += 2;
    else if (v === '相') score += 1;
    else if (v === '囚') score -= 1;
    else if (v === '死') score -= 2;
  }

  // 三奇加分
  if (['乙', '丙', '丁'].includes(p.tianPanGan)) score += 1;

  return {
    label, gan, palace, palaceName: palaceLabel(palace), palaceWuxing: palaceWx,
    gate: gateName, star: starName, deity: deityName, isEmpty: p.isEmpty,
    traits: { personality, appearance, career },
    fortuneScore: score,
  };
}

// ─── 媒人分析 ────────────────────────────────────────────────────────────────

function analyzeMatchmaker(chart: QimenChart, femalePalace: PalaceIndex | null, malePalace: PalaceIndex | null): MatchmakerInfo {
  const mmPalace = findDeity(chart, '六合');

  if (!mmPalace) {
    return { palace: null, palaceName: '未定位', favors: '中立', description: '六合未在盘面中定位到' };
  }

  const mmWx = PALACE_WUXING[mmPalace];
  let favors: MatchmakerInfo['favors'] = '中立';
  const parts: string[] = [`六合（媒人）落${palaceLabel(mmPalace)}(${mmWx})`];

  if (femalePalace && malePalace) {
    const fWx = PALACE_WUXING[femalePalace];
    const mWx = PALACE_WUXING[malePalace];
    const genF = SHENG[mmWx] === fWx;  // 媒人生女方
    const genM = SHENG[mmWx] === mWx;  // 媒人生男方

    if (genF && genM) {
      favors = '双方';
      parts.push('媒人生双方落宫，两边都帮');
    } else if (genF) {
      favors = '女方';
      parts.push(`媒人(${mmWx})生女方宫(${fWx})，偏向女方`);
    } else if (genM) {
      favors = '男方';
      parts.push(`媒人(${mmWx})生男方宫(${mWx})，偏向男方`);
    } else {
      parts.push('媒人与双方无明显生助关系');
    }
  }

  return { palace: mmPalace, palaceName: palaceLabel(mmPalace), favors, description: parts.join('。') };
}

// ─── 第三者分析 ──────────────────────────────────────────────────────────────

function analyzeThirdParty(
  chart: QimenChart,
  femalePalace: PalaceIndex | null,
  malePalace: PalaceIndex | null,
): ThirdParty[] {
  const results: ThirdParty[] = [];

  for (const [gan, label] of [['丁', '第三者女(丁)'], ['丙', '第三者男(丙)']] as const) {
    const palace = findTianPanGan(chart, gan);

    if (!palace) {
      results.push({ label, gan, palace: null, palaceName: '未定位', threatsWho: null, description: `${label}未在盘面显现，暂无第三者迹象。` });
      continue;
    }

    const pName = palaceLabel(palace);
    const parts: string[] = [`${label}落${pName}`];
    let threatsWho: ThirdParty['threatsWho'] = null;

    // 是否与男方或女方同宫
    if (palace === femalePalace && palace === malePalace) {
      threatsWho = '双方';
      parts.push('与男女双方同宫，第三者介入较深');
    } else if (palace === femalePalace) {
      threatsWho = gan === '丙' ? '女方' : '男方';
      parts.push(`与女方同宫，${gan === '丙' ? '第三者男接近女方' : '第三者女与女方有关联'}`);
    } else if (palace === malePalace) {
      threatsWho = gan === '丁' ? '男方' : '女方';
      parts.push(`与男方同宫，${gan === '丁' ? '第三者女接近男方' : '第三者男与男方有关联'}`);
    } else {
      // 看生克关系
      if (femalePalace && malePalace) {
        const tpWx = PALACE_WUXING[palace];
        const fWx = PALACE_WUXING[femalePalace];
        const mWx = PALACE_WUXING[malePalace];
        const affectsF = SHENG[tpWx] === fWx || tpWx === fWx;
        const affectsM = SHENG[tpWx] === mWx || tpWx === mWx;

        if (affectsF && affectsM) {
          threatsWho = '双方';
          parts.push('与双方宫位有生合关系，需注意');
        } else if (affectsF) {
          threatsWho = gan === '丙' ? '女方' : '男方';
          parts.push(`与女方宫位有生合关系`);
        } else if (affectsM) {
          threatsWho = gan === '丁' ? '男方' : '女方';
          parts.push(`与男方宫位有生合关系`);
        } else {
          parts.push('与双方宫位无明显关联，第三者影响不大');
        }
      }
    }

    results.push({ label, gan, palace, palaceName: pName, threatsWho, description: parts.join('，') + '。' });
  }

  return results;
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

export function analyzeMarriage(chart: QimenChart): MarriageResult {
  const female = buildProfile(chart, '女方', '乙');
  const male = buildProfile(chart, '男方', '庚');
  const matchmaker = analyzeMatchmaker(chart, female.palace, male.palace);
  const thirdParties = analyzeThirdParty(chart, female.palace, male.palace);

  // 核心：乙庚关系
  let compatibility = '';
  let compatScore = 0;
  const details: string[] = [];

  if (female.palace && male.palace) {
    const fWx = PALACE_WUXING[female.palace];
    const mWx = PALACE_WUXING[male.palace];

    if (female.palace === male.palace) {
      compatibility = '男女双方同宫，关系密切，感情深厚';
      compatScore = 3;
    } else {
      const rel = describeRelation(fWx, '女方', mWx, '男方');
      compatibility = rel.desc;
      if (rel.fortune === '吉') compatScore = 2;
      else if (rel.fortune === '凶') compatScore = -2;
    }

    // 吉门吉格加成
    const fGateF = GATE_FORTUNE[chart.palaces[female.palace].gate];
    const mGateF = GATE_FORTUNE[chart.palaces[male.palace].gate];
    if (fGateF === '吉' && mGateF === '吉') {
      details.push('男女双方均临吉门，婚姻美满之象');
      compatScore += 1;
    } else if (fGateF === '凶' && mGateF === '凶') {
      details.push('男女双方均临凶门，婚事多阻');
      compatScore -= 1;
    }
  } else {
    compatibility = female.palace ? '男方（庚）未定位' : male.palace ? '女方（乙）未定位' : '男女双方均未定位';
  }

  // 第三者威胁
  for (const tp of thirdParties) {
    if (tp.threatsWho) {
      details.push(tp.description);
      compatScore -= 1;
    }
  }

  // 空亡
  if (female.isEmpty) { details.push('女方落空亡，感情不够投入或暂时无缘'); compatScore -= 1; }
  if (male.isEmpty) { details.push('男方落空亡，感情不够投入或暂时无缘'); compatScore -= 1; }

  // 媒人
  details.push(matchmaker.description);

  // 计算 tier
  const totalScore = compatScore + (female.fortuneScore + male.fortuneScore) / 4;
  let tier: Tier;
  if (totalScore >= 3) tier = '大吉';
  else if (totalScore >= 1) tier = '小吉';
  else if (totalScore >= -1) tier = '平';
  else if (totalScore >= -3) tier = '小凶';
  else tier = '大凶';

  // headline
  const headlines: Record<Tier, string> = {
    '大吉': '感情大利，婚姻美满',
    '小吉': '感情可成，总体有利',
    '平': '吉凶参半，需双方经营',
    '小凶': '存在阻碍，暂缓为宜',
    '大凶': '阻碍较大，婚事难成',
  };

  return {
    tier,
    headline: headlines[tier],
    compatibility,
    female,
    male,
    matchmaker,
    thirdParties,
    details,
  };
}
