/**
 * 工具注册表
 *
 * 每个工具 = zod schema（既做校验又自动生成 JSON Schema 给 Claude）+ 纯函数 run。
 * 所有工具都是**确定性**的：同样的盘面同样的入参必然得到同样的输出。
 * 这是整个框架的地基 —— LLM 不计算，只调用。
 */

import { z } from 'zod';
import { toJsonSchema, type ToolSpec } from '../llm';
import type { QimenChart } from '@/lib/qimen/types';
import type { EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import type { CaseStudy } from '@/lib/qimen/research/caseStudy';

/** 工具执行时能看到的上下文（由 pipeline 注入，LLM 无法篡改） */
export interface ToolContext {
  chart: QimenChart;
  /** Agent 1 判定的事类 */
  eventType: EventTypeKey;
  /** 可检索的案例库：内置种子案例 + 用户本地案例 */
  cases: CaseStudy[];
}

export interface AgentTool<S extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  schema: S;
  /** 返回给模型的文本。务必人类可读 —— 模型的推理质量直接取决于这段文本的清晰度 */
  run: (input: z.infer<S>, ctx: ToolContext) => string;
}

export function defineTool<S extends z.ZodType>(tool: AgentTool<S>): AgentTool<S> {
  return tool;
}

/** zod → 与厂商无关的工具规格，由各后端再翻译成自己的格式 */
export function toToolSpec(tool: AgentTool): ToolSpec {
  return {
    name: tool.name,
    description: tool.description,
    jsonSchema: toJsonSchema(tool.schema),
  };
}

/** 执行一个工具，把异常转成模型能理解的错误文本而不是让循环崩掉 */
export function runTool(
  tool: AgentTool,
  rawInput: unknown,
  ctx: ToolContext,
): { text: string; ok: boolean } {
  const parsed = tool.schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      text: `参数错误：${parsed.error.issues.map(i => `${i.path.join('.') || '(root)'} ${i.message}`).join('; ')}`,
    };
  }
  try {
    return { ok: true, text: tool.run(parsed.data, ctx) };
  } catch (err) {
    return { ok: false, text: `工具执行失败：${err instanceof Error ? err.message : String(err)}` };
  }
}
