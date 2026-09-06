/**
 * Claude API 代理路由 — 流式转发
 *
 * 用户的 API Key 通过 x-api-key header 传入
 */

import { NextRequest } from 'next/server';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20241022';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return Response.json({ error: '请提供 API Key' }, { status: 401 });
  }

  if (!apiKey.startsWith('sk-ant-')) {
    return Response.json({ error: 'API Key 格式不正确' }, { status: 400 });
  }

  let body: { systemPrompt: string; userMessage: string; beginnerMode?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 });
  }

  if (!body.systemPrompt || typeof body.systemPrompt !== 'string' ||
      !body.userMessage || typeof body.userMessage !== 'string') {
    return Response.json({ error: '缺少必要字段 systemPrompt / userMessage' }, { status: 400 });
  }

  if (body.systemPrompt.length > 10000 || body.userMessage.length > 20000) {
    return Response.json({ error: '请求内容过长' }, { status: 400 });
  }

  const maxTokens = body.beginnerMode ? 4096 : 2048;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        stream: true,
        system: body.systemPrompt,
        messages: [{ role: 'user', content: body.userMessage }],
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errorBody = await response.json();
        detail = errorBody?.error?.message || JSON.stringify(errorBody);
      } catch {
        detail = await response.text().catch(() => '');
      }
      return Response.json(
        { error: `Anthropic API 错误 (${response.status}): ${detail}` },
        { status: 502 }
      );
    }

    // 直接转发 SSE 流
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    return Response.json(
      { error: '无法连接 Anthropic API' },
      { status: 502 }
    );
  }
}
