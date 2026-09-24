import { describe, it, expect } from 'vitest';
import { generateChart } from '../lib/qimen/algorithm';
import { PALACE_NAMES } from '../lib/qimen/constants';
import { runTool, toToolSpec } from '../lib/agents/tools/registry';
import { analyzeYongShenTool, detectPatternsTool, inspectPalaceTool } from '../lib/agents/tools/qimenTools';
import { searchCasesTool, searchClassicsTool } from '../lib/agents/tools/knowledgeTools';
import { getToolsForEventType, submitAnalysisSchema } from '../lib/agents/tools/index';
import { preflight } from '../lib/agents/evaluator';
import seedCasesRaw from '../lib/qimen/research/seedCases.json';
import type { ToolContext } from '../lib/agents/tools/registry';
import type { CaseStudy } from '../lib/qimen/research/caseStudy';
import type { AnalysisResult } from '../lib/agents/types';
import { EVENT_TYPE_KEYS } from '../lib/qimen/interpretation/data/yongShen';

const chart = generateChart({ year: 2024, month: 3, day: 15, hour: 10, minute: 0 });

const ctx: ToolContext = {
  chart,
  eventType: '求职面试',
  cases: seedCasesRaw as unknown as CaseStudy[],
};

// ─── 工具层 ──────────────────────────────────────────────────────────────────

describe('agent 工具', () => {
  it('analyze_yongshen 返回规则引擎的 tier 和用神落宫', () => {
    const r = runTool(analyzeYongShenTool as never, {}, ctx);
    expect(r.ok).toBe(true);
    expect(r.text).toContain('求职面试 用神分析');
    expect(r.text).toMatch(/规则引擎判定：tier=(大吉|小吉|平|小凶|大凶)/);
  });

  it('analyze_yongshen 支持指定其它事类做交叉验证', () => {
    const r = runTool(analyzeYongShenTool as never, { eventType: '求财经商' }, ctx);
    expect(r.ok).toBe(true);
    expect(r.text).toContain('求财经商 用神分析');
  });

  it('inspect_palace 返回的内容与盘面一致', () => {
    const r = runTool(inspectPalaceTool as never, { palace: 3 }, ctx);
    expect(r.ok).toBe(true);
    const p = chart.palaces[3];
    expect(r.text).toContain(`天盘干：${p.tianPanGan}`);
    expect(r.text).toContain(`${p.gate}门`);
    expect(r.text).toContain(PALACE_NAMES[2]);
  });

  it('参数非法时返回可读错误而不是抛异常', () => {
    const r = runTool(inspectPalaceTool as never, { palace: 42 }, ctx);
    expect(r.ok).toBe(false);
    expect(r.text).toContain('参数错误');
  });

  it('detect_patterns 默认过滤掉"平"级克应', () => {
    const notable = runTool(detectPatternsTool as never, {}, ctx);
    const all = runTool(detectPatternsTool as never, { onlyNotable: false }, ctx);
    expect(notable.text.length).toBeLessThanOrEqual(all.text.length);
  });

  it('search_cases 命中同事类案例', () => {
    const r = runTool(searchCasesTool as never, { eventType: '体育竞猜' }, ctx);
    expect(r.ok).toBe(true);
    expect(r.text).toContain('体育竞猜');
  });

  it('search_cases 无命中时明确告知不要编造', () => {
    const empty: ToolContext = { ...ctx, cases: [] };
    const r = runTool(searchCasesTool as never, { keyword: '不存在的东西' }, empty);
    expect(r.text).toContain('不要因此编造');
  });

  it('search_classics 能按关键词检索到古籍原文', () => {
    const r = runTool(searchClassicsTool as never, { keyword: '奇门' }, ctx);
    expect(r.ok).toBe(true);
  });

  it('婚姻感情事类会额外挂载 analyze_marriage', () => {
    expect(getToolsForEventType('婚姻感情').map(t => t.name)).toContain('analyze_marriage');
    expect(getToolsForEventType('求财经商').map(t => t.name)).not.toContain('analyze_marriage');
  });

  it('工具能转成与厂商无关的 ToolSpec', () => {
    const def = toToolSpec(inspectPalaceTool as never);
    expect(def.name).toBe('inspect_palace');
    expect(def.jsonSchema.type).toBe('object');
    // $schema 两个后端都不认，必须剥掉
    expect(def.jsonSchema).not.toHaveProperty('$schema');
  });
});

