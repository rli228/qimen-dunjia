import { Solar, Lunar, SolarUtil } from 'lunar-javascript';
import {
  TIAN_GAN,
  DI_ZHI,
  JIE_QI,
  YANG_DUN_JU,
  YIN_DUN_JU,
  type TianGan,
  type DiZhi,
  type JieQi,
} from './constants';
import type { SiZhu, ChartInput } from './types';

// ─── 四柱计算 ────────────────────────────────────────────────────────────────

export function getSiZhu(input: ChartInput): SiZhu {
  const solar = input.isLunar
    ? Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getSolar()
    : Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);

  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  return {
    year: {
      gan: eightChar.getYearGan() as TianGan,
      zhi: eightChar.getYearZhi() as DiZhi,
    },
    month: {
      gan: eightChar.getMonthGan() as TianGan,
      zhi: eightChar.getMonthZhi() as DiZhi,
    },
    day: {
      gan: eightChar.getDayGan() as TianGan,
      zhi: eightChar.getDayZhi() as DiZhi,
    },
    hour: {
      gan: eightChar.getTimeGan() as TianGan,
      zhi: eightChar.getTimeZhi() as DiZhi,
    },
  };
}

// ─── 时干支索引 ──────────────────────────────────────────────────────────────

export function getGanIndex(gan: TianGan): number {
  return TIAN_GAN.indexOf(gan);
}

export function getZhiIndex(zhi: DiZhi): number {
  return DI_ZHI.indexOf(zhi);
}

// 根据天干地支计算干支序号（1-60）
export function getGanZhiIndex(gan: TianGan, zhi: DiZhi): number {
  const ganIdx = getGanIndex(gan);
  const zhiIdx = getZhiIndex(zhi);
  // 天干地支组合的序号公式
  for (let i = 0; i < 60; i++) {
    if (i % 10 === ganIdx && i % 12 === zhiIdx) {
      return i + 1;
    }
  }
  return 1;
}

// ─── 节气与定局 ──────────────────────────────────────────────────────────────

// 阳遁节气（冬至到芒种）
const YANG_JIE_QI: JieQi[] = [
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
  '春分', '清明', '谷雨', '立夏', '小满', '芒种',
];

// 阴遁节气（夏至到大雪）
const YIN_JIE_QI: JieQi[] = [
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
];

export interface JieQiInfo {
  current: JieQi;         // 当前所处节气
  currentDate: Date;      // 当前节气的精确时间
  next: JieQi;            // 下一个节气
  nextDate: Date;         // 下一个节气的精确时间
}

/**
 * 获取指定日期所处的节气信息
 * 利用 lunar-javascript 的精确节气计算
 */
export function getJieQiInfo(input: ChartInput): JieQiInfo {
  const solar = input.isLunar
    ? Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getSolar()
    : Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);

  const lunar = solar.getLunar();

  // 获取当前节气和上一个节气
  const prevJieQi = lunar.getPrevJieQi(true);
  const nextJieQi = lunar.getNextJieQi(true);

  const prevSolar = prevJieQi.getSolar();
  const nextSolar = nextJieQi.getSolar();

  return {
    current: prevJieQi.getName() as JieQi,
    currentDate: new Date(
      prevSolar.getYear(), prevSolar.getMonth() - 1, prevSolar.getDay(),
      prevSolar.getHour(), prevSolar.getMinute(), prevSolar.getSecond()
    ),
    next: nextJieQi.getName() as JieQi,
    nextDate: new Date(
      nextSolar.getYear(), nextSolar.getMonth() - 1, nextSolar.getDay(),
      nextSolar.getHour(), nextSolar.getMinute(), nextSolar.getSecond()
    ),
  };
}

/**
 * 判断阳遁还是阴遁
 */
export function getDunType(jieQi: JieQi): '阳遁' | '阴遁' {
  if (YANG_JIE_QI.includes(jieQi)) return '阳遁';
  if (YIN_JIE_QI.includes(jieQi)) return '阴遁';
  throw new Error(`未知节气: ${jieQi}`);
}

// ─── 拆补法定局 ──────────────────────────────────────────────────────────────

/**
 * 使用拆补法确定上中下三元及局数
 *
 * 拆补法核心逻辑：
 * 1. 找到当前节气开始后的第一个甲/己日（符头），作为上元起始
 * 2. 每元5天（一旬前半），三元共15天
 * 3. 如果当前日期在符头之前（节气开始后、符头之前），使用上个节气的局数（"拆"）
 * 4. 如果当前日期在符头之后，按正常三元计算（"补"）
 */
