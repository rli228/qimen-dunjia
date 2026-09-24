/**
 * 定应期 —— 判断事情何时发生
 *
 * 依据：张志春《神奇之门》中编第六章第五节「奇门定应期的主要方法」（书页 147-149）。
 *
 * 为什么这一环值得单独做：吉凶等级（大吉/小凶）几乎无法证伪，而「3 月 18 日」
 * 可以。书中每个实占案例末尾都有应期断语并附验证结果，是这套体系里唯一
 * 天然可检验的输出。
 *
 * 本模块只实现**可由盘面确定性推出**的方法，不做需要人工取舍的判断。
 * 输出是一组带出处的候选，而非单一答案 —— 书上也是并列多法、互相参照。
 */

import type { QimenChart } from '../types';
import type { PalaceIndex, DiZhi, TianGan } from '../constants';
import { PALACE_NAMES, DI_ZHI } from '../constants';

// ─── 地支关系 ────────────────────────────────────────────────────────────────

/** 六合：子丑、寅亥、卯戌、辰酉、巳申、午未 */
const LIU_HE: Record<string, DiZhi> = {
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午',
};

/** 六冲：相隔六位 */
function chongOf(zhi: DiZhi): DiZhi {
  return DI_ZHI[(DI_ZHI.indexOf(zhi) + 6) % 12];
}

/** 三合局：申子辰(水)、亥卯未(木)、寅午戌(火)、巳酉丑(金) */
const SAN_HE: DiZhi[][] = [
  ['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑'],
];

function sanHeOf(zhi: DiZhi): DiZhi[] {
  const group = SAN_HE.find(g => g.includes(zhi));
  return group ? group.filter(z => z !== zhi) : [];
}

/**
 * 六仪所带地支 —— 甲子戊、甲戌己、甲申庚、甲午辛、甲辰壬、甲寅癸。
 * 三奇乙丙丁不带地支。
 */
const YI_ZHI: Partial<Record<string, DiZhi>> = {
  '戊': '子', '己': '戌', '庚': '申', '辛': '午', '壬': '辰', '癸': '寅',
};

// ─── 结果类型 ────────────────────────────────────────────────────────────────

export type TimingUnit = '年' | '月' | '日' | '时' | '宫数';

export interface TimingCandidate {
  /** 方法名，对应书页 148 的编号条目 */
  method: string;
  /** 依据的盘面元素，必须是盘里真实存在的 */
  basis: string;
  unit: TimingUnit;
  /** 应期值。地支类为「申」，宫数类为「3」 */
  value: string;
  explanation: string;
  /** 书页 148 原则三：先以值符定应期，再以值使定应期 */
  priority: '主' | '次';
}

export interface TimingResult {
  /** 远近快慢。书页 148 原则一 */
  distance: '近/快' | '中' | '远/慢';
  distanceBasis: string[];
  /** 据远近推荐的时间单位：近快断日时，远慢断年月 */
  suggestedUnit: '年' | '月' | '日' | '时';
  candidates: TimingCandidate[];
  /** 书上列了 13 法，本模块只实现可确定性推出的部分 */
  notImplemented: string[];
}

// ─── 内外盘 ──────────────────────────────────────────────────────────────────

/**
 * 内盘 = 坎1 坤2 震3 巽4（含中5），外盘 = 乾6 兑7 艮8 离9。
 * 书中案例反复以此论远近：「时干壬落 3 宫…在内盘，也主在木制家具之内」（书页 259）、
 * 「丁奇落 8 宫为外盘，说明文件不在招待所内」（书页 260）。
 */
export function isInnerPalace(palace: PalaceIndex): boolean {
  return palace <= 5;
}

// ─── 主函数 ──────────────────────────────────────────────────────────────────

