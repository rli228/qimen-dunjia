/**
 * 事件存储（localStorage）
 *
 * 轻量级本地存储，用于积累数据。
 * 支持：创建事件、回访结果、导出JSON、导入JSON
 *
 * 数据存在浏览器 localStorage 中，key = 'qimen_research_events'
 * 未来可扩展为服务端存储，接口保持不变。
 */

import type { QimenChart } from '../types';
import type { EventTypeKey } from '../interpretation/data/yongShen';
import type { EventRecord, OutcomeRecord } from './schema';
import { extractSnapshot, extractFeatures, extractPrediction } from './featureExtractor';

const STORAGE_KEY = 'qimen_research_events';

// ─── 读写 localStorage ──────────────────────────────────────────────────────

function loadAll(): EventRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(records: EventRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ─── 生成 UUID ───────────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID();
}

// ─── 公开 API ────────────────────────────────────────────────────────────────

/** 创建事件登记 */
export function createEvent(
  chart: QimenChart,
  eventType: EventTypeKey,
  questionText: string,
  questionMeta?: Record<string, string>,
): EventRecord {
  const record: EventRecord = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    version: 1,
    eventType,
    questionText,
    questionMeta,
    chartSnapshot: extractSnapshot(chart),
    features: extractFeatures(chart, eventType),
    systemPrediction: extractPrediction(chart, eventType),
    outcome: null,
  };

  const all = loadAll();
  all.push(record);
  saveAll(all);

  return record;
}

/** 记录结果回访 */
export function recordOutcome(
  eventId: string,
  outcome: OutcomeRecord,
): boolean {
  const all = loadAll();
  const idx = all.findIndex(e => e.id === eventId);
  if (idx === -1) return false;

  all[idx].outcome = outcome;
  saveAll(all);
  return true;
}

/** 获取所有事件 */
export function getAllEvents(): EventRecord[] {
  return loadAll();
}

/** 获取待回访事件（outcome === null） */
export function getPendingEvents(): EventRecord[] {
  return loadAll().filter(e => e.outcome === null);
}

/** 获取已回访事件（有明确标签） */
export function getLabeledEvents(): EventRecord[] {
  return loadAll().filter(e => e.outcome !== null && e.outcome.outcome !== null);
}

/** 按事类统计 */
export function getStats(): Record<EventTypeKey, { total: number; labeled: number; positive: number; negative: number }> {
  const all = loadAll();
  const stats: Record<string, { total: number; labeled: number; positive: number; negative: number }> = {};

  for (const e of all) {
    if (!stats[e.eventType]) {
      stats[e.eventType] = { total: 0, labeled: 0, positive: 0, negative: 0 };
    }
    stats[e.eventType].total++;
    if (e.outcome?.outcome === true) {
      stats[e.eventType].labeled++;
      stats[e.eventType].positive++;
    } else if (e.outcome?.outcome === false) {
      stats[e.eventType].labeled++;
      stats[e.eventType].negative++;
    }
  }

  return stats as Record<EventTypeKey, { total: number; labeled: number; positive: number; negative: number }>;
}

/** 导出为 JSON 字符串（用于备份或离线分析） */
export function exportJSON(): string {
  return JSON.stringify(loadAll(), null, 2);
}

/** 导入 JSON（合并，不覆盖已有 id） */
export function importJSON(json: string): { imported: number; skipped: number } {
  const incoming: EventRecord[] = JSON.parse(json);
  const existing = loadAll();
  const existingIds = new Set(existing.map(e => e.id));

  let imported = 0;
  let skipped = 0;

  for (const record of incoming) {
    if (existingIds.has(record.id)) {
      skipped++;
    } else {
      existing.push(record);
      imported++;
    }
  }

  saveAll(existing);
  return { imported, skipped };
}

/** 删除单条事件 */
export function deleteEvent(eventId: string): boolean {
  const all = loadAll();
  const filtered = all.filter(e => e.id !== eventId);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

/** 清空所有数据（危险操作） */
export function clearAll(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
