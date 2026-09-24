/**
 * LLM 后端抽象
 *
 * 三个 agent 只依赖 LlmBackend 这个接口，不直接碰任何厂商 SDK。
 * 目的很具体：用本地小模型把流水线的**工程正确性**跑通（循环会不会失控、
 * schema 校验拦不拦得住、降级分支能不能触发），不用每次都烧 Claude 的额度。
 *
 * 接口只有两个方法，因为三个 agent 也只需要两种能力：
 *   complete()  —— 带工具的一轮对话（Agent 2 的循环）
 *   parseJson() —— 受 schema 约束的结构化输出（Agent 1 / Agent 3）
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export type ProviderId = 'anthropic' | 'local';

// ─── 归一化的对话表示 ────────────────────────────────────────────────────────

export interface ToolSpec {
  name: string;
  description: string;
  jsonSchema: Record<string, unknown>;
}

export interface NormalizedToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResult {
  id: string;
  name: string;
  text: string;
  isError?: boolean;
}

export type AgentTurn =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls: NormalizedToolCall[] }
  | { role: 'tool_results'; results: ToolResult[] };

export interface CompleteRequest {
  system: string;
  turns: AgentTurn[];
  tools: ToolSpec[];
  maxTokens: number;
}

export interface CompleteResponse {
  text: string;
  toolCalls: NormalizedToolCall[];
}

export interface ParseJsonRequest<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
}

export interface LlmBackend {
  readonly id: ProviderId;
  readonly label: string;
  readonly model: string;
  complete(req: CompleteRequest): Promise<CompleteResponse>;
  parseJson<T>(req: ParseJsonRequest<T>): Promise<T>;
}

/** zod → JSON Schema，去掉 $schema 噪音（两个后端都不认） */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const s = z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>;
  delete s.$schema;
  return s;
}

// ─── Anthropic 后端 ──────────────────────────────────────────────────────────

/** 三个 agent 的默认模型。分类器任务简单，想省钱可单独降到 claude-haiku-4-5 */
export const ANTHROPIC_MODEL = 'claude-opus-5';

/**
 * 归一化对话 → Anthropic 消息。
 *
 * 独立成函数是为了能直接对它写测试 —— 这里的两条约束违反了就是 400，
 * 而且在真实调用之前发现不了：
 *  1. 每个 tool_use 必须由紧随其后的 user 消息中的 tool_result 应答（由 analyst 保证）；
 *  2. 消息的 content 不能为空数组。
 */
export function toAnthropicMessages(turns: AgentTurn[]): Anthropic.MessageParam[] {
  return turns.map((turn): Anthropic.MessageParam => {
    if (turn.role === 'user') {
      return { role: 'user', content: turn.text };
    }
    if (turn.role === 'tool_results') {
      // 同一轮的所有 tool_result 必须打包进一条 user 消息，
      // 拆开会让模型逐渐放弃并行调用工具
      return {
        role: 'user',
        content: turn.results.map((r): Anthropic.ToolResultBlockParam => ({
          type: 'tool_result',
          tool_use_id: r.id,
          content: r.text,
          ...(r.isError ? { is_error: true } : {}),
        })),
      };
    }
    const blocks: Anthropic.ContentBlockParam[] = [];
    if (turn.text.trim()) blocks.push({ type: 'text', text: turn.text });
    for (const call of turn.toolCalls) {
      blocks.push({
        type: 'tool_use',
        id: call.id,
        name: call.name,
        input: call.input as Record<string, unknown>,
      });
    }
    // 模型既没出文本也没调工具时 blocks 为空，空 content 会被 API 拒绝。
    // 占位符让后续的"你还没调用 submit_analysis"提示能真正送达，而不是整轮报错。
    if (blocks.length === 0) blocks.push({ type: 'text', text: '(本轮无输出)' });
    return { role: 'assistant', content: blocks };
  });
}

class AnthropicBackend implements LlmBackend {
  readonly id = 'anthropic' as const;
  readonly label = 'Claude';
  readonly model = ANTHROPIC_MODEL;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: CompleteRequest): Promise<CompleteResponse> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: req.maxTokens,
      system: req.system,
      tools: req.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.jsonSchema as Anthropic.Tool.InputSchema,
      })),
      messages: toAnthropicMessages(req.turns),
    });
    const message = await stream.finalMessage();

    return {
      text: message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n'),
      toolCalls: message.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map(b => ({ id: b.id, name: b.name, input: b.input })),
    };
  }

  async parseJson<T>(req: ParseJsonRequest<T>): Promise<T> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      output_config: { format: zodOutputFormat(req.schema) },
    });
    if (!response.parsed_output) throw new Error('模型返回了无法解析的结构化输出');
    return response.parsed_output as T;
  }
}

// ─── 本地 Ollama 后端 ────────────────────────────────────────────────────────

