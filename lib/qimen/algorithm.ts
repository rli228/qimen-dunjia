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
 * 时辰的天干对应一个六仪或三奇，
 * 找到该六仪/三奇在地盘中所处的宫位，
 * 该宫位原始的九星即为值符，原始的八门即为值使
 */
export function getZhiFuZhiShi(
  hourGan: TianGan,
  diPan: Record<PalaceIndex, SanQiLiuYi>,
  dunType: '阳遁' | '阴遁'
): {
  zhiFu: StarName;
  zhiShi: Exclude<GateName, '中'>;
  zhiFuOriginalPalace: PalaceIndex;
} {
  // 时干如果是甲，需转换为对应的六仪
  let shiGan: SanQiLiuYi = hourGan as SanQiLiuYi;
  if (hourGan === '甲') {
    // 甲遁于戊下，时干为甲时按戊处理
    shiGan = '戊';
  }

  // 找到时干（六仪/三奇）在地盘上的宫位
  let shiGanPalace: PalaceIndex | null = null;
  for (const [palace, gan] of Object.entries(diPan)) {
    if (gan === shiGan) {
      shiGanPalace = Number(palace) as PalaceIndex;
      break;
    }
  }

  if (!shiGanPalace) {
    throw new Error(`未找到时干 ${shiGan} 在地盘上的位置`);
  }

  // 找到该宫位原始的九星（值符）和八门（值使）
  const zhiFu = Object.entries(STAR_ORIGINAL_PALACE).find(
    ([_, palace]) => palace === shiGanPalace
  )![0] as StarName;

  // 中五宫寄坤二宫：如果值符是天禽星，则按坤二宫处理
  const effectivePalace = shiGanPalace === 5 ? 2 : shiGanPalace;
  const zhiShi = Object.entries(GATE_ORIGINAL_PALACE).find(
    ([_, palace]) => palace === effectivePalace
  )![0] as Exclude<GateName, '中'>;

  return { zhiFu, zhiShi, zhiFuOriginalPalace: shiGanPalace };
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

// ─── 人盘排布（八门转盘） ────────────────────────────────────────────────────

/**
 * 排布人盘：值使（八门）从原始宫位转到时干落宫
 *
 * 与天盘类似，但值使的旋转起点是值使门的原始宫位
 */
export function layoutRenPan(
  diPan: Record<PalaceIndex, SanQiLiuYi>,
  zhiShi: Exclude<GateName, '中'>,
  hourGan: TianGan,
): Record<PalaceIndex, Exclude<GateName, '中'>> {
  let shiGan: SanQiLiuYi = hourGan as SanQiLiuYi;
  if (hourGan === '甲') shiGan = '戊';

  // 值使原始宫位
  const zhiShiOriginal = GATE_ORIGINAL_PALACE[zhiShi];

  // 时干在地盘的宫位
  let targetPalace: PalaceIndex = 1;
  for (const [palace, gan] of Object.entries(diPan)) {
    if (gan === shiGan) {
      targetPalace = Number(palace) as PalaceIndex;
      break;
    }
  }

  // 计算旋转步数
  const fromIdx = ROTATE_ORDER.indexOf(zhiShiOriginal);
  const toIdx = ROTATE_ORDER.indexOf(targetPalace === 5 ? 2 : targetPalace);
  const steps = ((toIdx - fromIdx) % 8 + 8) % 8;

  // 旋转八门
  const gatePalaces = {} as Record<PalaceIndex, Exclude<GateName, '中'>>;
  for (let i = 0; i < 8; i++) {
    const fromPalace = ROTATE_ORDER[i];
    const toPalace = ROTATE_ORDER[(i + steps) % 8];

    const gate = Object.entries(GATE_ORIGINAL_PALACE).find(
      ([_, p]) => p === fromPalace
    )?.[0] as Exclude<GateName, '中'> | undefined;
    if (gate) {
      gatePalaces[toPalace] = gate;
    }
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

  // 5. 值符值使
  const hourGan = siZhu.hour.gan;
  const { zhiFu, zhiShi } = getZhiFuZhiShi(hourGan, diPan, dunType);

  // 6. 天盘（九星 + 天盘干）
  const { tianPanGan, starPalaces } = layoutTianPan(diPan, zhiFu, hourGan, dunType);

  // 7. 人盘（八门）
  const gatePalaces = layoutRenPan(diPan, zhiShi, hourGan);

  // 8. 值符落宫（用于神盘）
  let shiGan: SanQiLiuYi = hourGan as SanQiLiuYi;
  if (hourGan === '甲') shiGan = '戊';
  let zhiFuTarget: PalaceIndex = 1;
  for (const [palace, gan] of Object.entries(diPan)) {
    if (gan === shiGan) {
      zhiFuTarget = Number(palace) as PalaceIndex;
      break;
    }
  }

  // 9. 神盘
  const deityPalaces = layoutShenPan(zhiFuTarget, dunType);

  // 10. 旬首与空亡
  const { xunShou, kongWang } = getXunShouInfo(siZhu.hour.gan, siZhu.hour.zhi);

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