// ─── 终止工具 schema ─────────────────────────────────────────────────────────

describe('submit_analysis schema', () => {
  it('拒绝空证据链', () => {
    const r = submitAnalysisSchema.safeParse({
      headline: 'x', tier: '平', confidence: '中',
      reasoning: 'y', evidence: [], advice: 'z', citedCaseIds: [],
    });
    expect(r.success).toBe(false);
  });

  it('拒绝非法 tier', () => {
    const r = submitAnalysisSchema.safeParse({
      headline: 'x', tier: '超级吉', confidence: '中', reasoning: 'y',
      evidence: [{ element: 'a', role: 'b', effect: '利', source: 'rule' }],
      advice: 'z', citedCaseIds: [],
    });
    expect(r.success).toBe(false);
  });
});

// ─── 确定性预检（防幻觉网）───────────────────────────────────────────────────

function makeAnalysis(over: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    headline: '机遇尚可',
    tier: '小吉',
    confidence: '中',
    reasoning: '……',
    evidence: [{ element: '开门落乾6宫', role: '主用神', effect: '利', source: 'rule' }],
    advice: '……',
    citedCaseIds: [],
    ...over,
  };
}

describe('evaluator 预检', () => {
  it('揪出案例库里不存在的 case id', () => {
    const r = preflight(makeAnalysis({ citedCaseIds: ['seed-不存在-999'] }), ctx);
    expect(r.unknownCaseIds).toEqual(['seed-不存在-999']);
  });

  it('真实存在的 case id 不误报', () => {
    const realId = ctx.cases[0].id;
    const r = preflight(makeAnalysis({ citedCaseIds: [realId] }), ctx);
    expect(r.unknownCaseIds).toEqual([]);
  });

  it('标注 source=case 却没给 id 会被标记', () => {
    const r = preflight(
      makeAnalysis({ evidence: [{ element: 'x', role: 'y', effect: '利', source: 'case' }] }),
      ctx,
    );
    expect(r.caseSourceWithoutCitation).toBe(true);
  });

  it('宫名与洛书数对不上时报错', () => {
    // 3 宫是震宫，故意写成坎宫
    const r = preflight(
      makeAnalysis({ evidence: [{ element: '庚落坎3宫', role: '用神', effect: '利', source: 'chart' }] }),
      ctx,
    );
    expect(r.palaceMismatches.length).toBe(1);
    expect(r.palaceMismatches[0]).toContain('震');
  });

  it('声称某宫有实际不在该宫的门，会被揪出来', () => {
    const p1 = chart.palaces[1];
    const wrongGate = (['休', '生', '伤', '杜', '景', '死', '惊', '开'] as const)
      .find(g => g !== p1.gate)!;
    const r = preflight(
      makeAnalysis({ evidence: [{ element: `${wrongGate}门落坎1宫`, role: '用神', effect: '利', source: 'chart' }] }),
      ctx,
    );
    expect(r.palaceMismatches.length).toBe(1);
  });

  it('如实描述盘面则零告警', () => {
    const p1 = chart.palaces[1];
    const r = preflight(
      makeAnalysis({ evidence: [{ element: `${p1.gate}门落坎1宫`, role: '用神', effect: '利', source: 'chart' }] }),
      ctx,
    );
    expect(r.palaceMismatches).toEqual([]);
  });

  it('计算分析师 tier 与规则引擎的偏离级数', () => {
    const r = preflight(makeAnalysis({ tier: '大凶' }), ctx);
    expect(r.tierGap).toBeGreaterThanOrEqual(0);
    expect(r.tierGap).toBeLessThanOrEqual(4);
    const same = preflight(makeAnalysis({ tier: r.ruleTier }), ctx);
    expect(same.tierGap).toBe(0);
  });
});

// ─── 评估闸门策略 ────────────────────────────────────────────────────────────

import { decideNextStep, buildFallbackAnalysis } from '../lib/agents/pipeline';
import type { EvaluationResult, EvaluationIssue } from '../lib/agents/types';

function makeEval(over: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    verdict: 'accept',
    scores: { grounding: 5, ruleConsistency: 4, relevance: 5, calibration: 4 },
    issues: [],
    note: '分析可信',
    ...over,
  };
}

const severe: EvaluationIssue = {
  severity: '严重', category: 'grounding', detail: '引用了不存在的宫位', fix: '删除该条证据',
};
const minor: EvaluationIssue = {
  severity: '轻微', category: 'calibration', detail: '措辞稍绝对', fix: '改为条件式',
};

