/**
 * Agent 2：分析师
 *
 * 一个手写的 tool-use 循环，跑在 LlmBackend 抽象之上。为什么不用 SDK 的 toolRunner：
 * 一是要在每次工具调用前后往 SSE 流里发事件（前端要实时显示"正在查兑7宫…"），
 * 二是要在模型调用 submit_analysis 时立刻终止循环，三是同一套循环要能同时跑
 * Claude 和本地小模型。手写循环这三件事都是直给的。
 *
 * 会话是有状态的：修订轮次复用同一份 messages，模型能看到自己上一轮查过什么，
 * 不用把工具再跑一遍。
 */

import { toJsonSchema, type LlmBackend, type AgentTurn, type ToolSpec, type ToolResult } from './llm';
import {
  getToolsForEventType, toToolSpec, runTool,
  submitAnalysisSchema, SUBMIT_TOOL_NAME,
  type ToolContext, type AgentTool, type SubmitAnalysisInput,
} from './tools/index';
import { serializeChart } from '@/lib/ai/buildPrompt';
import { EVENT_TEMPLATES } from '@/lib/qimen/interpretation/data/yongShen';
import type {
  AnalysisResult, ClassificationResult, EvaluationIssue, EventEmitter, ToolCallLog,
} from './types';

const MAX_ITERATIONS = 12;
/** 连续多少轮不调用终止工具后改用约束解码兜底 */
const MAX_NUDGES = 2;

function buildSystemPrompt(): string {
  return `你是一位精通奇门遁甲的分析师，在一个多 agent 系统中担任「分析」环节。

【绝对规则】
1. 盘面已由确定性算法排好，你**不能**自己推算或臆测任何盘面元素。要知道某宫的内容，调用 inspect_palace。
2. 你引用的每一个盘面元素，必须逐字来自工具返回的内容。编造宫位、星门、格局或古籍原文，会被下游评估 agent 判为严重错误并打回重做。
3. 必须先调用 analyze_yongshen 拿到规则引擎的判定，再形成自己的结论。若你的 tier 与规则引擎不同，必须在 reasoning 里明确说明"规则引擎判为 X，我判为 Y，理由是…"。
4. 工作完成后**必须**调用 ${SUBMIT_TOOL_NAME} 交卷。不要用普通文字作答。

【工作流程】
a) analyze_yongshen —— 拿到用神落宫、旺衰、关系、规则引擎 tier
b) analyze_timing —— 用户问「什么时候」「多久」「几号」时必须调用；即使没明问，
   给出应期也让结论可验证得多
c) detect_patterns —— 看有没有会改变大势的格局
d) inspect_palace —— 对关键用神所在宫位逐个细查
e) search_cases / search_classics —— 找同类断法佐证。案例的盘面与当前盘不同，只能借鉴断法逻辑，不可照搬结论
f) ${SUBMIT_TOOL_NAME} —— 交卷

【表达要求】
- 用条件式语言，不要做绝对断言。"盘面显示…倾向于…" 而非 "一定会…"。
- confidence 要与证据强度匹配：用神信号一致性为"弱"、或主用神落空亡/未定位时，confidence 不应为"高"。
- 面向普通用户写 reasoning：出现专业术语时用一句白话解释（例："门迫——开门属金落在离九宫属火，火克金，办事受阻"）。`;
}

