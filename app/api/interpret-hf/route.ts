/**
 * Gemini API 代理路由 — 流式转发
 *
 * 使用 Gemini 2.0 Flash 模型（免费）
 * API Key 通过 x-gemini-key header 传入
 */

import { NextRequest } from 'next/server';

const MODEL = 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-gemini-key');

  if (!apiKey) {
    return Response.json({ error: '请提供 Gemini API Key' }, { status: 401 });
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

  try {
    const response = await fetch(`${GEMINI_API_URL}&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: body.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: body.userMessage }] }],
        generationConfig: {
          maxOutputTokens: body.beginnerMode ? 8192 : 4096,
        },
      }),
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => '');
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        detail = parsed?.error?.message || raw;
      } catch {
        detail = raw.slice(0, 200);
      }
      return Response.json(
        { error: `Gemini API 错误 (${response.status}): ${detail}` },
        { status: 502 }
      );
    }

    // 转发 SSE 流
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `无法连接 Gemini API: ${msg}` },
      { status: 502 }
    );
  }
}
