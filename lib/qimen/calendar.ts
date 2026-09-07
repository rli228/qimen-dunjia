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

// ─── 定局（拆补法 / 置闰法） ─────────────────────────────────────────────────

/**
 * 根据定局方法分发
 */
export function getYuanAndJu(input: ChartInput, jieQiInfo: JieQiInfo): {
  yuan: '上元' | '中元' | '下元';
  juNumber: number;
  dunType: '阳遁' | '阴遁';
} {
  const method = input.method || '拆补法';
  return method === '置闰法'
    ? getYuanAndJuZhiRun(input, jieQiInfo)
    : getYuanAndJuChaiBu(input, jieQiInfo);
}

/**
 * 拆补法定局
 *
 * 核心逻辑：
 * 1. 节气起始日所在的半旬（甲/己开头的5天周期），从节气当天起算到该半旬结束 = 上元
 *    （若节气恰好在符头甲/己日，上元为完整5天；否则上元不足5天，即"拆"）
 * 2. 接下来完整的5天 = 中元
 * 3. 再接下来5天 = 下元
 * 4. 三元之后、下一节气之前的剩余天数 = "补"，使用下一节气的上元局数
 */
function getYuanAndJuChaiBu(input: ChartInput, jieQiInfo: JieQiInfo): {
  yuan: '上元' | '中元' | '下元';
  juNumber: number;
  dunType: '阳遁' | '阴遁';
} {
  const solar = input.isLunar
    ? Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getSolar()
    : Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);

  const lunar = solar.getLunar();
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

  // 节气起始日的天干序号（通过当前日天干回推）
  const jieQiGanIndex = ((ganIndex - daysSinceJieQi) % 10 + 10) % 10;

  // 节气起始日在半旬中的位置（0=甲/己, 1=乙/庚, ..., 4=戊/癸）
  const jieQiDaysIntoHalfXun = jieQiGanIndex % 5;

  // 上元天数：从节气起始日到该半旬结束
  // 若节气恰在符头上（甲/己日），上元为完整5天
  const shangYuanLen = jieQiDaysIntoHalfXun === 0 ? 5 : (5 - jieQiDaysIntoHalfXun);

  let yuan: '上元' | '中元' | '下元';
  let currentJieQi = jieQiInfo.current;

  if (daysSinceJieQi < shangYuanLen) {
    yuan = '上元';
  } else if (daysSinceJieQi < shangYuanLen + 5) {
    yuan = '中元';
  } else if (daysSinceJieQi < shangYuanLen + 10) {
    yuan = '下元';
  } else {
    // "补"的情况：三元已过，使用下一节气的上元局数
    currentJieQi = jieQiInfo.next;
    yuan = '上元';
  }

  return lookupJu(currentJieQi, yuan);
}

/**
 * 置闰法定局
 *
 * 核心逻辑：
 * 1. 找到节气当天或之前最近的旬首（甲日），即符头
 * 2. 从符头起：第0-4天=上元，第5-9天=中元，第10-14天=下元
 * 3. 第15天及以后（闰奇）= 使用下一节气上元局数
 */
function getYuanAndJuZhiRun(input: ChartInput, jieQiInfo: JieQiInfo): {
  yuan: '上元' | '中元' | '下元';
  juNumber: number;
  dunType: '阳遁' | '阴遁';
} {
  const solar = input.isLunar
    ? Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getSolar()
    : Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);

  const lunar = solar.getLunar();
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

  // 节气起始日的天干序号
  const jieQiGanIndex = ((ganIndex - daysSinceJieQi) % 10 + 10) % 10;

  // 节气日距符头（甲日/旬首）的天数
  // 甲=0, 所以 jieQiGanIndex 本身就是距前一个甲日的天数
  const daysIntoXun = jieQiGanIndex;

  // 当前日期距符头（甲日）的天数
  const daysSinceFuTou = daysSinceJieQi + daysIntoXun;

  let yuan: '上元' | '中元' | '下元';
  let currentJieQi = jieQiInfo.current;

  if (daysSinceFuTou < 5) {
    yuan = '上元';
  } else if (daysSinceFuTou < 10) {
    yuan = '中元';
  } else if (daysSinceFuTou < 15) {
    yuan = '下元';
  } else {
    // 闰奇：三元已过，使用下一节气上元局数
    currentJieQi = jieQiInfo.next;
    yuan = '上元';
  }

  return lookupJu(currentJieQi, yuan);
}

/**
 * 根据节气和三元查表取局数
 */
function lookupJu(jieQi: JieQi, yuan: '上元' | '中元' | '下元'): {
  yuan: '上元' | '中元' | '下元';
  juNumber: number;
  dunType: '阳遁' | '阴遁';
} {
  const dunType = getDunType(jieQi);
  const juTable = dunType === '阳遁' ? YANG_DUN_JU : YIN_DUN_JU;
  const juArray = juTable[jieQi];

  if (!juArray) {
    throw new Error(`节气 ${jieQi} 无对应局数`);
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
  xunShouYi: string;
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
    xunShouYi: found.yiName,
  };
}
