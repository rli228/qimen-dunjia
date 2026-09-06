import { describe, it, expect } from 'vitest';
import {
  layoutDiPan,
  layoutShenPan,
  generateChart,
} from '../lib/qimen/algorithm';
import {
  getJieQiInfo,
  getSiZhu,
  getDunType,
  getXunShouInfo,
} from '../lib/qimen/calendar';
import { SAN_QI_LIU_YI, ROTATE_ORDER } from '../lib/qimen/constants';

// ─── 地盘排布测试 ────────────────────────────────────────────────────────────

describe('layoutDiPan', () => {
  it('阳遁一局：戊从坎一宫开始，按洛书顺序排布', () => {
    const diPan = layoutDiPan(1, '阳遁');
    // 阳遁洛书顺序: 1→2→3→4→5→6→7→8→9
    // 三奇六仪: 戊己庚辛壬癸丁丙乙
    expect(diPan[1]).toBe('戊'); // 坎
    expect(diPan[2]).toBe('己'); // 坤
    expect(diPan[3]).toBe('庚'); // 震
    expect(diPan[4]).toBe('辛'); // 巽
    expect(diPan[5]).toBe('壬'); // 中
    expect(diPan[6]).toBe('癸'); // 乾
    expect(diPan[7]).toBe('丁'); // 兑
    expect(diPan[8]).toBe('丙'); // 艮
    expect(diPan[9]).toBe('乙'); // 离
  });

  it('阳遁三局：戊从震三宫开始', () => {
    const diPan = layoutDiPan(3, '阳遁');
    expect(diPan[3]).toBe('戊'); // 震
    expect(diPan[4]).toBe('己'); // 巽
    expect(diPan[5]).toBe('庚'); // 中
    expect(diPan[6]).toBe('辛'); // 乾
    expect(diPan[7]).toBe('壬'); // 兑
    expect(diPan[8]).toBe('癸'); // 艮
    expect(diPan[9]).toBe('丁'); // 离
    expect(diPan[1]).toBe('丙'); // 坎
    expect(diPan[2]).toBe('乙'); // 坤
  });

  it('阴遁九局：戊从离九宫开始，按洛书逆序排布', () => {
    const diPan = layoutDiPan(9, '阴遁');
    // 阴遁洛书逆序: 9→8→7→6→5→4→3→2→1
    expect(diPan[9]).toBe('戊'); // 离
    expect(diPan[8]).toBe('己'); // 艮
    expect(diPan[7]).toBe('庚'); // 兑
    expect(diPan[6]).toBe('辛'); // 乾
    expect(diPan[5]).toBe('壬'); // 中
    expect(diPan[4]).toBe('癸'); // 巽
    expect(diPan[3]).toBe('丁'); // 震
    expect(diPan[2]).toBe('丙'); // 坤
    expect(diPan[1]).toBe('乙'); // 坎
  });

  it('阴遁一局：戊从坎一宫开始，按洛书逆序排布', () => {
    const diPan = layoutDiPan(1, '阴遁');
    // 阴遁逆序: 9→8→7→6→5→4→3→2→1, 戊起于1
    // 1在逆序中的位置是最后, 所以戊在坎一, 然后逆序继续: 己→离九, 庚→艮八...
    expect(diPan[1]).toBe('戊');
    expect(diPan[9]).toBe('己');
    expect(diPan[8]).toBe('庚');
    expect(diPan[7]).toBe('辛');
    expect(diPan[6]).toBe('壬');
    expect(diPan[5]).toBe('癸');
    expect(diPan[4]).toBe('丁');
    expect(diPan[3]).toBe('丙');
    expect(diPan[2]).toBe('乙');
  });

  it('地盘始终包含全部九个三奇六仪', () => {
    for (let ju = 1; ju <= 9; ju++) {
      const diPanYang = layoutDiPan(ju, '阳遁');
      const diPanYin = layoutDiPan(ju, '阴遁');

      const yangValues = Object.values(diPanYang).sort();
      const yinValues = Object.values(diPanYin).sort();
      const expected = [...SAN_QI_LIU_YI].sort();

      expect(yangValues).toEqual(expected);
      expect(yinValues).toEqual(expected);
    }
  });
});

// ─── 神盘排布测试 ────────────────────────────────────────────────────────────

