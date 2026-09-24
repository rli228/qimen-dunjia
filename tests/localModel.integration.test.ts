/**
 * 本地模型集成测试 —— 默认跳过
 *
 * 跑法：
 *   ollama serve                       # 另开一个终端
 *   ollama pull qwen3:4b
 *   QIMEN_LOCAL_TEST=1 npx vitest run tests/localModel.integration.test.ts
 *
 * 它验证的是**工程正确性**而不是解盘质量：循环会不会失控、工具调不调得动、
 * schema 约束解码顶不顶用、降级分支能不能触发。4B 模型的断语必然粗糙，
 * 所以这里一律不断言内容，只断言结构与流程。
 */

import { describe, it, expect } from 'vitest';
import { createBackend, OLLAMA_MODEL } from '../lib/agents/llm';
import { runPipeline, decideNextStep } from '../lib/agents/pipeline';
import { classify } from '../lib/agents/classifier';
import { EVENT_TYPE_KEYS } from '../lib/qimen/interpretation/data/yongShen';
import type { PipelineEvent } from '../lib/agents/types';

const ENABLED = process.env.QIMEN_LOCAL_TEST === '1';
const d = ENABLED ? describe : describe.skip;

d(`本地模型集成（${OLLAMA_MODEL}）`, () => {
  const backend = createBackend('local');

  it('服务可达且模型已下载', async () => {
    const r = await backend.parseJson({
      system: '你只输出 JSON。',
      user: '把数字 7 放进 value 字段。',
      schema: (await import('zod')).z.object({ value: (await import('zod')).z.number() }),
      maxTokens: 200,
    });
    expect(typeof r.value).toBe('number');
  }, 120_000);

  it('分类器输出落在 EventTypeKey 枚举内', async () => {
    const r = await classify(backend, '下周二面试那家公司，我能拿到 offer 吗？');
    expect(EVENT_TYPE_KEYS).toContain(r.eventType);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  }, 120_000);

  it('整条流水线跑通并产出结构合法的结果', async () => {
    const events: PipelineEvent[] = [];
    const result = await runPipeline(
      backend,
      { question: '下周二面试那家公司，我能拿到 offer 吗？', maxRevisions: 0 },
      e => events.push(e),
    );

    // 四个阶段都走到了
    const stages = events.filter(e => e.type === 'stage').map(e => e.stage);
    expect(stages).toContain('classify');
    expect(stages).toContain('cast');
    expect(stages).toContain('analyze');
    expect(stages).toContain('evaluate');

    // 盘面是确定性算法排的，不依赖模型
    expect(result.chart.palaces[1].gate).toBeTruthy();

    // 分析师至少调了一次工具
    expect(result.toolCalls.length).toBeGreaterThan(0);

    // 结论结构合法（内容质量不作要求）
    expect(['大吉', '小吉', '平', '小凶', '大凶']).toContain(result.analysis.tier);
    expect(result.analysis.evidence.length).toBeGreaterThan(0);
    expect(result.analysis.headline.length).toBeGreaterThan(0);

    // 评估器四个维度都打了分
    for (const v of Object.values(result.evaluation.scores)) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }

    // 若触发降级，结论必须来自规则引擎且标注清楚
    if (result.degraded) {
      expect(result.analysis.confidence).toBe('低');
      expect(result.analysis.evidence.every(e => e.source === 'rule')).toBe(true);
      expect(events.some(e => e.type === 'degrade')).toBe(true);
    }
  }, 900_000);
});

// 闸门是纯函数，不需要模型，永远跑
describe('闸门与后端无关', () => {
  it('同样的评估结果在任何后端下都得出同样的决策', () => {
    const evaluation = {
      verdict: 'reject' as const,
      scores: { grounding: 1, ruleConsistency: 3, relevance: 3, calibration: 3 },
      issues: [],
      note: 'x',
    };
    expect(decideNextStep(evaluation, 1, 2).action).toBe('fallback');
  });
});
