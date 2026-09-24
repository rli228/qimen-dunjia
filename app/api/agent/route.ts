/**
 * Agent 流水线路由 — SSE 流式返回每一步进度
 *
 * 与 /api/interpret 的区别：那条路由是纯转发（把 Anthropic 的流原样透传），
 * 这里服务端要真正跑一个多轮 agent 循环，所以我们自己构造 SSE 流，
 * 发的是**流水线事件**而不是 token。
 *
 * API Key 依旧由用户通过 header 传入，用完即弃，不落盘。
 */

import { NextRequest } from 'next/server';
import { runPipeline, describeApiError } from '@/lib/agents/pipeline';
import { createBackend, isValidKey, type ProviderId } from '@/lib/agents/llm';
import type { PipelineEvent, PipelineInput } from '@/lib/agents/types';
import { EVENT_TYPE_KEYS } from '@/lib/qimen/interpretation/data/yongShen';
import type { EventTypeKey } from '@/lib/qimen/interpretation/data/yongShen';

/** agent 循环可能跑几十秒，别让平台按默认值掐断 */
export const maxDuration = 300;

const MAX_QUESTION_LENGTH = 500;
const MAX_USER_CASES = 50;

export async function POST(request: NextRequest) {
  const provider: ProviderId = request.headers.get('x-provider') === 'local' ? 'local' : 'anthropic';
  const apiKey = request.headers.get('x-api-key');

  // 本地模型不需要密钥；走 Claude 则必须有合法 key
  if (provider === 'anthropic' && !isValidKey(apiKey)) {
    return Response.json({ error: '请提供有效的 Anthropic API Key（sk-ant- 开头）' }, { status: 401 });
  }

  let body: {
    question?: unknown;
    chartInput?: PipelineInput['chartInput'];
    forcedEventType?: unknown;
    userCases?: unknown;
    maxRevisions?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return Response.json({ error: '请提供问题' }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return Response.json({ error: `问题过长（上限 ${MAX_QUESTION_LENGTH} 字）` }, { status: 400 });
  }

  const forcedEventType =
    typeof body.forcedEventType === 'string' && (EVENT_TYPE_KEYS as string[]).includes(body.forcedEventType)
      ? (body.forcedEventType as EventTypeKey)
      : undefined;

  const userCases = Array.isArray(body.userCases)
    ? body.userCases.slice(0, MAX_USER_CASES)
    : undefined;

  const maxRevisions =
    typeof body.maxRevisions === 'number' && body.maxRevisions >= 0 && body.maxRevisions <= 3
      ? body.maxRevisions
      : 1;

  let backend;
  try {
    backend = createBackend(provider, apiKey);
  } catch (err) {
    return Response.json({ error: describeApiError(err) }, { status: 400 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: PipelineEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        await runPipeline(
          backend,
          {
            question,
            chartInput: body.chartInput,
            forcedEventType,
            userCases: userCases as PipelineInput['userCases'],
            maxRevisions,
          },
          send,
        );
      } catch (err) {
        send({ type: 'error', message: describeApiError(err) });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
