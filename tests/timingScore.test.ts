/**
 * 应期命中率打分测试
 *
 * 这个模块将来会产出「哪种定应期方法有效」的唯一数字依据，
 * 所以它自己判错一条，结论就全歪了。
 */

import { describe, it, expect } from 'vitest';
import { candidateHits, scoreTiming } from '../lib/qimen/research/timingScore';
import type { EventRecord } from '../lib/qimen/research/schema';

describe('单条候选命中判定', () => {
  // 1996-05-26 是癸亥日（书页 156 实例：值使休门临癸，断癸亥日，果然应验）
  const actual = '1996-05-26';

  it('干日：日干相符即命中', () => {
    expect(candidateHits({ value: '癸日', unit: '日' }, '1996-05-23', actual)).toBe(true);
    expect(candidateHits({ value: '甲日', unit: '日' }, '1996-05-23', actual)).toBe(false);
  });

  it('支日：日支相符即命中', () => {
    expect(candidateHits({ value: '亥日', unit: '日' }, '1996-05-23', actual)).toBe(true);
    expect(candidateHits({ value: '子日', unit: '日' }, '1996-05-23', actual)).toBe(false);
  });

  it('多值候选任一相符即命中', () => {
    expect(candidateHits({ value: '丑日或午日', unit: '日' }, '1996-05-23', actual)).toBe(false);
    expect(candidateHits({ value: '亥日或申日', unit: '日' }, '1996-05-23', actual)).toBe(true);
  });

  it('宫数：按天数差比对，容差 ±1 天', () => {
    // 5/23 起盘，5/26 发生 → 相隔 3 天
    expect(candidateHits({ value: '3', unit: '宫数' }, '1996-05-23', actual)).toBe(true);
    expect(candidateHits({ value: '4', unit: '宫数' }, '1996-05-23', actual)).toBe(true);  // 容差内
    expect(candidateHits({ value: '6', unit: '宫数' }, '1996-05-23', actual)).toBe(false);
  });

  it('无法判定的返回 null，而不是硬判成未命中', () => {
    expect(candidateHits({ value: '强', unit: '日' }, '1996-05-23', actual)).toBeNull();
    expect(candidateHits({ value: '3', unit: '年' }, '1996-05-23', actual)).toBeNull();
    expect(candidateHits({ value: '癸日', unit: '日' }, '1996-05-23', '不是日期')).toBeNull();
  });
});

// ─── 汇总 ────────────────────────────────────────────────────────────────────

function rec(over: Partial<EventRecord> = {}): EventRecord {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: '1996-05-23T20:00:00.000Z',
    version: 1,
    eventType: '疾病健康',
    questionText: '测病情',
    chartSnapshot: {} as never,
    features: {} as never,
    systemPrediction: {
      tier: '小凶', coherence: '中', conclusion: '…',
      timing: {
        distance: '近/快', suggestedUnit: '日',
        candidates: [
          { method: '值使门所临之干为应期（书页 148 第 11 条）', value: '癸日', unit: '日' },
          { method: '值使门所落宫数为应期（书页 148 第 11 条）', value: '3', unit: '宫数' },
        ],
      },
    },
    outcome: null,
    ...over,
  } as EventRecord;
}

describe('汇总报告', () => {
  it('无记录时明确说明尚不可评分，而不是给出 0%', () => {
    const r = scoreTiming([]);
    expect(r.scorable).toBe(0);
    expect(r.byMethod).toEqual([]);
    expect(r.caveat).toContain('尚无可评分记录');
  });

  it('已回访但没填实际日期的，单独计数而不计入命中率', () => {
    const r = scoreTiming([
      rec({ outcome: { recordedAt: 'x', outcome: true, confidence: 3, actualResult: '好转' } }),
    ]);
    expect(r.missingDate).toBe(1);
    expect(r.scorable).toBe(0);
  });

  it('未回访的计入 pending', () => {
    expect(scoreTiming([rec(), rec()]).pending).toBe(2);
  });

  it('按方法分别统计命中率', () => {
    const r = scoreTiming([
      rec({ outcome: { recordedAt: 'x', outcome: true, confidence: 3, actualResult: '去世', actualDate: '1996-05-26' } }),
    ]);
    const byGan = r.byMethod.find(m => m.method.includes('所临之干'))!;
    const byNum = r.byMethod.find(m => m.method.includes('所落宫数'))!;
    expect(byGan.hits).toBe(1);   // 癸亥日，日干癸 ✓
    expect(byNum.hits).toBe(1);   // 相隔 3 天 ✓
    expect(byGan.hitRate).toBe(1);
  });

  it('样本不足时给出警告，避免把个位数当结论', () => {
    const r = scoreTiming([
      rec({ outcome: { recordedAt: 'x', outcome: true, confidence: 3, actualResult: '', actualDate: '1996-05-26' } }),
    ]);
    expect(r.caveat).toContain('样本仅 1 条');
    expect(r.caveat).toContain('不足以判断');
  });

  it('方法名按书页出处前的部分归并，同法不同页不会被拆成两条', () => {
    const r = scoreTiming([
      rec({
        systemPrediction: {
          tier: '平', coherence: '中', conclusion: '',
          timing: {
            distance: '中', suggestedUnit: '日',
            candidates: [
              { method: '庚格应期·按日干阴阳（书页 148 第 7 条）', value: '癸日', unit: '日' },
              { method: '庚格应期·按日干阴阳（书页 148 第 7 条）', value: '亥日', unit: '日' },
            ],
          },
        },
        outcome: { recordedAt: 'x', outcome: true, confidence: 3, actualResult: '', actualDate: '1996-05-26' },
      }),
    ]);
    expect(r.byMethod.length).toBe(1);
    expect(r.byMethod[0].evaluated).toBe(2);
    expect(r.byMethod[0].hits).toBe(2);
  });
});
