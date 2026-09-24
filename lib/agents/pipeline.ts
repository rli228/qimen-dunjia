/**
 * 流水线编排器
 *
 * 串起三个 agent，并把每一步作为事件发出去（前端据此实时渲染进度）。
 *
 * 一条重要的设计边界：**排盘发生在 agent 之间，而不是在 agent 内部**。
 * 分类器看不到盘，分析师改不了盘。盘面是确定性事实，三个 agent 共享同一份只读快照。
 */

import { generateChart } from '@/lib/qimen/algorithm';
import type { ChartInput } from '@/lib/qimen/types';
import type { CaseStudy } from '@/lib/qimen/research/caseStudy';
import seedCasesRaw from '@/lib/qimen/research/seedCases.json';
import { analyzeYongShen } from '@/lib/qimen/interpretation/yongShenAnalysis';
import { analyzeTiming } from '@/lib/qimen/interpretation/timing';
import { buildEvent } from '@/lib/qimen/research/eventStore';
import { classify } from './classifier';
import { createAnalystSession } from './analyst';
import { evaluate } from './evaluator';
import { describeApiError, type LlmBackend } from './llm';
import type { ToolContext } from './tools/index';
import type { PalaceIndex } from '@/lib/qimen/constants';
import type {
  PipelineInput, PipelineResult, EventEmitter,
  AnalysisResult, AnalysisEvidence, EvaluationResult,
} from './types';

const SEED_CASES = seedCasesRaw as unknown as CaseStudy[];

function nowChartInput(): ChartInput {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    method: '拆补法',
  };
}

// ─── 评估闸门 ─────────────────────────────────────────────────────────────────

export type GateDecision =
  | { action: 'accept' }
  | { action: 'revise'; reason: string }
  /** 轮数用完但问题不致命：照发分析师的结论，附上保留意见 */
  | { action: 'stop'; reason: string }
  /** 丢弃分析师的输出，降级为规则引擎的结论 */
  | { action: 'fallback'; reason: string };

/** 闸门阈值。集中放在这里，方便按线上表现调 */
const GATE = {
  /** 接地性低于此分 = 存在真实幻觉，不可接受 */
  groundingFloor: 2,
  /**
   * 校准度低于此分即使 verdict=accept 也强制打回。
   * 玄学类内容"证据薄弱却绝对断言"的误导代价高于普通问答，故单独从严。
   * 不想要这条就把值设为 0。
   */
  calibrationFloor: 2,
} as const;

function hasSevereIssue(evaluation: EvaluationResult): boolean {
  return evaluation.issues.some(i => i.severity === '严重');
}

/**
 * 根据评估结果决定下一步。
 *
 * 策略（按优先级）：
 *  1. verdict=reject —— 根本性错误，不给修订机会，直接降级为规则引擎结论
 *  2. 接地性 ≤2（有真实幻觉）—— 还有轮数就打回；没轮数了降级
 *  3. verdict=accept 但校准度 ≤2 —— 措辞过于绝对，有轮数就打回改措辞
 *  4. verdict=accept —— 通过
 *  5. 轮数已用完 —— 有「严重」问题则降级，否则照发并附保留意见
 *  6. 其余 —— 打回修订
 *
 * @param evaluation    本轮评估结果
 * @param round         已完成的分析轮次，从 1 开始
 * @param maxRevisions  允许的最大修订次数
 */
export function decideNextStep(
  evaluation: EvaluationResult,
  round: number,
  maxRevisions: number,
): GateDecision {
  const roundsLeft = round <= maxRevisions;

  if (evaluation.verdict === 'reject') {
    return {
      action: 'fallback',
      reason: evaluation.issues.find(i => i.severity === '严重')?.detail
        ?? evaluation.note
        ?? '评估判定该分析存在根本性错误',
    };
  }

  if (evaluation.scores.grounding <= GATE.groundingFloor) {
    const reason = `接地性评分 ${evaluation.scores.grounding}/5：分析引用了盘面中不存在的内容`;
    return roundsLeft ? { action: 'revise', reason } : { action: 'fallback', reason };
  }

  if (evaluation.verdict === 'accept') {
    if (evaluation.scores.calibration <= GATE.calibrationFloor && roundsLeft) {
      return {
        action: 'revise',
        reason: `校准度评分 ${evaluation.scores.calibration}/5：措辞的确定性超出了证据强度`,
      };
    }
    return { action: 'accept' };
  }

  if (!roundsLeft) {
    const reason = '已达最大修订轮数，问题仍未解决';
    return hasSevereIssue(evaluation)
      ? { action: 'fallback', reason }
      : { action: 'stop', reason };
  }

  return { action: 'revise', reason: evaluation.issues[0]?.detail ?? '评估未通过' };
}

// ─── 降级：用规则引擎重建结论 ────────────────────────────────────────────────

/**
 * 把 analyzeYongShen 的输出包装成 AnalysisResult。
 *
 * 这条路径**不经过任何 LLM** —— 降级的意义就在于此：agent 不可信时，
 * 退回到那套完全确定性、可复现、可审计的规则判定。
 * confidence 固定为「低」：规则引擎只做加权评分，本来就不该表现得比 agent 更有把握。
 */
