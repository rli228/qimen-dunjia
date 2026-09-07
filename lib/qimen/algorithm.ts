import {
  PALACE_NAMES,
  SAN_QI_LIU_YI,
  LUOSHU_ORDER,
  LUOSHU_REVERSE,
  STAR_ORIGINAL_PALACE,
  STAR_NAMES,
  GATE_ORIGINAL_PALACE,
  GATE_NAMES,
  DEITY_NAMES_YANG,
  DEITY_NAMES_YIN,
  ROTATE_ORDER,
  TIAN_GAN,
  type PalaceIndex,
  type StarName,
  type GateName,
  type SanQiLiuYi,
  type TianGan,
  type DeityName,
} from './constants';
import type { ChartInput, Palace, QimenChart } from './types';
import { getSiZhu, getJieQiInfo, getYuanAndJu, getXunShouInfo, getGanIndex } from './calendar';

// ─── 地盘排布 ────────────────────────────────────────────────────────────────

/**
 * 排布地盘：将三奇六仪按局数放入九宫
 *
 * 阳遁：戊从局数对应宫位开始，按洛书顺序排布
 * 阴遁：戊从局数对应宫位开始，按洛书逆序排布
 */
export function layoutDiPan(
  juNumber: number,
  dunType: '阳遁' | '阴遁'
): Record<PalaceIndex, SanQiLiuYi> {
  const order = dunType === '阳遁' ? LUOSHU_ORDER : LUOSHU_REVERSE;
  const startIdx = order.indexOf(juNumber as PalaceIndex);

  const result = {} as Record<PalaceIndex, SanQiLiuYi>;
  for (let i = 0; i < 9; i++) {
    const palaceIdx = order[(startIdx + i) % 9];
    result[palaceIdx] = SAN_QI_LIU_YI[i];
  }
  return result;
}

// ─── 值符值使 ────────────────────────────────────────────────────────────────

/**
 * 确定值符（当值九星）和值使（当值八门）
 *
 * 根据时柱所在旬的旬首对应六仪，在地盘上找到该六仪所在宫位，
 * 该宫位原始的九星即为值符，原始的八门即为值使。
 *
 * 注意：值符/值使由旬首六仪决定，不是由时干直接决定。
 * 时干只用于确定天盘/人盘的旋转目标宫位。
 */
export function getZhiFuZhiShi(
  xunShouYi: SanQiLiuYi,
  diPan: Record<PalaceIndex, SanQiLiuYi>,
): {
  zhiFu: StarName;
  zhiShi: Exclude<GateName, '中'>;
  zhiFuOriginalPalace: PalaceIndex;
} {
  // 找到旬首六仪在地盘上的宫位
  let yiPalace: PalaceIndex | null = null;
  for (const [palace, gan] of Object.entries(diPan)) {
    if (gan === xunShouYi) {
      yiPalace = Number(palace) as PalaceIndex;
      break;
    }
  }

  if (!yiPalace) {
    throw new Error(`未找到旬首六仪 ${xunShouYi} 在地盘上的位置`);
  }

  // 找到该宫位原始的九星（值符）和八门（值使）
  const zhiFu = Object.entries(STAR_ORIGINAL_PALACE).find(
    ([_, palace]) => palace === yiPalace
  )![0] as StarName;

  // 中五宫寄坤二宫：如果值符是天禽星，则按坤二宫处理
  const effectivePalace = yiPalace === 5 ? 2 : yiPalace;
  const zhiShi = Object.entries(GATE_ORIGINAL_PALACE).find(
    ([_, palace]) => palace === effectivePalace
  )![0] as Exclude<GateName, '中'>;

  return { zhiFu, zhiShi, zhiFuOriginalPalace: yiPalace };
}

// ─── 天盘排布（转盘） ────────────────────────────────────────────────────────

/**
 * 排布天盘：值符（九星）带着天盘干旋转到时干所在宫位
 *
 * 转盘逻辑：
 * 1. 值符星从原始宫位带着地盘干转到时干落宫
 * 2. 其余八星按原始顺序跟随旋转
 */
