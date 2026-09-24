/**
 * Agent 1：问题分类器
 *
 * 职责：把自由文本问题映射到 EventTypeKey 枚举，并抽取实体。
 *
 * 为什么不能让它自由发挥事类名称：整条下游链路（EVENT_TEMPLATES → 用神角色 →
 * 加权评分 → tier）都以这个 key 为索引。分类错误不会报错，只会安静地取错用神，
 * 然后一本正经地分析一个跟用户问题无关的东西。所以这里用 structured output 把
 * 输出锁死在枚举内，并强制它给出 confidence。
 */

import { z } from 'zod';
import type { LlmBackend } from './llm';
import { EVENT_TYPE_KEYS, EVENT_TEMPLATES } from '@/lib/qimen/interpretation/data/yongShen';
import type { EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';
import type { ClassificationResult } from './types';

const classificationSchema = z.object({
  eventType: z.enum(EVENT_TYPE_KEYS as [EventTypeKey, ...EventTypeKey[]]),
  confidence: z.number().min(0).max(1).describe('0-1。问题直白明确给 0.9+；需要推测意图给 0.5-0.7；勉强归类给 0.3 以下'),
  alternative: z.enum(EVENT_TYPE_KEYS as [EventTypeKey, ...EventTypeKey[]]).nullable().describe('次优候选事类，没有则 null'),
  reasoning: z.string().describe('一两句话说明为什么归到这一类'),
  entities: z.object({
    subject: z.string().nullable().describe('求测主体，如"我"、"主队巴西"'),
    counterparty: z.string().nullable().describe('对方/客体，如"对方公司"、"客队阿根廷"'),
    timeframe: z.string().nullable().describe('时间范围，如"这个月"、"下周日比赛"'),
    quantitative: z.string().nullable().describe('如果在问具体数量（几块金牌、多少钱），写明问的是什么数量；否则 null'),
  }),
  needsClarification: z.boolean().describe('问题含混到任何事类都不贴切时为 true'),
  clarifyingQuestion: z.string().nullable().describe('needsClarification 为 true 时给出要反问用户的一句话'),
});

function buildSystemPrompt(): string {
  const catalog = EVENT_TYPE_KEYS.map(k => {
    const t = EVENT_TEMPLATES[k];
    const roles = t.roles.map(r => r.label).join('/');
    return `- ${k}：${t.analysisGuide.slice(0, 40)}… 用神角色：${roles}`;
  }).join('\n');

  return `你是奇门遁甲问事系统的分类器。你的唯一任务是把用户的问题归入下列事类之一，并抽取关键实体。

可用事类（必须严格从中选择，不可自创）：
${catalog}

归类原则：
- 按用户**真正想知道的结果**归类，不要按问题里出现的词归类。
  例："和同事吵架会不会影响我升职" → 求职面试/事业方向，不是官讼诉讼。
  例："他还会回来找我吗" → 婚姻感情。
  例："这场球谁赢" / "中国队能拿几块金牌" → 体育竞猜。
- 涉及具体数量的问题（几块金牌、能赚多少），在 entities.quantitative 中写明，下游会启用河图数定量分析。
- confidence 要诚实。归类勉强就给低分，不要为了显得确定而虚报。
- 只有问题真的无法判断意图时才把 needsClarification 设为 true；含糊但能合理推测的，选最可能的事类并降低 confidence。

不要分析盘面，不要给任何吉凶判断 —— 那是下一个 agent 的工作。`;
}

export async function classify(
  backend: LlmBackend,
  question: string,
): Promise<ClassificationResult> {
  const parsed = await backend.parseJson({
    system: buildSystemPrompt(),
    user: `用户问题：${question}`,
    schema: classificationSchema,
    maxTokens: 2000,
  });

  return {
    eventType: parsed.eventType,
    confidence: parsed.confidence,
    alternative: parsed.alternative,
    reasoning: parsed.reasoning,
    entities: {
      subject: parsed.entities.subject ?? undefined,
      counterparty: parsed.entities.counterparty ?? undefined,
      timeframe: parsed.entities.timeframe ?? undefined,
      quantitative: parsed.entities.quantitative ?? undefined,
    },
    needsClarification: parsed.needsClarification,
    clarifyingQuestion: parsed.clarifyingQuestion,
  };
}
