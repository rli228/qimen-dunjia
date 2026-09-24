/**
 * 书载盘面批量核对
 *
 * 把《神奇之门》的实占案例当作排盘算法的**外部验收测试集**。
 *
 * 为什么这批断言比自己构造的用例更有价值：期望值不是我们算出来的，而是书上印的。
 * 自造用例只能证明代码与我们自己的理解一致；书载盘面能证明代码与一个独立的
 * 权威实现一致 —— 符头、遁甲、八神起点那三个 bug 之所以能同时存在，正是因为
 * 原有测试全都在验证「给定局数如何排盘」，没有任何一条去质疑局数本身。
 *
 * 核对分两级：
 *   四柱  —— 纯历法，与定局法无关，任何流派都必须一致，**不符即为 bug**
 *   局数等 —— 受定局法影响。书中案例跨越置闰争议期（书页 63），
 *            个别案例按置闰法历书起局，故不符时需人工判别，不直接判失败。
 */

import { describe, it, expect } from 'vitest';
import { generateChart } from '../lib/qimen/algorithm';
import type { PalaceIndex } from '../lib/qimen/constants';
import fixture from './fixtures/bookCases.json';

interface BookCase {
  id: string;
  chapter: string;
  label: string;
  page: string;
  datetime: { year: number; month: number; day: number; hour: number; minute: number };
  stated: {
    siZhu: string;
    dunType: string | null;
    juNumber: number | null;
    xunShou: string | null;
    zhiFu: string | null;
    zhiFuPalace: number | null;
    zhiShi: string | null;
    zhiShiPalace: number | null;
    /** 书上多数案例不写三元，只有少数直接写明 */
    yuan: string | null;
  };
  note: string;
  /** 书上印错、不可作为期望值的字段 */
  errata: { field: string; printed: string; correct: string; reason: string } | null;
  /** 已确认是本项目的 bug、尚未修复。书是对的，代码是错的 */
  knownBug: { summary: string; detail: string; blocker: string } | null;
}

const CASES = fixture.cases as BookCase[];

/** 中五宫寄坤二宫 —— 书上常直接写寄宫后的宫位 */
const lodge = (p: number) => (p === 5 ? 2 : p);

function locate(chart: ReturnType<typeof generateChart>) {
  let zhiFuPalace = 0;
  let zhiShiPalace = 0;
  for (let i = 1; i <= 9; i++) {
    const p = chart.palaces[i as PalaceIndex];
    if (p.star === chart.zhiFu) zhiFuPalace = i;
    if (p.gate === chart.zhiShi) zhiShiPalace = i;
  }
  return { zhiFuPalace, zhiShiPalace };
}

function siZhuOf(chart: ReturnType<typeof generateChart>): string {
  const { year, month, day, hour } = chart.siZhu;
  return `${year.gan}${year.zhi}年${month.gan}${month.zhi}月${day.gan}${day.zhi}日${hour.gan}${hour.zhi}时`;
}