/**
 * 走 Ollama 原生 /api/chat 而非 OpenAI 兼容端点，为的是 `format` 参数：
 * 它把 JSON Schema 编译成语法约束直接作用于解码，小模型**不可能**吐出不合 schema 的 JSON。
 * OpenAI 兼容层的 response_format 在 Ollama 上映射没这么可靠。
 *
 * baseUrl 只从服务端环境变量读，绝不接受请求里传入的地址 —— 否则这就是个 SSRF 洞。
 */
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:4b';
/** 工具返回的盘面文本很长，默认 4096 的上下文完全不够 */
const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 16384);

interface OllamaToolCall {
  /** 新版 Ollama 会给 id，旧版不给 —— 两种都要能跑 */
  id?: string;
  function: { name: string; arguments: Record<string, unknown> | string };
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

interface OllamaChatResponse {
  message?: { role: string; content?: string; tool_calls?: OllamaToolCall[] };
  error?: string;
}

class OllamaBackend implements LlmBackend {
  readonly id = 'local' as const;
  readonly label = '本地模型';
  readonly model = OLLAMA_MODEL;

  private async chat(body: Record<string, unknown>): Promise<OllamaChatResponse> {
    let response: Response;
    try {
      response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          // Qwen3 是混合推理模型，关掉思考链：多轮工具循环里它经常边想边把
          // 工具调用写进正文，反而调不出来，而且慢一倍
          think: false,
          options: { num_ctx: OLLAMA_NUM_CTX, temperature: 0.6 },
          ...body,
        }),
      });
    } catch {
      throw new Error(
        `连不上本地模型服务（${OLLAMA_BASE_URL}）。请先运行 \`ollama serve\`，并确认已 \`ollama pull ${this.model}\``
      );
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`本地模型返回 ${response.status}：${detail.slice(0, 300)}`);
    }

    const json = (await response.json()) as OllamaChatResponse;
    if (json.error) throw new Error(`本地模型错误：${json.error}`);
    return json;
  }

  private toMessages(system: string, turns: AgentTurn[]): OllamaMessage[] {
    const messages: OllamaMessage[] = [{ role: 'system', content: system }];
    for (const turn of turns) {
      if (turn.role === 'user') {
        messages.push({ role: 'user', content: turn.text });
      } else if (turn.role === 'tool_results') {
        // Ollama 的 tool 消息是一条一个结果，不像 Anthropic 要打包
        for (const r of turn.results) {
          messages.push({
            role: 'tool',
            tool_name: r.name,
            content: r.isError ? `[工具执行失败] ${r.text}` : r.text,
          });
        }
      } else {
        messages.push({
          role: 'assistant',
          content: turn.text,
          ...(turn.toolCalls.length
            ? {
                tool_calls: turn.toolCalls.map(c => ({
                  id: c.id,
                  function: { name: c.name, arguments: (c.input ?? {}) as Record<string, unknown> },
                })),
              }
            : {}),
        });
      }
    }
    return messages;
  }

  async complete(req: CompleteRequest): Promise<CompleteResponse> {
    const json = await this.chat({
      messages: this.toMessages(req.system, req.turns),
      tools: req.tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.jsonSchema },
      })),
    });

    const raw = json.message?.tool_calls ?? [];
    return {
      text: json.message?.content ?? '',
      // 新版 Ollama 自带 id；旧版没有就合成一个，保持与 Anthropic 侧同构
      toolCalls: raw.map((c, i) => ({
        id: c.id ?? `local_${Date.now()}_${i}`,
        name: c.function.name,
        input: typeof c.function.arguments === 'string'
          ? safeJsonParse(c.function.arguments)
          : c.function.arguments,
      })),
    };
  }

  async parseJson<T>(req: ParseJsonRequest<T>): Promise<T> {
    const json = await this.chat({
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      // 约束解码：输出必然符合这个 schema
      format: toJsonSchema(req.schema),
    });

    const content = json.message?.content ?? '';
    const parsed = req.schema.safeParse(safeJsonParse(content));
    if (!parsed.success) {
      throw new Error(
        `本地模型的结构化输出不合 schema：${parsed.error.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}`
      );
    }
    return parsed.data;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // 小模型偶尔会在 JSON 外面裹一层 markdown code fence
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) {
      try {
        return JSON.parse(fenced[1]);
      } catch { /* 继续往下走 */ }
    }
    const braced = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    try {
      return JSON.parse(braced);
    } catch {
      return {};
    }
  }
}

// ─── 工厂 ────────────────────────────────────────────────────────────────────

export function createBackend(provider: ProviderId, apiKey?: string | null): LlmBackend {
  if (provider === 'local') return new OllamaBackend();
  if (!isValidKey(apiKey ?? null)) throw new Error('缺少有效的 Anthropic API Key');
  return new AnthropicBackend(apiKey!);
}

export function isValidKey(key: string | null): key is string {
  return !!key && key.startsWith('sk-ant-');
}

/** 把各类异常转成给用户看的中文消息 */
export function describeApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'API Key 无效或已失效';
  if (err instanceof Anthropic.RateLimitError) return '触发速率限制，请稍后重试';
  if (err instanceof Anthropic.BadRequestError) return `请求被拒绝：${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return '无法连接 Anthropic API';
  if (err instanceof Anthropic.APIError) return `API 错误 (${err.status})：${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
