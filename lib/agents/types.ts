/**
 * Agent 框架 — 三个 agent 之间的数据契约
 *
 * 设计原则：
 * - 每个 agent 的输出都是结构化对象，不是自由文本。下游 agent 消费的是字段，
 *   不是"读懂另一个模型写的散文"。
 * - 盘面永远由确定性代码生成（generateChart），LLM 只读不写。
 * - 全流程可追溯：每一步都发 PipelineEvent，前端能看到 agent 在干什么。
 */

import type { QimenChart, ChartInput } from '@/lib/qimen/types';
import type { EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import type { Tier } from '@/lib/qimen/interpretation/yongShenAnalysis';
import type { CaseStudy } from '@/lib/qimen/research/caseStudy';
import type { EventRecord } from '@/lib/qimen/research/schema';

// ─── 流水线输入 ───────────────────────────────────────────────────────────────

export interface PipelineInput {
  /** 用户原始问题 */
  question: string;
  /** 可选：指定起盘时间。不给则用服务端当前时间（问事起盘） */
  chartInput?: ChartInput;
  /** 可选：用户手动指定事类，跳过 Agent 1 的判断（仍会记录分类器意见） */
  forcedEventType?: EventTypeKey;
  /** 可选：客户端 localStorage 里的案例库，随请求带上供检索 */
  userCases?: CaseStudy[];
  /** 最大 revise 轮数，默认 1 */
  maxRevisions?: number;
}

// ─── Agent 1：分类器 ──────────────────────────────────────────────────────────

export interface ExtractedEntities {
  /** 求测人自身／主体（如"我"、"主队巴西"） */
  subject?: string;
  /** 对方／客体（如"对方公司"、"客队阿根廷"） */
  counterparty?: string;
  /** 时间范围（如"这个月内"、"下周比赛"） */
  timeframe?: string;
  /** 是否在问具体数量（如"能拿几块金牌"）——触发河图数定量分析 */
  quantitative?: string;
}

export interface ClassificationResult {
  eventType: EventTypeKey;
  /** 0-1，低于阈值时 pipeline 会把不确定性透传给用户 */
  confidence: number;
  /** 次优候选，用于提示"也可能是…" */
  alternative: EventTypeKey | null;
  reasoning: string;
  entities: ExtractedEntities;
  /** 问题本身含混到无法归类时为 true */
  needsClarification: boolean;
  clarifyingQuestion: string | null;
}

// ─── Agent 2：分析师 ──────────────────────────────────────────────────────────

export interface AnalysisEvidence {
  /** 盘面元素，必须是盘里真实存在的（如"庚落坎1宫"、"开门得丙奇"） */
  element: string;
  /** 在推理中的角色（如"用神"、"忌神"、"季节旺衰"） */
  role: string;
  effect: '利' | '不利' | '中性';
  /** 来源：rule=规则引擎 / case=案例库 / classic=古籍 / chart=直接读盘 */
  source: 'rule' | 'case' | 'classic' | 'chart';
}

export interface AnalysisResult {
  /** 一句话结论 */
  headline: string;
  tier: Tier;
  confidence: '高' | '中' | '低';
  /** 完整推理过程，markdown */
  reasoning: string;
  evidence: AnalysisEvidence[];
  advice: string;
  /** 引用到的案例 id */
  citedCaseIds: string[];
}

export interface ToolCallLog {
  name: string;
  input: unknown;
  /** 结果摘要（截断），完整结果不回传前端以免刷屏 */
  resultSummary: string;
  ok: boolean;
  ms: number;
}

// ─── Agent 3：评估器 ──────────────────────────────────────────────────────────

export interface EvaluationScores {
  /** 引用的盘面元素是否真实存在（1-5） */
  grounding: number;
  /** 与规则引擎 tier 是否一致（1-5） */
  ruleConsistency: number;
  /** 是否回答了用户真正问的问题（1-5） */
  relevance: number;
  /** 措辞是否与证据强度匹配，有没有过度断言（1-5） */
  calibration: number;
}

export interface EvaluationIssue {
  severity: '严重' | '中等' | '轻微';
  category: 'grounding' | 'rule-consistency' | 'relevance' | 'calibration';
  detail: string;
  /** 给 Agent 2 的具体修改建议 */
  fix: string;
}

export interface EvaluationResult {
  verdict: 'accept' | 'revise' | 'reject';
  scores: EvaluationScores;
  issues: EvaluationIssue[];
  /** 给用户看的一句话评语 */
  note: string;
}

// ─── 最终输出 ─────────────────────────────────────────────────────────────────

export interface PipelineResult {
  chart: QimenChart;
  classification: ClassificationResult;
  analysis: AnalysisResult;
  evaluation: EvaluationResult;
  /** 实际执行的修订轮数 */
  revisions: number;
  /**
   * 本次解盘的研究记录。服务端构建、客户端落盘 —— 流水线跑在服务端，
   * 而 eventStore 用的是 localStorage。
   * 没有这一步，系统永远拿不到真实准确率：每次解盘都随风而逝。
   */
  record: EventRecord;
  toolCalls: ToolCallLog[];
  /**
   * 非 null 表示这份 analysis **不是** agent 的产出，而是评估不通过后
   * 由规则引擎重建的兜底结论。UI 必须据此明确告知用户，
   * 否则降级结果和正常结果长得一模一样，比直接报错更有误导性。
   */
  degraded: { reason: string } | null;
}

// ─── 流式事件 ─────────────────────────────────────────────────────────────────

export type PipelineStage = 'classify' | 'cast' | 'analyze' | 'evaluate';

export type PipelineEvent =
  | { type: 'stage'; stage: PipelineStage; status: 'start' | 'done'; round?: number }
  | { type: 'chart'; chart: QimenChart }
  | { type: 'classification'; data: ClassificationResult }
  | { type: 'tool_call'; name: string; input: unknown }
  | { type: 'tool_result'; name: string; summary: string; ok: boolean; ms: number }
  | { type: 'analysis'; data: AnalysisResult; round: number }
  | { type: 'evaluation'; data: EvaluationResult; round: number }
  | { type: 'revise'; round: number; reason: string }
  | { type: 'degrade'; round: number; reason: string }
  | { type: 'record'; data: EventRecord }
  | { type: 'final'; data: PipelineResult }
  | { type: 'error'; message: string };

export type EventEmitter = (event: PipelineEvent) => void;