function buildInitialMessage(
  chart: Parameters<typeof serializeChart>[0],
  question: string,
  classification: ClassificationResult,
): string {
  const t = EVENT_TEMPLATES[classification.eventType];
  const e = classification.entities;
  const entityLines = [
    e.subject && `主体：${e.subject}`,
    e.counterparty && `对方：${e.counterparty}`,
    e.timeframe && `时间范围：${e.timeframe}`,
    e.quantitative && `⚠ 用户在问具体数量（${e.quantitative}）——需要给出定量判断，可参考河图数`,
  ].filter(Boolean);

  return [
    '<chart_data>',
    serializeChart(chart),
    '</chart_data>',
    '',
    `<user_question>${question}</user_question>`,
    '',
    '<classification>',
    `事类：${classification.eventType} ${t.icon}（分类器置信度 ${classification.confidence.toFixed(2)}）`,
    classification.alternative ? `次优候选：${classification.alternative} —— 若主事类的用神明显不成立，可用 analyze_yongshen 交叉验证这一类` : '',
    `分类理由：${classification.reasoning}`,
    ...entityLines,
    '</classification>',
    '',
    classification.confidence < 0.6
      ? '注意：分类置信度偏低，请在 reasoning 开头说明你按哪个事类来断，并提示用户若理解有偏差可重新提问。'
      : '',
    '现在开始分析。先调用 analyze_yongshen。',
  ].filter(Boolean).join('\n');
}


/**
 * 把工具输出压成一行可读摘要，供执行轨迹展示。
 *
 * 直接取前三行用 " / " 拼接会产生一串噪音：【标题】与工具名重复、空行留下悬空分隔符、
 * 缩进项目符号和全角空格原样混进来、末尾按字数硬切在句子中间。
 */
function summarizeToolOutput(text: string): string {
  const MAX = 90;
  const lines = text
    .split('\n')
    .map(l => l.replace(/[\u3000\s]+/g, ' ').trim())
    .filter(l => l.length > 0)
    // 首行的【…】标题与轨迹里已显示的工具名重复
    .filter(l => !/^【.*】$/.test(l))
    .map(l => l.replace(/^[·\-•]\s*/, ''));

  if (lines.length === 0) return '（无输出）';

  const first = lines[0].replace(/^【[^】]*】\s*/, '');
  return first.length > MAX ? first.slice(0, MAX) + '…' : first;
}

// ─── 会话 ────────────────────────────────────────────────────────────────────

export interface AnalystSession {
  run: (feedback?: { issues: EvaluationIssue[]; round: number }) => Promise<AnalysisResult>;
  toolCalls: ToolCallLog[];
}

