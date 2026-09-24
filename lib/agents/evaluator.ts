/**
 * Agent 3：评估器
 *
 * 分两层，顺序很重要：
 *
 *  第一层 —— 确定性预检（preflight）。纯代码，不花 token，不会幻觉：
 *    · 引用的 case id 在案例库里是否真实存在
 *    · 声称的宫位内容是否与盘面一致
 *    · tier 与规则引擎的偏离幅度
 *  第二层 —— LLM 评审。只判断代码判断不了的东西：推理链是否自洽、
 *    有没有答非所问、措辞与证据强度是否匹配。
 *
 * 顺序反过来就废了：LLM 判官最不可靠的恰恰是"这个字符串在不在那个列表里"这类
 * 机械核对，而那正是代码零成本就能做对的事。预检结论会作为既成事实写进
 * 评审 prompt，LLM 只能解释它、不能推翻它。
 */

import { z } from 'zod';
import type { LlmBackend } from './llm';
import { analyzeYongShen } from '@/lib/qimen/interpretation/yongShenAnalysis';
import type { Tier } from '@/lib/qimen/interpretation/yongShenAnalysis';
import { PALACE_NAMES } from '@/lib/qimen/constants';
import type { PalaceIndex } from '@/lib/qimen/constants';
import type { ToolContext } from './tools/index';
import type { AnalysisResult, ClassificationResult, EvaluationResult } from './types';

const TIER_ORDER: Tier[] = ['大凶', '小凶', '平', '小吉', '大吉'];

// ─── 第一层：确定性预检 ──────────────────────────────────────────────────────

export interface PreflightReport {
  /** 引用了但案例库中不存在的 case id */
  unknownCaseIds: string[];
  /** 声称 source=case 却没引用任何 case id */
  caseSourceWithoutCitation: boolean;
  /** 规则引擎 tier */
  ruleTier: Tier;
  /** 分析师 tier 与规则引擎相差几级（0 = 一致） */
  tierGap: number;
  /** 引用中提到的宫位与实际盘面不符的项 */
  palaceMismatches: string[];
  ruleCoherence: '强' | '中' | '弱';
}

/** 从证据文本里抠出"X宫"并核对该宫真实内容 */
function checkPalaceClaims(element: string, ctx: ToolContext): string | null {
  const m = element.match(/([坎坤震巽中乾兑艮离])?\s*([1-9])\s*宫/);
  if (!m) return null;
  const idx = Number(m[2]) as PalaceIndex;
  const claimedName = m[1];
  const actualName = PALACE_NAMES[idx - 1];
  if (claimedName && claimedName !== actualName) {
    return `「${element}」把 ${idx} 宫称为「${claimedName}」，实际是「${actualName}」宫`;
  }

  const p = ctx.chart.palaces[idx];
  const present = [p.tianPanGan, p.diPanGan, p.star, p.gate, p.deity];
  // 元素里若提到了某个星/门/干名，它必须真的在这一宫
  const tokens = element.match(/天[蓬芮冲辅禽心柱任英]|[休死伤杜开惊生景]门|[甲乙丙丁戊己庚辛壬癸]|值符|螣蛇|太阴|六合|白虎|玄武|九地|九天|勾陈|朱雀/g) ?? [];
  for (const tok of tokens) {
    const bare = tok.replace(/门$/, '');
    if (present.includes(bare as never)) continue;
    // 门/星/神这类有限集合才判错；天干可能来自"乙庚合"这类跨宫关系，放过
    if (/门$/.test(tok) || /^天[蓬芮冲辅禽心柱任英]$/.test(tok)) {
      return `「${element}」称 ${idx} 宫有「${tok}」，实际该宫为 ${p.star}/${p.gate}门/${p.deity}`;
    }
  }
  return null;
}

export function preflight(analysis: AnalysisResult, ctx: ToolContext): PreflightReport {
  const known = new Set(ctx.cases.map(c => c.id));
  const unknownCaseIds = analysis.citedCaseIds.filter(id => !known.has(id));

  const rule = analyzeYongShen(ctx.chart, ctx.eventType);
  const tierGap = Math.abs(TIER_ORDER.indexOf(analysis.tier) - TIER_ORDER.indexOf(rule.tier));

  const palaceMismatches: string[] = [];
  for (const ev of analysis.evidence) {
    const problem = checkPalaceClaims(ev.element, ctx);
    if (problem) palaceMismatches.push(problem);
  }

  return {
    unknownCaseIds,
    caseSourceWithoutCitation:
      analysis.evidence.some(e => e.source === 'case') && analysis.citedCaseIds.length === 0,
    ruleTier: rule.tier,
    tierGap,
    palaceMismatches,
    ruleCoherence: rule.coherence,
  };
}

