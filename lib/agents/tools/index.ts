/**
 * 工具集合 + 终止工具
 *
 * submit_analysis 是"终止工具"（terminal tool）：Agent 2 不是靠写一段散文收尾，
 * 而是必须调用这个工具交卷。好处有三：
 *  1. 输出天然是结构化的，Agent 3 能逐字段校验；
 *  2. 模型没法一边说"我还要再查一下"一边结束；
 *  3. 不需要 output_config.format —— 结构化输出与 tool use 同时开启时行为更难预期。
 */

import { z } from 'zod';
import type { AgentTool } from './registry';
import { analyzeYongShenTool, detectPatternsTool, inspectPalaceTool, analyzeMarriageTool, analyzeTimingTool } from './qimenTools';
import { searchCasesTool, searchClassicsTool } from './knowledgeTools';

export { toToolSpec, runTool } from './registry';
export type { ToolContext, AgentTool } from './registry';

/** 通用工具集（所有事类都可用） */
export const BASE_TOOLS: AgentTool[] = [
  analyzeYongShenTool as AgentTool,
  analyzeTimingTool as AgentTool,
  detectPatternsTool as AgentTool,
  inspectPalaceTool as AgentTool,
  searchCasesTool as AgentTool,
  searchClassicsTool as AgentTool,
];

/** 事类专项工具：只在对应事类时挂载，避免污染工具列表 */
const SPECIALIST_TOOLS: Partial<Record<string, AgentTool[]>> = {
  '婚姻感情': [analyzeMarriageTool as AgentTool],
};

export function getToolsForEventType(eventType: string): AgentTool[] {
  return [...BASE_TOOLS, ...(SPECIALIST_TOOLS[eventType] ?? [])];
}

// ─── 终止工具 ────────────────────────────────────────────────────────────────

export const SUBMIT_TOOL_NAME = 'submit_analysis';

export const submitAnalysisSchema = z.object({
  headline: z.string().describe('一句话结论，30字以内，直接回答用户的问题'),
  tier: z.enum(['大吉', '小吉', '平', '小凶', '大凶']).describe('吉凶等级。若与规则引擎不一致，必须在 reasoning 中说明理由'),
  confidence: z.enum(['高', '中', '低']).describe('你对这个结论的把握。用神信号一致性弱、或关键用神落空亡未定位时应为"低"'),
  reasoning: z.string().describe('完整推理过程，markdown。按"用神定位→旺衰生克→格局印证→案例/古籍对照→综合"的顺序展开，每一步都引用具体盘面数据'),
  evidence: z.array(z.object({
    element: z.string().describe('盘面元素，必须与工具返回的原文一致，如 "庚落坎1宫"、"开门加丙奇"'),
    role: z.string().describe('在推理中的角色，如 "主用神"、"季节旺衰"、"关键格局"'),
    effect: z.enum(['利', '不利', '中性']),
    source: z.enum(['rule', 'case', 'classic', 'chart']).describe('该证据来自哪个工具：rule=用神/格局引擎, case=案例库, classic=古籍, chart=直接读盘'),
  })).min(1).describe('支撑结论的证据链，按重要性排序，至少 1 条'),
  advice: z.string().describe('给用户的具体建议，包含可操作的方位/时机（若盘面支持）'),
  citedCaseIds: z.array(z.string()).describe('实际引用的案例 id，没引用就传空数组。不要编造 id'),
});

export type SubmitAnalysisInput = z.infer<typeof submitAnalysisSchema>;