export function createAnalystSession(
  backend: LlmBackend,
  ctx: ToolContext,
  question: string,
  classification: ClassificationResult,
  emit: EventEmitter,
): AnalystSession {
  const tools = getToolsForEventType(ctx.eventType);
  const toolMap = new Map<string, AgentTool>(tools.map(t => [t.name, t]));

  const toolSpecs: ToolSpec[] = [
    ...tools.map(toToolSpec),
    {
      name: SUBMIT_TOOL_NAME,
      description: '提交最终分析结果。完成分析后必须调用此工具收尾，不要用普通文字作答。',
      jsonSchema: toJsonSchema(submitAnalysisSchema),
    },
  ];

  const turns: AgentTurn[] = [
    { role: 'user', text: buildInitialMessage(ctx.chart, question, classification) },
  ];
  const toolCalls: ToolCallLog[] = [];

  /**
   * 约束解码兜底：把已有对话交给 parseJson，按 submit_analysis 的 schema 强制产出。
   * 走到这里说明模型不肯调用终止工具 —— 内容它写得出来，只是不走工具那条路。
   */
  async function forceSubmit(lastText: string): Promise<AnalysisResult> {
    const transcript = turns
      .filter((t): t is Extract<AgentTurn, { role: 'tool_results' }> => t.role === 'tool_results')
      .flatMap(t => t.results.map(r => `【${r.name}】\n${r.text}`))
      .join('\n\n');

    return await backend.parseJson({
      system: buildSystemPrompt(),
      user: [
        '以下是本次分析已经取得的全部工具输出：',
        transcript || '（无）',
        '',
        lastText.trim() ? `你此前写下的分析草稿：\n${lastText.trim()}` : '',
        '',
        `问题：${question}　事类：${ctx.eventType}`,
        '',
        '请据此直接输出最终分析结果。只引用上面工具输出中真实出现的盘面元素。',
      ].filter(Boolean).join('\n'),
      schema: submitAnalysisSchema,
      maxTokens: 4000,
    });
  }

  async function run(feedback?: { issues: EvaluationIssue[]; round: number }): Promise<AnalysisResult> {
    let nudges = 0;
    if (feedback) {
      turns.push({
        role: 'user',
        text: [
          '评估 agent 审核了你上一版分析，发现以下问题，请修订后重新调用 ' + SUBMIT_TOOL_NAME + '：',
          ...feedback.issues.map((i, n) =>
            `${n + 1}. [${i.severity}·${i.category}] ${i.detail}\n   建议修改：${i.fix}`),
          '',
          '如需核实盘面，可以再次调用工具。不要为了迎合评估而放弃你有证据支撑的判断——若你认为某条意见不成立，在 reasoning 中说明理由即可。',
        ].join('\n'),
      });
    }

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const response = await backend.complete({
        system: buildSystemPrompt(),
        turns,
        tools: toolSpecs,
        maxTokens: 16000,
      });

      turns.push({ role: 'assistant', text: response.text, toolCalls: response.toolCalls });

      // 没调工具就结束了 —— 模型试图用文字作答
      if (response.toolCalls.length === 0) {
        nudges++;
        // 反复催促无效时改用约束解码兜底。小模型常常能把分析写出来、
        // 却始终不肯走工具调用那条路；此时按 schema 强制解码必然得到合法 JSON，
        // 比继续空转到轮次上限后整轮报废要好。
        if (nudges >= MAX_NUDGES) {
          return await forceSubmit(response.text);
        }
        turns.push({
          role: 'user',
          text: `你还没有调用 ${SUBMIT_TOOL_NAME}。请立刻调用它提交结构化的分析结果，不要用普通文字回答。`,
        });
        continue;
      }
      nudges = 0;

      // 本轮**每一个** tool_use 都必须得到一条 tool_result，交卷那次也不例外。
      // 漏掉任何一条，下一次请求就会被 Anthropic 以 400 拒绝
      // （"tool_use ids were found without tool_result blocks immediately after"）。
      // 这一点在修订轮尤其致命：会话是跨轮复用的，上一轮悬空的 tool_use
      // 会一直卡在 turns 里，让之后每次请求都失败。
      const results: ToolResult[] = [];
      let submitted: SubmitAnalysisInput | null = null;

      for (const call of response.toolCalls) {
        if (call.name === SUBMIT_TOOL_NAME) {
          const parsed = submitAnalysisSchema.safeParse(call.input);
          if (parsed.success) {
            submitted = parsed.data;
            results.push({ id: call.id, name: call.name, text: '已收到分析结果。' });
          } else {
            // 字段不合法时把错误当工具结果喂回去，让模型自己修，别浪费一整轮
            results.push({
              id: call.id,
              name: call.name,
              isError: true,
              text: `提交被拒绝，字段不合法：${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}。请修正后重新调用 ${SUBMIT_TOOL_NAME}。`,
            });
          }
          continue;
        }

        const tool = toolMap.get(call.name);
        emit({ type: 'tool_call', name: call.name, input: call.input });
        const started = Date.now();

        const outcome = tool
          ? runTool(tool, call.input, ctx)
          : { ok: false, text: `未知工具：${call.name}。可用工具：${toolSpecs.map(t => t.name).join('、')}` };
        const ms = Date.now() - started;

        toolCalls.push({
          name: call.name,
          input: call.input,
          resultSummary: outcome.text.slice(0, 300),
          ok: outcome.ok,
          ms,
        });
        emit({
          type: 'tool_result',
          name: call.name,
          summary: summarizeToolOutput(outcome.text),
          ok: outcome.ok,
          ms,
        });

        results.push({ id: call.id, name: call.name, text: outcome.text, isError: !outcome.ok });
      }

      turns.push({ role: 'tool_results', results });

      // 先补完 tool_result 再返回，否则会话在修订轮就废了
      if (submitted) return submitted;
    }

    // 轮次用尽同样兜底，而不是让整次解盘报废
    return await forceSubmit('');
  }

  return { run, toolCalls };
}