function renderPreflight(r: PreflightReport): string {
  const lines = [
    `规则引擎 tier：${r.ruleTier}（信号一致性 ${r.ruleCoherence}）`,
    `分析师 tier 与规则引擎相差 ${r.tierGap} 级`,
  ];
  lines.push(r.unknownCaseIds.length
    ? `⚠ 引用了案例库中不存在的 id：${r.unknownCaseIds.join('、')}（确认无误的幻觉）`
    : '✓ 引用的案例 id 全部真实存在');
  if (r.caseSourceWithoutCitation) lines.push('⚠ 有证据标注 source=case 但 citedCaseIds 为空');
  lines.push(r.palaceMismatches.length
    ? '⚠ 宫位内容与实际盘面不符：\n' + r.palaceMismatches.map(m => `   - ${m}`).join('\n')
    : '✓ 证据中提到的宫位内容与盘面一致');
  return lines.join('\n');
}

// ─── 第二层：LLM 评审 ────────────────────────────────────────────────────────

const evaluationSchema = z.object({
  verdict: z.enum(['accept', 'revise', 'reject']).describe(
    'accept=可直接给用户；revise=有可修复的问题，退回分析师；reject=根本性错误（大面积幻觉、答非所问），本轮作废'),
  scores: z.object({
    grounding: z.number().int().min(1).max(5).describe('引用的盘面元素是否真实。预检报告中的 ⚠ 项直接压低此分'),
    ruleConsistency: z.number().int().min(1).max(5).describe('与规则引擎是否一致。不一致但给出了有效理由，不扣分；不一致且没解释，1-2 分'),
    relevance: z.number().int().min(1).max(5).describe('是否回答了用户真正问的问题（包括定量问题有没有给出数量）'),
    calibration: z.number().int().min(1).max(5).describe('措辞与证据强度是否匹配。证据弱却用绝对断言，扣分；证据强却含糊其辞，也扣分'),
  }),
  issues: z.array(z.object({
    severity: z.enum(['严重', '中等', '轻微']),
    category: z.enum(['grounding', 'rule-consistency', 'relevance', 'calibration']),
    detail: z.string().describe('具体问题，引用原文'),
    fix: z.string().describe('给分析师的可执行修改建议'),
  })).describe('没有问题就传空数组。不要为了显得认真而编造问题'),
  note: z.string().describe('给最终用户看的一句话评语，30字以内，说明这份分析的可信程度'),
});

const SYSTEM_PROMPT = `你是奇门遁甲多 agent 系统中的「评估」环节，负责审核分析师的输出。

你**不重新解盘**，只做质量把关。四个维度：

1. grounding（接地性）—— 分析师引用的盘面元素是否真实存在。系统已做过确定性预检，预检结果是**事实**，你不能推翻它，只能采纳。
2. ruleConsistency（规则一致性）—— 与规则引擎的判定是否一致。注意：**不一致本身不是错误**。规则引擎只是加权评分，分析师结合格局、案例得出不同结论是允许的，前提是他明确说明了理由。没说明理由的偏离才是问题。
3. relevance（相关性）—— 有没有回答用户真正问的问题。用户问"几块金牌"而回答"总体大吉"，就是答非所问。
4. calibration（校准度）—— 措辞的确定性是否与证据强度匹配。这是玄学类应用最容易出问题的地方：证据薄弱时用绝对断言会误导用户。

判定标准：
- 任何一项 ≤2 分 → 至少 revise
- grounding ≤2（有真实的幻觉）→ revise 或 reject
- 全部 ≥4 且无严重问题 → accept
- 不要吹毛求疵。措辞偏好、行文风格不构成 issue。宁可 accept 一份朴素但正确的分析，也不要为了显得严格而制造 issue。`;

export async function evaluate(
  backend: LlmBackend,
  ctx: ToolContext,
  question: string,
  classification: ClassificationResult,
  analysis: AnalysisResult,
): Promise<{ result: EvaluationResult; preflightReport: PreflightReport }> {
  const pre = preflight(analysis, ctx);

  const userMessage = [
    `<user_question>${question}</user_question>`,
    `<classified_as>${classification.eventType}（置信度 ${classification.confidence.toFixed(2)}）：${classification.reasoning}</classified_as>`,
    '',
    '<deterministic_preflight>',
    renderPreflight(pre),
    '</deterministic_preflight>',
    '',
    '<analysis_to_review>',
    `结论：${analysis.headline}`,
    `tier：${analysis.tier}　自评把握：${analysis.confidence}`,
    '',
    '证据链：',
    ...analysis.evidence.map(e => `- [${e.effect}/${e.source}] ${e.element}（${e.role}）`),
    '',
    `引用案例：${analysis.citedCaseIds.length ? analysis.citedCaseIds.join('、') : '无'}`,
    '',
    '推理过程：',
    analysis.reasoning,
    '',
    `建议：${analysis.advice}`,
    '</analysis_to_review>',
  ].join('\n');

  const parsed = await backend.parseJson({
    system: SYSTEM_PROMPT,
    user: userMessage,
    schema: evaluationSchema,
    maxTokens: 4000,
  });

  return { result: parsed, preflightReport: pre };
}