export function layoutTianPan(
  diPan: Record<PalaceIndex, SanQiLiuYi>,
  zhiFu: StarName,
  hourGan: TianGan,
  dunType: '阳遁' | '阴遁'
): {
  tianPanGan: Record<PalaceIndex, SanQiLiuYi>;
  starPalaces: Record<PalaceIndex, StarName>;
} {
  let shiGan: SanQiLiuYi = hourGan as SanQiLiuYi;
  if (hourGan === '甲') shiGan = '戊';

  // 值符原始宫位
  const zhiFuOriginal = STAR_ORIGINAL_PALACE[zhiFu];
  // 时干在地盘的宫位（值符要转到这里）
  let targetPalace: PalaceIndex = 1;
  for (const [palace, gan] of Object.entries(diPan)) {
    if (gan === shiGan) {
      targetPalace = Number(palace) as PalaceIndex;
      break;
    }
  }

  // 计算旋转步数
  const fromIdx = ROTATE_ORDER.indexOf(zhiFuOriginal === 5 ? 2 : zhiFuOriginal);
  const toIdx = ROTATE_ORDER.indexOf(targetPalace === 5 ? 2 : targetPalace);
  const steps = ((toIdx - fromIdx) % 8 + 8) % 8;

  // 旋转所有星和天盘干
  const tianPanGan = {} as Record<PalaceIndex, SanQiLiuYi>;
  const starPalaces = {} as Record<PalaceIndex, StarName>;

  for (let i = 0; i < 8; i++) {
    const fromPalace = ROTATE_ORDER[i];
    const toPalace = ROTATE_ORDER[(i + steps) % 8];

    // 天盘干 = 原宫位的地盘干跟随旋转
    tianPanGan[toPalace] = diPan[fromPalace];

    // 九星跟随旋转
    const star = Object.entries(STAR_ORIGINAL_PALACE).find(
      ([_, p]) => p === fromPalace
    )?.[0] as StarName | undefined;
    if (star) {
      starPalaces[toPalace] = star;
    }
  }

  // 中五宫：天禽星寄坤二宫，天盘干取中宫地盘干
  // 天禽星随值符转动，如果值符不是天禽，天禽寄到坤二宫
  if (zhiFu !== '天禽') {
    // 天禽跟随值符落宫
    starPalaces[targetPalace === 5 ? 2 : targetPalace] =
      starPalaces[targetPalace === 5 ? 2 : targetPalace] || '天禽';
  }
  // 中宫的天盘干
  tianPanGan[5] = diPan[5];
  starPalaces[5] = '天禽';

  return { tianPanGan, starPalaces };
}

// ─── 人盘排布（小值符法） ────────────────────────────────────────────────────

// 八门固定循环顺序
const GATE_CYCLE: Exclude<GateName, '中'>[] = ['休', '生', '伤', '杜', '景', '死', '惊', '开'];

/**
 * 排布人盘：八门按小值符法排布
 *
 * 小值符法：
 * 1. 值使门从原宫按洛书九宫数字顺序移动 ganIndex 步（甲=0不动，乙=1，…，癸=9）
 *    用 mod 9 计算（含中五宫），若落中五宫则寄坤二宫
 * 2. 其余门按固定循环(休→生→伤→杜→景→死→惊→开)沿空间顺/逆时针排列
 * 3. 阳遁顺时针(ROTATE_ORDER)，阴遁逆时针
 */
export function layoutRenPan(
  zhiShi: Exclude<GateName, '中'>,
  hourGan: TianGan,
  dunType: '阳遁' | '阴遁',
): Record<PalaceIndex, Exclude<GateName, '中'>> {
  const ganIndex = TIAN_GAN.indexOf(hourGan);
  const direction = dunType === '阳遁' ? 1 : -1;

  const zhiShiCycleIdx = GATE_CYCLE.indexOf(zhiShi);
  const zhiShiOriginal = GATE_ORIGINAL_PALACE[zhiShi];

  // 值使目标宫：用 mod 9（含中宫）计算
  let target = ((zhiShiOriginal - 1 + ganIndex * direction) % 9 + 9) % 9 + 1;
  if (target === 5) target = 2; // 中五宫寄坤二宫

  // 从值使目标宫开始，沿 ROTATE_ORDER（空间顺/逆时针）依次排列八门
  const startIdx = ROTATE_ORDER.indexOf(target as PalaceIndex);
  const gatePalaces = {} as Record<PalaceIndex, Exclude<GateName, '中'>>;
  for (let i = 0; i < 8; i++) {
    const gate = GATE_CYCLE[(zhiShiCycleIdx + i) % 8];
    const ringIdx = ((startIdx + i * direction) % 8 + 8) % 8;
    gatePalaces[ROTATE_ORDER[ringIdx]] = gate;
  }

  return gatePalaces;
}