export function getYuanAndJu(input: ChartInput, jieQiInfo: JieQiInfo): {
  yuan: '上元' | '中元' | '下元';
  juNumber: number;
  dunType: '阳遁' | '阴遁';
} {
  const solar = input.isLunar
    ? Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getSolar()
    : Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);

  const lunar = solar.getLunar();
  const dayGanZhiIndex = getGanZhiIndex(
    lunar.getDayGanExact() as TianGan,
    lunar.getDayZhiExact() as DiZhi
  );

  // 找到当前节气之后的第一个符头（甲或己日, 即天干序号 % 5 === 0 或 === 5）
  // 符头是甲日或己日，即上元的第一天
  const dayGan = lunar.getDayGanExact() as TianGan;
  const ganIndex = getGanIndex(dayGan);

  // 计算当前日期距节气开始的天数
  const inputDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
  const jieQiDate = new Date(
    jieQiInfo.currentDate.getFullYear(),
    jieQiInfo.currentDate.getMonth(),
    jieQiInfo.currentDate.getDate()
  );
  const daysSinceJieQi = Math.floor((inputDate.getTime() - jieQiDate.getTime()) / (24 * 60 * 60 * 1000));

  // 计算当前日在旬中的位置（0-9，甲为0，己为5）
  // 符头位置：距离上一个甲/己日的天数
  const daysFromFuTou = ganIndex % 5; // 距上一个符头的天数

  // 符头距节气的天数
  const fuTouDaysSinceJieQi = daysSinceJieQi - daysFromFuTou;

  let yuan: '上元' | '中元' | '下元';
  let currentJieQi = jieQiInfo.current;

  if (fuTouDaysSinceJieQi < 0) {
    // "拆"的情况：符头在节气之前，说明当前用的是上个节气的尾元
    // 需要使用上一个节气的局数
    currentJieQi = getPrevJieQi(jieQiInfo.current);

    // 计算在上个节气中应属于哪一元
    // 这里简化处理：符头在节气前，取上个节气的下元
    yuan = '下元';
  } else {
    // 正常情况或"补"的情况
    // 根据符头距节气的天数确定三元
    const fuTouOrder = Math.floor(fuTouDaysSinceJieQi / 5);
    if (fuTouOrder === 0) {
      yuan = '上元';
    } else if (fuTouOrder === 1) {
      yuan = '中元';
    } else {
      yuan = '下元';
    }
  }

  const dunType = getDunType(currentJieQi);
  const juTable = dunType === '阳遁' ? YANG_DUN_JU : YIN_DUN_JU;
  const juArray = juTable[currentJieQi];

  if (!juArray) {
    throw new Error(`节气 ${currentJieQi} 无对应局数`);
  }

  const yuanIndex = yuan === '上元' ? 0 : yuan === '中元' ? 1 : 2;
  const juNumber = juArray[yuanIndex];

  return { yuan, juNumber, dunType };
}

/**
 * 获取上一个节气
 */
function getPrevJieQi(current: JieQi): JieQi {
  const idx = JIE_QI.indexOf(current);
  if (idx <= 0) return JIE_QI[JIE_QI.length - 1];
  return JIE_QI[idx - 1];
}

// ─── 旬首与空亡 ──────────────────────────────────────────────────────────────

import { XUN_SHOU } from './constants';

/**
 * 根据时干支找到所在旬首和空亡
 */
export function getXunShouInfo(hourGan: TianGan, hourZhi: DiZhi): {
  xunShou: string;
  kongWang: DiZhi[];
} {
  const ganIdx = getGanIndex(hourGan);
  const zhiIdx = getZhiIndex(hourZhi);

  // 旬首的地支 = 当前地支 - 天干序号（回退到甲）
  const xunZhiIdx = ((zhiIdx - ganIdx) % 12 + 12) % 12;
  const xunZhi = DI_ZHI[xunZhiIdx];
  const xunShou = `甲${xunZhi}`;

  const found = XUN_SHOU.find(x => x.ganZhi === xunShou);
  if (!found) {
    throw new Error(`未找到旬首: ${xunShou}`);
  }

  return {
    xunShou: found.ganZhi,
    kongWang: [...found.kongWang],
  };
}