export function analyzeTiming(
  chart: QimenChart,
  /** 用神落宫，由调用方从 analyzeYongShen 传入。空数组则只做不依赖用神的推断 */
  yongShenPalaces: PalaceIndex[] = [],
): TimingResult {
  const candidates: TimingCandidate[] = [];
  const distanceBasis: string[] = [];

  // ── 原则一：远近快慢 ──
  const inner = yongShenPalaces.filter(isInnerPalace).length;
  const outer = yongShenPalaces.length - inner;
  let distance: TimingResult['distance'] = '中';

  if (yongShenPalaces.length > 0) {
    if (outer === 0) {
      distance = '近/快';
      distanceBasis.push(`用神全落内盘（${yongShenPalaces.map(p => `${PALACE_NAMES[p - 1]}${p}宫`).join('、')}），主距离近、速度快`);
    } else if (inner === 0) {
      distance = '远/慢';
      distanceBasis.push(`用神全落外盘（${yongShenPalaces.map(p => `${PALACE_NAMES[p - 1]}${p}宫`).join('、')}），主距离远、速度慢`);
    } else {
      distanceBasis.push('用神一内一外，主期远');
    }
  }

  // 伏吟主迟缓，反吟主速变
  const starFuYin = countStarFuYin(chart);
  if (starFuYin >= 8) {
    distance = '远/慢';
    distanceBasis.push('星门伏吟，主停滞拖延，应期迟缓');
  }

  const suggestedUnit: TimingResult['suggestedUnit'] =
    distance === '近/快' ? '日' : distance === '远/慢' ? '月' : '日';

  // ── 方法 11：值使门所临之干为应期；值使门所落宫数为应期 ──
  const zhiShiPalace = findGatePalace(chart, chart.zhiShi);
  if (zhiShiPalace !== null) {
    const p = chart.palaces[zhiShiPalace];
    candidates.push({
      method: '值使门所临之干为应期（书页 148 第 11 条）',
      basis: `${chart.zhiShi}门落${PALACE_NAMES[zhiShiPalace - 1]}${zhiShiPalace}宫，天盘${p.tianPanGan}`,
      unit: '日',
      value: `${p.tianPanGan}日`,
      explanation: `值使${chart.zhiShi}门所临天盘干为${p.tianPanGan}，以${p.tianPanGan}日为应期`,
      priority: '次',
    });
    candidates.push({
      method: '值使门所落宫数为应期（书页 148 第 11 条）',
      basis: `${chart.zhiShi}门落${zhiShiPalace}宫`,
      unit: '宫数',
      value: String(zhiShiPalace),
      explanation: `值使落${zhiShiPalace}宫，以${zhiShiPalace}（${suggestedUnit}）为应期数`,
      priority: '次',
    });
  }

  // ── 方法 12：时干所落宫数为应期 ──
  const hourGanPalace = findGanPalace(chart, chart.siZhu.hour.gan);
  if (hourGanPalace !== null) {
    candidates.push({
      method: '时干所落宫数为应期（书页 148 第 12 条）',
      basis: `时干${chart.siZhu.hour.gan}落${PALACE_NAMES[hourGanPalace - 1]}${hourGanPalace}宫`,
      unit: '宫数',
      value: String(hourGanPalace),
      explanation: `时干落${hourGanPalace}宫，以${hourGanPalace}（${suggestedUnit}）为应期数`,
      priority: '次',
    });
  }

  // ── 方法 1 / 8：值符旬空则以填实为应期；旬空冲实亦为应期 ──
  for (const kz of chart.kongWang) {
    candidates.push({
      method: '旬空填实为应期（书页 148 第 8 条）',
      basis: `空亡地支${kz}`,
      unit: '日',
      value: `${kz}日`,
      explanation: `${kz}落空亡，待${kz}日填实为应期`,
      priority: '主',
    });
    candidates.push({
      method: '旬空冲实为应期（书页 148 第 8 条）',
      basis: `空亡地支${kz}`,
      unit: '日',
      value: `${chongOf(kz)}日`,
      explanation: `${kz}空亡，以其冲${chongOf(kz)}日为应期`,
      priority: '主',
    });
  }

  // ── 方法 2：天盘六仪所带地支，逢合以冲定、逢冲以合定 ──
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    if (!yongShenPalaces.includes(idx)) continue;
    const zhi = YI_ZHI[chart.palaces[idx].tianPanGan];
    if (!zhi) continue;
    candidates.push({
      method: '天盘六仪所带地支定应期（书页 148 第 2 条）',
      basis: `${PALACE_NAMES[idx - 1]}${idx}宫天盘${chart.palaces[idx].tianPanGan}（带${zhi}）`,
      unit: '日',
      value: `${LIU_HE[zhi]}日或${chongOf(zhi)}日`,
      explanation: `天盘${chart.palaces[idx].tianPanGan}所带地支为${zhi}，逢冲以合定（${LIU_HE[zhi]}），逢合以冲定（${chongOf(zhi)}）`,
      priority: '主',
    });
  }

  // ── 方法 13：日支、时支三合六合为应期 ──
  for (const [label, zhi] of [['日支', chart.siZhu.day.zhi], ['时支', chart.siZhu.hour.zhi]] as const) {
    const he = LIU_HE[zhi];
    const sanHe = sanHeOf(zhi);
    candidates.push({
      method: '日支时支三合六合为应期（书页 148 第 13 条）',
      basis: `${label}${zhi}`,
      unit: '日',
      value: [he, ...sanHe].filter(Boolean).join('、') + '日',
      explanation: `${label}${zhi}，六合${he}、三合${sanHe.join('')}，逢此诸日为应期`,
      priority: '次',
    });
  }

  return {
    distance,
    distanceBasis,
    suggestedUnit,
    candidates,
    notImplemented: [
      '第 3 条：星门生克定应期（生逢生日、克逢克日）—— 需先判定用神与星门的生克主次',
      '第 5/6 条：用神长生旺相、死墓绝应期 —— 需十二长生表，本项目尚未引入',
      '第 7 条：庚格应期 —— 需先判定日之阴阳与时干所临星之阴阳',
      '第 9 条：冲墓为应期 —— 需墓库判定',
      '第 10 条：马星动为应期 —— 马星已在盘面，但「动」的判据书中未细说',
    ],
  };
}

// ─── 辅助 ────────────────────────────────────────────────────────────────────

function findGatePalace(chart: QimenChart, gate: string): PalaceIndex | null {
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    if (idx === 5) continue; // 中五宫无门
    if (chart.palaces[idx].gate === gate) return idx;
  }
  return null;
}

function findGanPalace(chart: QimenChart, gan: TianGan): PalaceIndex | null {
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    const p = chart.palaces[idx];
    if (p.tianPanGan === gan || p.diPanGan === gan) return idx;
  }
  return null;
}

/** 九星回到本宫的个数，8 个即全盘星伏吟 */
function countStarFuYin(chart: QimenChart): number {
  const home: Record<string, number> = {
    '天蓬': 1, '天芮': 2, '天冲': 3, '天辅': 4, '天禽': 5,
    '天心': 6, '天柱': 7, '天任': 8, '天英': 9,
  };
  let n = 0;
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    if (home[chart.palaces[idx].star] === idx) n++;
  }
  return n;
}