// ─── 神盘排布 ────────────────────────────────────────────────────────────────

/**
 * 排布神盘：八神从值符落宫开始，阳遁顺排，阴遁逆排
 */
export function layoutShenPan(
  zhiFuTargetPalace: PalaceIndex,
  dunType: '阳遁' | '阴遁'
): Record<PalaceIndex, DeityName> {
  const deityNames = dunType === '阳遁' ? DEITY_NAMES_YANG : DEITY_NAMES_YIN;

  const startIdx = ROTATE_ORDER.indexOf(
    zhiFuTargetPalace === 5 ? 2 : zhiFuTargetPalace
  );

  const result = {} as Record<PalaceIndex, DeityName>;
  for (let i = 0; i < 8; i++) {
    let palaceOrderIdx: number;
    if (dunType === '阳遁') {
      palaceOrderIdx = (startIdx + i) % 8;
    } else {
      palaceOrderIdx = ((startIdx - i) % 8 + 8) % 8;
    }
    const palace = ROTATE_ORDER[palaceOrderIdx];
    result[palace] = deityNames[i] as DeityName;
  }

  return result;
}

// ─── 主排盘函数 ──────────────────────────────────────────────────────────────

/**
 * 根据输入时间生成完整的奇门遁甲盘面
 */
export function generateChart(input: ChartInput): QimenChart {
  // 1. 四柱
  const siZhu = getSiZhu(input);

  // 2. 节气信息
  const jieQiInfo = getJieQiInfo(input);

  // 3. 定局（拆补法）
  const { yuan, juNumber, dunType } = getYuanAndJu(input, jieQiInfo);

  // 4. 地盘
  const diPan = layoutDiPan(juNumber, dunType);

  // 5. 旬首与空亡（提前计算，值符值使需要旬首六仪）
  const hourGan = siZhu.hour.gan;
  const { xunShou, kongWang, xunShouYi } = getXunShouInfo(siZhu.hour.gan, siZhu.hour.zhi);

  // 6. 值符值使（由旬首六仪决定）
  const { zhiFu, zhiShi } = getZhiFuZhiShi(xunShouYi as SanQiLiuYi, diPan);

  // 7. 天盘（九星 + 天盘干）
  const { tianPanGan, starPalaces } = layoutTianPan(diPan, zhiFu, hourGan, dunType);

  // 8. 人盘（八门 — 小值符法，阳遁顺时针/阴遁逆时针）
  const gatePalaces = layoutRenPan(zhiShi, hourGan, dunType);

  // 9. 值符落宫（用于神盘）— 时干在地盘的位置
  let shiGan: SanQiLiuYi = hourGan as SanQiLiuYi;
  if (hourGan === '甲') shiGan = '戊';
  let zhiFuTarget: PalaceIndex = 1;
  for (const [palace, gan] of Object.entries(diPan)) {
    if (gan === shiGan) {
      zhiFuTarget = Number(palace) as PalaceIndex;
      break;
    }
  }

  // 10. 神盘
  const deityPalaces = layoutShenPan(zhiFuTarget, dunType);

  // 11. 组装九宫
  const palaces = {} as Record<PalaceIndex, Palace>;
  for (let i = 1; i <= 9; i++) {
    const idx = i as PalaceIndex;
    palaces[idx] = {
      index: idx,
      name: PALACE_NAMES[idx - 1],
      diPanGan: diPan[idx],
      tianPanGan: tianPanGan[idx] || diPan[idx], // 中宫天盘干
      star: starPalaces[idx] || '天禽',
      gate: gatePalaces[idx] || '死', // 中宫无门，默认
      deity: deityPalaces[idx] || '值符',
      isEmpty: false, // 后续计算
    };
  }

  // 12. 标记空亡宫位
  // 空亡地支对应的宫位
  const zhiToPalace: Record<string, PalaceIndex> = {
    '子': 1, '丑': 8, '寅': 8, '卯': 3, '辰': 4,
    '巳': 4, '午': 9, '未': 2, '申': 2, '酉': 7,
    '戌': 7, '亥': 6,
  };
  for (const zhi of kongWang) {
    const palace = zhiToPalace[zhi];
    if (palace && palaces[palace]) {
      palaces[palace].isEmpty = true;
    }
  }

  return {
    input,
    siZhu,
    jieQi: jieQiInfo.current,
    yuan,
    dunType,
    juNumber,
    zhiFu,
    zhiShi,
    palaces,
    xunShou,
    kongWang,
  };
}
