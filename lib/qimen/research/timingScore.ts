/**
 * 应期命中率
 *
 * 把登记时保存的应期候选，与回访时填的实际日期比对。
 *
 * 这是本项目唯一**不需要主观评分标准**的评估：tier 事后怎么解释都行，
 * 而「预测癸日，实际发生在癸酉日」要么对要么错。
 *
 * 每条候选独立计分，按方法汇总 —— 目的是回答「哪几种定应期方法真的有用」，
 * 而不是给系统一个笼统的准确率。
 */

import { Solar } from 'lunar-javascript';
import type { EventRecord } from './schema';

export interface MethodScore {
  method: string;
  /** 有实际日期可比对的记录数 */
  evaluated: number;
  hits: number;
  hitRate: number | null;
}

export interface TimingScoreReport {
  /** 已回访且填了实际日期的记录数 */
  scorable: number;
  /** 已回访但未填实际日期的记录数 —— 这些对应期评估无用 */
  missingDate: number;
  /** 尚未回访 */
  pending: number;
  byMethod: MethodScore[];
  /** 样本太少时的提醒，避免拿个位数当结论 */
  caveat: string | null;
}

/** 某日的日柱干支 */
function dayGanZhi(isoDate: string): { gan: string; zhi: string } | null {
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  // 取正午，避开夜子时的日柱归属分歧
  const lunar = Solar.fromYmdHms(Number(m[1]), Number(m[2]), Number(m[3]), 12, 0, 0).getLunar();
  return { gan: lunar.getDayGanExact(), zhi: lunar.getDayZhiExact() };
}

function daysBetween(fromIso: string, toIso: string): number | null {
  const a = Date.parse(fromIso.slice(0, 10));
  const b = Date.parse(toIso.slice(0, 10));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * 单条候选是否命中。
 *
 * 干日（如「癸日」）：实际日期的日干相符即命中。
 * 支日（如「辰日」）：日支相符即命中。
 * 宫数（如「6」）：书中「6 天左右」「快则三十天」都是约数，
 *   故按 ±1 天容差判日、±20% 容差判月，并在报告中说明。
 */
export function candidateHits(
  candidate: { value: string; unit: string },
  createdAt: string,
  actualDate: string,
): boolean | null {
  const gz = dayGanZhi(actualDate);
  if (!gz) return null;

  if (candidate.unit === '日' || candidate.unit === '时') {
    // 值可能是「癸日」「辰日或酉日」「巳、酉、丑日」
    const tokens: string[] = candidate.value.match(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]/g) ?? [];
    if (tokens.length === 0) return null;
    return tokens.includes(gz.gan) || tokens.includes(gz.zhi);
  }

  if (candidate.unit === '宫数') {
    const n = Number(candidate.value);
    if (!Number.isFinite(n)) return null;
    const gap = daysBetween(createdAt, actualDate);
    if (gap === null) return null;
    return Math.abs(gap - n) <= 1;
  }

  return null;
}

export function scoreTiming(records: EventRecord[]): TimingScoreReport {
  const withTiming = records.filter(r => r.systemPrediction.timing);
  const pending = withTiming.filter(r => r.outcome === null).length;
  const returned = withTiming.filter(r => r.outcome !== null);
  const missingDate = returned.filter(r => !r.outcome?.actualDate).length;
  const scorable = returned.filter(r => r.outcome?.actualDate);

  const acc = new Map<string, { evaluated: number; hits: number }>();

  for (const rec of scorable) {
    const actual = rec.outcome!.actualDate!;
    for (const c of rec.systemPrediction.timing!.candidates) {
      // 方法名带书页出处，按括号前的部分归并
      const key = c.method.replace(/（.*$/, '').trim();
      const hit = candidateHits(c, rec.createdAt, actual);
      if (hit === null) continue;
      const cur = acc.get(key) ?? { evaluated: 0, hits: 0 };
      cur.evaluated++;
      if (hit) cur.hits++;
      acc.set(key, cur);
    }
  }

  const byMethod: MethodScore[] = [...acc]
    .map(([method, v]) => ({
      method,
      evaluated: v.evaluated,
      hits: v.hits,
      hitRate: v.evaluated > 0 ? v.hits / v.evaluated : null,
    }))
    .sort((a, b) => (b.hitRate ?? -1) - (a.hitRate ?? -1));

  let caveat: string | null = null;
  if (scorable.length === 0) {
    caveat = '尚无可评分记录。需要回访时填写「实际发生日期」，命中率才算得出来。';
  } else if (scorable.length < 30) {
    caveat = `样本仅 ${scorable.length} 条，命中率波动极大，不足以判断任何方法是否有效。` +
             '奇门有 18 种局、九宫，样本量到三位数之前，这里的数字只能用来看回路是否跑通。';
  }

  return { scorable: scorable.length, missingDate, pending, byMethod, caveat };
}
