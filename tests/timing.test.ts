/**
 * 定应期测试
 *
 * 书上每个实占案例末尾都有应期断语并附验证结果，是这套体系里唯一天然可检验的
 * 输出 ——「小吉」无法证伪，「3 月 18 日」可以。
 *
 * 断言的是**方法是否被正确应用**，不是预测是否准确：给定盘面，某条定应期方法
 * 应推出哪个地支/宫数，是确定性的；那个日子是否真的发生了事，不归代码管。
 */

import { describe, it, expect } from 'vitest';
import { generateChart } from '../lib/qimen/algorithm';
import { analyzeTiming, isInnerPalace } from '../lib/qimen/interpretation/timing';
import { analyzeYongShen } from '../lib/qimen/interpretation/yongShenAnalysis';
import type { PalaceIndex } from '../lib/qimen/constants';

function yongShenPalacesOf(chart: ReturnType<typeof generateChart>, eventType: Parameters<typeof analyzeYongShen>[1]) {
  return analyzeYongShen(chart, eventType).locations
    .map(l => l.palace)
    .filter((p): p is PalaceIndex => p !== null);
}

describe('内外盘', () => {
  it('坎1 坤2 震3 巽4 中5 为内盘，乾6 兑7 艮8 离9 为外盘', () => {
    for (const p of [1, 2, 3, 4, 5] as PalaceIndex[]) expect(isInnerPalace(p)).toBe(true);
    for (const p of [6, 7, 8, 9] as PalaceIndex[]) expect(isInnerPalace(p)).toBe(false);
  });
});

describe('定应期方法', () => {
  // 钱物丢失·实例三（书页 258）：丙子年辛卯月庚申日壬午时，阳遁6局
  const chart = generateChart({ year: 1996, month: 3, day: 24, hour: 11, minute: 45, method: '拆补法' });

  it('值使门所临之干与所落宫数都被推出', () => {
    const r = analyzeTiming(chart, []);
    const byGan = r.candidates.find(c => c.method.includes('值使门所临之干'));
    const byNum = r.candidates.find(c => c.method.includes('值使门所落宫数'));
    expect(byGan, '缺少「值使门所临之干」候选').toBeDefined();
    expect(byNum, '缺少「值使门所落宫数」候选').toBeDefined();
    // 依据必须落在盘上，不能凭空
    expect(byGan!.basis).toContain(chart.zhiShi);
    expect(Number(byNum!.value)).toBeGreaterThanOrEqual(1);
    expect(Number(byNum!.value)).toBeLessThanOrEqual(9);
  });

  it('空亡地支同时给出「填实」与「冲实」两个应期', () => {
    const r = analyzeTiming(chart, []);
    for (const kz of chart.kongWang) {
      expect(r.candidates.some(c => c.method.includes('填实') && c.value === `${kz}日`)).toBe(true);
      expect(r.candidates.some(c => c.method.includes('冲实') && c.basis.includes(kz))).toBe(true);
    }
  });

  it('日支时支的三合六合都被列出', () => {
    const r = analyzeTiming(chart, []);
    const dayCand = r.candidates.find(c => c.basis === `日支${chart.siZhu.day.zhi}`);
    expect(dayCand).toBeDefined();
    // 庚申日 → 申：六合巳、三合子辰
    if (chart.siZhu.day.zhi === '申') {
      expect(dayCand!.value).toContain('巳');
      expect(dayCand!.value).toContain('子');
      expect(dayCand!.value).toContain('辰');
    }
  });

  it('用神全落内盘判为「近/快」，全落外盘判为「远/慢」', () => {
    expect(analyzeTiming(chart, [1, 3] as PalaceIndex[]).distance).toBe('近/快');
    expect(analyzeTiming(chart, [7, 9] as PalaceIndex[]).distance).toBe('远/慢');
    expect(analyzeTiming(chart, [1, 9] as PalaceIndex[]).distance).toBe('中');
  });

  it('近快断日时，远慢断年月', () => {
    expect(analyzeTiming(chart, [1, 3] as PalaceIndex[]).suggestedUnit).toBe('日');
    expect(analyzeTiming(chart, [7, 9] as PalaceIndex[]).suggestedUnit).toBe('月');
  });

  it('六仪所带地支只对六仪生效，三奇乙丙丁不带地支', () => {
    // 戊子 己戌 庚申 辛午 壬辰 癸寅；乙丙丁无
    const r = analyzeTiming(chart, [1, 2, 3, 4, 6, 7, 8, 9] as PalaceIndex[]);
    const yiCands = r.candidates.filter(c => c.method.includes('天盘六仪所带地支'));
    for (const c of yiCands) {
      expect(c.basis).toMatch(/天盘[戊己庚辛壬癸]/);
    }
  });

  it('每条候选都注明出处页码，且依据不为空', () => {
    const r = analyzeTiming(chart, yongShenPalacesOf(chart, '失物寻找'));
    expect(r.candidates.length).toBeGreaterThan(0);
    for (const c of r.candidates) {
      expect(c.method, `「${c.method}」缺少书页出处`).toMatch(/书页 \d+/);
      expect(c.basis.length).toBeGreaterThan(0);
      expect(c.explanation.length).toBeGreaterThan(0);
    }
  });

  it('未实现的方法被如实列出，而不是静默省略', () => {
    const r = analyzeTiming(chart, []);
    expect(r.notImplemented.length).toBeGreaterThan(0);
    for (const n of r.notImplemented) expect(n).toMatch(/第 [\d/]+ 条/);
  });

  it('对全部九个事类都能产出候选而不抛异常', () => {
    for (const key of ['婚姻感情', '求财经商', '考试求学', '出行远行', '疾病健康',
                       '官讼诉讼', '求职面试', '失物寻找', '体育竞猜'] as const) {
      const r = analyzeTiming(chart, yongShenPalacesOf(chart, key));
      expect(r.candidates.length, key).toBeGreaterThan(0);
    }
  });
});

describe('星门伏吟判为应期迟缓', () => {
  // 钱物丢失·实例四（书页 260）：丁丑年丁未月辛酉日甲午时，阴5局，星门俱伏吟
  const fuYin = generateChart({ year: 1997, month: 7, day: 18, hour: 12, minute: 3, method: '拆补法' });

  it('伏吟盘即便用神在内盘也判为远/慢', () => {
    const r = analyzeTiming(fuYin, [1, 2] as PalaceIndex[]);
    expect(r.distance).toBe('远/慢');
    expect(r.distanceBasis.some(b => b.includes('伏吟'))).toBe(true);
  });
});