describe('《神奇之门》书载盘面批量核对', () => {
  // ── 一级：四柱。与定局法无关，不符即为历法 bug ──
  describe('四柱（历法，任何流派都应一致）', () => {
    for (const c of CASES) {
      it(`${c.id} ${c.label}（书页 ${c.page}）`, () => {
        const chart = generateChart({ ...c.datetime, method: '拆补法' });
        expect(siZhuOf(chart)).toBe(c.stated.siZhu);
      });
    }
  });

  // ── 二级：旬首。同样由时干支决定，与定局法无关 ──
  describe('旬首（由时干支决定，与定局法无关）', () => {
    for (const c of CASES.filter(x => x.stated.xunShou)) {
      it(`${c.id} ${c.label}`, () => {
        const chart = generateChart({ ...c.datetime, method: '拆补法' });
        expect(chart.xunShou).toBe(c.stated.xunShou);
      });
    }
  });

  // ── 勘误：书上印错的字段。断言的是我们判定的正确值，并留下判定依据 ──
  describe('书载勘误', () => {
    for (const c of CASES.filter(x => x.errata)) {
      const e = c.errata!;
      it(`${c.id} ${e.field}：书印「${e.printed}」，应为「${e.correct}」`, () => {
        const chart = generateChart({ ...c.datetime, method: '拆补法' });
        expect(chart[e.field as 'xunShou']).toBe(e.correct);
      });
    }
  });

  // ── 三级：局数与值符值使。受定局法影响，不符需人工判别 ──
  it('局数与值符值使 —— 汇总报告', () => {
    const out = (s: string) => process.stdout.write(s + '\n');
    const rows: { c: BookCase; ok: boolean; detail: string }[] = [];

    for (const c of CASES) {
      const chart = generateChart({ ...c.datetime, method: '拆补法' });
      const { zhiFuPalace, zhiShiPalace } = locate(chart);
      const diffs: string[] = [];

      if (c.stated.yuan && chart.yuan !== c.stated.yuan) {
        diffs.push(`元 ${c.stated.yuan}→${chart.yuan}`);
      }
      if (c.stated.dunType && chart.dunType !== c.stated.dunType) {
        diffs.push(`遁 ${c.stated.dunType}→${chart.dunType}`);
      }
      if (c.stated.juNumber !== null && chart.juNumber !== c.stated.juNumber) {
        diffs.push(`局 ${c.stated.juNumber}→${chart.juNumber}`);
      }
      if (c.stated.zhiFu && chart.zhiFu !== c.stated.zhiFu) {
        diffs.push(`值符 ${c.stated.zhiFu}→${chart.zhiFu}`);
      }
      if (c.stated.zhiFuPalace !== null && lodge(zhiFuPalace) !== lodge(c.stated.zhiFuPalace)) {
        diffs.push(`值符宫 ${c.stated.zhiFuPalace}→${zhiFuPalace}`);
      }
      if (c.stated.zhiShi && chart.zhiShi !== c.stated.zhiShi) {
        diffs.push(`值使 ${c.stated.zhiShi}→${chart.zhiShi}`);
      }
      if (c.stated.zhiShiPalace !== null && lodge(zhiShiPalace) !== lodge(c.stated.zhiShiPalace)) {
        diffs.push(`值使宫 ${c.stated.zhiShiPalace}→${zhiShiPalace}`);
      }

      rows.push({
        c, ok: diffs.length === 0,
        detail: diffs.length === 0
          ? `${chart.dunType}${chart.juNumber}局 ${chart.jieQi}${chart.yuan}`
          : diffs.join('，'),
      });
    }

    const pass = rows.filter(r => r.ok).length;
    out(`\n书载盘面核对：${pass}/${rows.length} 完全吻合\n`);
    for (const r of rows) {
      out(`  ${r.ok ? '✓' : '✗'} ${r.c.id}  ${r.c.label}`);
      out(`      ${r.detail}`);
      if (!r.ok && r.c.note) out(`      备注：${r.c.note}`);
    }
    out('');

    const bugs = rows.filter(r => !r.ok && r.c.knownBug);
    if (bugs.length) {
      out('已确认为本项目 bug（书对、码错），待修：');
      for (const r of bugs) out(`  · ${r.c.id}：${r.c.knownBug!.summary}`);
      out('');
    }

    // 锁定已知失败集合：既有备注（定局法差异）又无 knownBug 标记的偏差才算未解释。
    // 同时反向断言 —— 被标记为 knownBug 的案例必须仍然失败，
    // 一旦修好就会在这里提醒把标记摘掉，避免标记长期烂在代码里。
    const unexplained = rows.filter(r => !r.ok && !r.c.note && !r.c.knownBug);
    expect(
      unexplained.map(r => `${r.c.id}: ${r.detail}`),
      '存在既非定局法差异、也未登记为已知 bug 的偏差',
    ).toEqual([]);

    const staleBugMarks = rows.filter(r => r.ok && r.c.knownBug).map(r => r.c.id);
    expect(
      staleBugMarks,
      'knownBug 标记已过时 —— 这些案例现在通过了，请从 fixture 中移除标记',
    ).toEqual([]);
  });
});