export function buildFallbackAnalysis(ctx: ToolContext): AnalysisResult {
  const r = analyzeYongShen(ctx.chart, ctx.eventType);

  const evidence: AnalysisEvidence[] = r.locations
    .filter(loc => loc.palace !== null)
    .map(loc => ({
      element: `${loc.role.label}（${loc.role.target || loc.role.targetSource || '动态用神'}）落${loc.palaceName}${loc.palace}宫`,
      role: `${loc.role.label}·权重${loc.role.weight}`,
      effect: loc.fortune === '吉' ? '利' : loc.fortune === '凶' ? '不利' : '中性',
      source: 'rule',
    }));

  for (const rel of r.relations) {
    evidence.push({
      element: rel.relation,
      role: `${rel.from}与${rel.to}的关系`,
      effect: rel.fortune === '吉' ? '利' : rel.fortune === '凶' ? '不利' : '中性',
      source: 'rule',
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      element: `${ctx.eventType}各用神均未在盘中定位`,
      role: '用神缺失',
      effect: '中性',
      source: 'rule',
    });
  }

  return {
    headline: r.headline,
    tier: r.tier,
    confidence: '低',
    reasoning: [
      '> ⚠ 以下结论由**规则引擎**直接生成，未经 AI 分析 agent 加工。',
      '> AI 的分析未通过评估审核，已被丢弃。规则引擎的判定完全确定性、可复现，',
      '> 但只做用神加权评分，不结合格局、案例和古籍，请据此把握参考程度。',
      '',
      `**信号一致性：${r.coherence}**`,
      '',
      r.conclusion,
    ].join('\n'),
    evidence,
    advice: '本次 AI 分析未通过质量审核，建议换一个更具体的问法重新起盘，或参考页面上的「规则解盘」与「用神分析」面板自行判断。',
    citedCaseIds: [],
  };
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────

export async function runPipeline(
  backend: LlmBackend,
  input: PipelineInput,
  emit: EventEmitter,
): Promise<PipelineResult> {
  const maxRevisions = input.maxRevisions ?? 1;

  // ── Agent 1：分类 ──
  emit({ type: 'stage', stage: 'classify', status: 'start' });
  const classification = await classify(backend, input.question);
  if (input.forcedEventType) {
    classification.eventType = input.forcedEventType;
    classification.reasoning = `（用户手动指定事类）${classification.reasoning}`;
    classification.confidence = 1;
  }
  emit({ type: 'classification', data: classification });
  emit({ type: 'stage', stage: 'classify', status: 'done' });

  // ── 排盘（确定性，不经过 LLM）──
  emit({ type: 'stage', stage: 'cast', status: 'start' });
  const chart = generateChart(input.chartInput ?? nowChartInput());
  emit({ type: 'chart', chart });
  emit({ type: 'stage', stage: 'cast', status: 'done' });

  const ctx: ToolContext = {
    chart,
    eventType: classification.eventType,
    cases: [...SEED_CASES, ...(input.userCases ?? [])],
  };

  // ── Agent 2 ⇄ Agent 3 循环 ──
  const session = createAnalystSession(backend, ctx, input.question, classification, emit);
  let analysis: AnalysisResult | null = null;
  let evaluation: EvaluationResult | null = null;
  let degraded: PipelineResult['degraded'] = null;
  let round = 0;

  while (true) {
    round++;

    emit({ type: 'stage', stage: 'analyze', status: 'start', round });
    analysis = round === 1
      ? await session.run()
      : await session.run({ issues: evaluation!.issues, round });
    emit({ type: 'analysis', data: analysis, round });
    emit({ type: 'stage', stage: 'analyze', status: 'done', round });

    emit({ type: 'stage', stage: 'evaluate', status: 'start', round });
    const { result } = await evaluate(backend, ctx, input.question, classification, analysis);
    evaluation = result;
    emit({ type: 'evaluation', data: evaluation, round });
    emit({ type: 'stage', stage: 'evaluate', status: 'done', round });

    const decision = decideNextStep(evaluation, round, maxRevisions);
    if (decision.action === 'accept') break;
    if (decision.action === 'stop') {
      evaluation = { ...evaluation, note: `${evaluation.note}（${decision.reason}）` };
      break;
    }
    if (decision.action === 'fallback') {
      degraded = { reason: decision.reason };
      analysis = buildFallbackAnalysis(ctx);
      emit({ type: 'degrade', round, reason: decision.reason });
      emit({ type: 'analysis', data: analysis, round });
      break;
    }
    emit({ type: 'revise', round, reason: decision.reason });
  }

  // ── 研究记录 ──
  // 每次解盘都留档，否则永远无法得出真实准确率。
  // 服务端只负责构建，落盘由客户端完成（eventStore 用 localStorage）。
  const ysPalaces = analyzeYongShen(chart, classification.eventType).locations
    .map(l => l.palace)
    .filter((p): p is PalaceIndex => p !== null);
  const timing = analyzeTiming(chart, ysPalaces);

  const record = buildEvent(chart, classification.eventType, input.question, {
    source: 'agent',
    questionMeta: {
      classifierConfidence: classification.confidence.toFixed(2),
      ...(classification.alternative ? { alternativeEventType: classification.alternative } : {}),
    },
    prediction: {
      agent: {
        tier: analysis!.tier,
        headline: analysis!.headline,
        confidence: analysis!.confidence,
        verdict: evaluation!.verdict,
        degraded: degraded !== null,
      },
      timing: {
        distance: timing.distance,
        suggestedUnit: timing.suggestedUnit,
        candidates: timing.candidates.map(c => ({
          method: c.method,
          value: c.value,
          unit: c.unit,
        })),
      },
    },
  });
  emit({ type: 'record', data: record });

  const finalResult: PipelineResult = {
    chart,
    classification,
    analysis: analysis!,
    evaluation: evaluation!,
    revisions: round - 1,
    toolCalls: session.toolCalls,
    degraded,
    record,
  };
  emit({ type: 'final', data: finalResult });
  return finalResult;
}

export { describeApiError };