describe('layoutShenPan', () => {
  it('阳遁：八神从值符落宫顺排', () => {
    const shenPan = layoutShenPan(1, '阳遁');
    // 从坎一宫开始，顺时针: 1→8→3→4→9→2→7→6
    expect(shenPan[1]).toBe('值符');
    expect(shenPan[8]).toBe('螣蛇');
    expect(shenPan[3]).toBe('太阴');
    expect(shenPan[4]).toBe('六合');
    expect(shenPan[9]).toBe('白虎');
    expect(shenPan[2]).toBe('玄武');
    expect(shenPan[7]).toBe('九地');
    expect(shenPan[6]).toBe('九天');
  });

  it('阴遁：八神从值符落宫逆排', () => {
    const shenPan = layoutShenPan(1, '阴遁');
    // 从坎一宫开始，逆时针: 1→6→7→2→9→4→3→8
    expect(shenPan[1]).toBe('值符');
    expect(shenPan[6]).toBe('螣蛇');
    expect(shenPan[7]).toBe('太阴');
    expect(shenPan[2]).toBe('六合');
    expect(shenPan[9]).toBe('勾陈');
    expect(shenPan[4]).toBe('朱雀');
    expect(shenPan[3]).toBe('九地');
    expect(shenPan[8]).toBe('九天');
  });

  it('八神覆盖全部八宫（不含中五宫）', () => {
    const shenPan = layoutShenPan(3, '阳遁');
    const coveredPalaces = Object.keys(shenPan).map(Number).sort((a, b) => a - b);
    expect(coveredPalaces).toEqual(ROTATE_ORDER.slice().sort((a, b) => a - b));
    expect(coveredPalaces).not.toContain(5);
  });
});

// ─── 历法测试 ────────────────────────────────────────────────────────────────

describe('calendar', () => {
  it('getSiZhu 正确计算四柱', () => {
    const siZhu = getSiZhu({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 });
    expect(siZhu.year.gan).toBeDefined();
    expect(siZhu.year.zhi).toBeDefined();
    expect(siZhu.hour.gan).toBeDefined();
    expect(siZhu.hour.zhi).toBeDefined();
  });

  it('getDunType 冬至后为阳遁', () => {
    expect(getDunType('冬至')).toBe('阳遁');
    expect(getDunType('立春')).toBe('阳遁');
    expect(getDunType('芒种')).toBe('阳遁');
  });

  it('getDunType 夏至后为阴遁', () => {
    expect(getDunType('夏至')).toBe('阴遁');
    expect(getDunType('立秋')).toBe('阴遁');
    expect(getDunType('大雪')).toBe('阴遁');
  });

  it('getXunShouInfo 甲子旬空亡为戌亥', () => {
    const info = getXunShouInfo('甲', '子');
    expect(info.xunShou).toBe('甲子');
    expect(info.kongWang).toEqual(['戌', '亥']);
  });

  it('getXunShouInfo 丙寅在甲子旬', () => {
    const info = getXunShouInfo('丙', '寅');
    expect(info.xunShou).toBe('甲子');
    expect(info.kongWang).toEqual(['戌', '亥']);
  });

  it('getXunShouInfo 甲戌旬空亡为申酉', () => {
    const info = getXunShouInfo('甲', '戌');
    expect(info.xunShou).toBe('甲戌');
    expect(info.kongWang).toEqual(['申', '酉']);
  });
});

// ─── 完整排盘冒烟测试 ────────────────────────────────────────────────────────

describe('generateChart', () => {
  it('生成完整盘面，所有宫位有值', () => {
    const chart = generateChart({
      year: 2024, month: 3, day: 15, hour: 10, minute: 0,
    });

    // 基础信息
    expect(chart.dunType).toMatch(/^(阳遁|阴遁)$/);
    expect(chart.juNumber).toBeGreaterThanOrEqual(1);
    expect(chart.juNumber).toBeLessThanOrEqual(9);
    expect(chart.yuan).toMatch(/^(上元|中元|下元)$/);
    expect(chart.zhiFu).toBeDefined();
    expect(chart.zhiShi).toBeDefined();

    // 九宫完整性
    for (let i = 1; i <= 9; i++) {
      const palace = chart.palaces[i as 1];
      expect(palace).toBeDefined();
      expect(palace.diPanGan).toBeDefined();
      expect(palace.tianPanGan).toBeDefined();
      expect(palace.star).toBeDefined();
    }
  });

  it('不同时间生成不同盘面', () => {
    const chart1 = generateChart({
      year: 2024, month: 6, day: 1, hour: 8, minute: 0,
    });
    const chart2 = generateChart({
      year: 2024, month: 12, day: 1, hour: 8, minute: 0,
    });

    // 夏季和冬季应该阴阳遁不同
    expect(chart1.dunType !== chart2.dunType || chart1.juNumber !== chart2.juNumber).toBe(true);
  });
});