describe('decideNextStep 闸门策略', () => {
  it('全优则通过', () => {
    expect(decideNextStep(makeEval(), 1, 1)).toEqual({ action: 'accept' });
  });

  it('reject 立即降级，不给修订机会', () => {
    const d = decideNextStep(makeEval({ verdict: 'reject', issues: [severe] }), 1, 2);
    expect(d.action).toBe('fallback');
    expect(d.action === 'fallback' && d.reason).toContain('不存在的宫位');
  });

  it('接地性 ≤2 且还有轮数 → 打回', () => {
    const d = decideNextStep(
      makeEval({ verdict: 'revise', scores: { grounding: 2, ruleConsistency: 4, relevance: 4, calibration: 4 } }),
      1, 1,
    );
    expect(d.action).toBe('revise');
  });

  it('接地性 ≤2 且轮数用完 → 降级（不能把幻觉发给用户）', () => {
    const d = decideNextStep(
      makeEval({ verdict: 'revise', scores: { grounding: 1, ruleConsistency: 4, relevance: 4, calibration: 4 } }),
      2, 1,
    );
    expect(d.action).toBe('fallback');
  });

  it('accept 但校准度 ≤2 仍强制打回改措辞', () => {
    const d = decideNextStep(
      makeEval({ scores: { grounding: 5, ruleConsistency: 4, relevance: 5, calibration: 2 } }),
      1, 1,
    );
    expect(d.action).toBe('revise');
    expect(d.action === 'revise' && d.reason).toContain('校准度');
  });

  it('校准度低但轮数已用完 → 照发，不因措辞问题丢弃整份分析', () => {
    const d = decideNextStep(
      makeEval({ scores: { grounding: 5, ruleConsistency: 4, relevance: 5, calibration: 2 } }),
      2, 1,
    );
    expect(d).toEqual({ action: 'accept' });
  });

  it('轮数用完 + 仅轻微问题 → 照发并附保留意见', () => {
    const d = decideNextStep(makeEval({ verdict: 'revise', issues: [minor] }), 2, 1);
    expect(d.action).toBe('stop');
  });

  it('轮数用完 + 有严重问题 → 降级', () => {
    const d = decideNextStep(makeEval({ verdict: 'revise', issues: [severe] }), 2, 1);
    expect(d.action).toBe('fallback');
  });

  it('maxRevisions=0 时第一轮不通过就直接出结果，不修订', () => {
    expect(decideNextStep(makeEval({ verdict: 'revise', issues: [minor] }), 1, 0).action).toBe('stop');
    expect(decideNextStep(makeEval({ verdict: 'revise', issues: [severe] }), 1, 0).action).toBe('fallback');
  });
});

// ─── 降级结论 ────────────────────────────────────────────────────────────────

describe('buildFallbackAnalysis', () => {
  it('tier 与规则引擎完全一致', () => {
    const fb = buildFallbackAnalysis(ctx);
    const pre = preflight(fb, ctx);
    expect(fb.tier).toBe(pre.ruleTier);
    expect(pre.tierGap).toBe(0);
  });

  it('把握固定为「低」，不冒充比 agent 更确定', () => {
    expect(buildFallbackAnalysis(ctx).confidence).toBe('低');
  });

  it('证据全部标注 source=rule，且不引用任何案例', () => {
    const fb = buildFallbackAnalysis(ctx);
    expect(fb.evidence.length).toBeGreaterThan(0);
    expect(fb.evidence.every(e => e.source === 'rule')).toBe(true);
    expect(fb.citedCaseIds).toEqual([]);
  });

  it('reasoning 开头就声明这是降级结果', () => {
    expect(buildFallbackAnalysis(ctx).reasoning).toContain('规则引擎');
  });

  it('自身能通过预检（降级结论不该触发幻觉告警）', () => {
    const pre = preflight(buildFallbackAnalysis(ctx), ctx);
    expect(pre.unknownCaseIds).toEqual([]);
    expect(pre.palaceMismatches).toEqual([]);
    expect(pre.caseSourceWithoutCitation).toBe(false);
  });

  it('对每个事类都能生成合法结论', () => {
    for (const et of EVENT_TYPE_KEYS) {
      const fb = buildFallbackAnalysis({ ...ctx, eventType: et });
      expect(fb.headline.length).toBeGreaterThan(0);
      expect(fb.evidence.length).toBeGreaterThan(0);
    }
  });
});
