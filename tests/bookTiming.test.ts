/**
 * 应期复现测试
 *
 * 数据来自书上带验证结果的应期断语。本项目的第一份 ground truth ——
 * 「小吉」几乎无法证伪，「5 月 26 日」可以。
 *
 * ⚠ 断言的是**我们能否复现作者推出的那个应期**，不是预测准不准。
 *
 * 标注里 10/10 全部命中，但那不是准确率证据，而是出版选择偏差：
 * 作者挑出来写进书里的，自然是应验了的。真正的准确率只能靠自己积累、
 * 事先登记、事后回访得出 —— 这正是 lib/qimen/research/ 那套预注册设计的用途，
 * 而它至今一条数据都没收。
 *
 * 能在这里检验的是工程问题：给定同一张盘、同一种方法，我们的实现是否推出
 * 与作者相同的日子。这是确定性的，可以断言。
 */

import { describe, it, expect } from 'vitest';
import { generateChart } from '../lib/qimen/algorithm';
import { analyzeTiming } from '../lib/qimen/interpretation/timing';
import { analyzeYongShen } from '../lib/qimen/interpretation/yongShenAnalysis';
import type { PalaceIndex } from '../lib/qimen/constants';
import type { EventTypeKey } from '../lib/qimen/interpretation/data/yongShen';
import timingFixture from './fixtures/bookTiming.json';
import caseFixture from './fixtures/bookCases.json';

interface TimingEntry {
  id: string; caseId: string; chartMatches: boolean; page: string;
  method: string; alsoUses: string[]; quote: string;
  predicted: { kind: string; value: string; date: string };
  outcome: string; hit: boolean; note?: string;
}

const ENTRIES = timingFixture.entries as TimingEntry[];
interface CaseRow {
  id: string;
  chapter: string;
  datetime: { year: number; month: number; day: number; hour: number; minute: number };
}
const CASES = caseFixture.cases as unknown as CaseRow[];

const CHAPTER_TO_EVENT: Record<string, EventTypeKey> = {
  '恋爱婚姻预测': '婚姻感情', '工作就业预测': '求职面试', '体育竞赛预测': '体育竞猜',
  '钱物丢失预测': '失物寻找', '人体疾病预测': '疾病健康', '官司诉讼预测': '官讼诉讼',
};

/** analyzeTiming 已实现的方法；其余在 notImplemented 中声明 */
const IMPLEMENTED = new Set(['值使门所临之干', '值使门所落宫数', '时干所落宫数', '旬空填实']);

function timingFor(entry: TimingEntry) {
  const c = CASES.find(x => x.id === entry.caseId);
  if (!c) throw new Error(`${entry.id} 关联的案例 ${entry.caseId} 不存在`);
  const chart = generateChart({ ...c.datetime, method: '拆补法' });
  const eventType = CHAPTER_TO_EVENT[c.chapter];
  const palaces = analyzeYongShen(chart, eventType).locations
    .map(l => l.palace).filter((p): p is PalaceIndex => p !== null);
  return { chart, result: analyzeTiming(chart, palaces) };
}

describe('应期标注数据完整性', () => {
  it('每条标注都能关联到书载盘面案例', () => {
    for (const e of ENTRIES) {
      expect(CASES.some(c => c.id === e.caseId), `${e.id} 的 caseId ${e.caseId} 无对应案例`).toBe(true);
    }
  });

  it('每条标注都带原文引用、验证结果与页码', () => {
    for (const e of ENTRIES) {
      expect(e.quote.length, e.id).toBeGreaterThan(10);
      expect(e.outcome.length, e.id).toBeGreaterThan(5);
      expect(e.page, e.id).toMatch(/^\d+$/);
    }
  });
});

describe('复现作者的应期推算', () => {
  const testable = ENTRIES.filter(e => e.chartMatches && IMPLEMENTED.has(e.method));

  it('可检验的条目数大于零（否则本测试毫无意义）', () => {
    expect(testable.length).toBeGreaterThan(0);
  });

  for (const e of testable) {
    it(`${e.id}（书页 ${e.page}）以「${e.method}」推出「${e.predicted.value}」`, () => {
      const { result } = timingFor(e);
      const fromSameMethod = result.candidates.filter(c => c.method.includes(e.method));
      expect(fromSameMethod.length, `未产出任何「${e.method}」候选`).toBeGreaterThan(0);

      // 书上的预测值可能是「辰、巳」这样的多值，逐个都要能在候选里找到
      const wanted = e.predicted.value.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      for (const w of wanted) {
        const found = fromSameMethod.some(c => c.value.includes(w));
        expect(found, `候选 [${fromSameMethod.map(c => c.value).join(', ')}] 中没有「${w}」`).toBe(true);
      }
    });
  }
});

describe('未实现的方法被如实归类，而非强行对齐', () => {
  const unimplemented = ENTRIES.filter(e => !IMPLEMENTED.has(e.method));

  it('这些条目的方法确实不在已实现集合内', () => {
    for (const e of unimplemented) {
      expect(IMPLEMENTED.has(e.method), `${e.id} 的方法「${e.method}」已实现，应纳入复现断言`).toBe(false);
    }
  });

  it('冲墓库一例记录了误标更正的理由', () => {
    const e = ENTRIES.find(x => x.id === 't-lost-04')!;
    expect(e.method).toBe('冲墓库');
    expect(e.note).toContain('不应强行对齐');
  });
});

describe('覆盖率报告', () => {
  it('输出各方法的复现情况', () => {
    const out = (s: string) => process.stdout.write(s + '\n');
    out('\n应期方法复现覆盖：');
    const byMethod = new Map<string, { total: number; testable: number }>();
    for (const e of ENTRIES) {
      const m = byMethod.get(e.method) ?? { total: 0, testable: 0 };
      m.total++;
      if (e.chartMatches && IMPLEMENTED.has(e.method)) m.testable++;
      byMethod.set(e.method, m);
    }
    for (const [method, m] of [...byMethod].sort((a, b) => b[1].total - a[1].total)) {
      const mark = IMPLEMENTED.has(method) ? '✓ 已实现' : '— 未实现';
      out(`  ${mark}  ${method.padEnd(16)} 标注 ${m.total} 条，可复现断言 ${m.testable} 条`);
    }
    const chartMismatch = ENTRIES.filter(e => !e.chartMatches);
    if (chartMismatch.length) {
      out(`\n因定局法不同、盘面无法重现而跳过：${chartMismatch.map(e => e.id).join('、')}`);
    }
    out('\n⚠ 标注中 10/10 命中是出版选择偏差，不可当作准确率。真实准确率需自行积累并事先登记。\n');
    expect(ENTRIES.length).toBeGreaterThan(0);
  });
});
