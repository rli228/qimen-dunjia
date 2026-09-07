/**
 * 案例库 Schema + 存储
 *
 * 记录人工解盘过程，作为学习资料和特征标注数据。
 * 来源：书籍、老师教学、自己练习、视频等。
 */

import type { EventTypeKey } from '../interpretation/data/yongShen';

// ─── 案例 Schema ─────────────────────────────────────────────────────────────

export interface KeyFactor {
  element: string;       // 涉及的盘面元素（如"庚落坎1宫"、"乙庚合"、"开门得丙奇"）
  role: string;          // 在断语中的角色（如"用神"、"忌神"、"关键格局"）
  effect: '利' | '不利' | '中性';  // 对结果的影响方向
  note?: string;         // 补充说明
}

export interface CaseInterpretation {
  keyFactors: KeyFactor[];       // 决定性因素（按重要性排序）
  reasoning: string;             // 完整推理过程（自由文本）
  conclusion: string;            // 人工结论
  confidence: 1 | 2 | 3 | 4 | 5; // 解盘者确信度
}

export interface CaseStudy {
  id: string;
  createdAt: string;             // ISO 8601
  version: 1;

  // 盘面信息（手动录入，不依赖排盘算法）
  chartInfo: CaseChartInfo;

  // 问题信息
  eventType: EventTypeKey;
  question: string;              // 原始问题

  // 人工解盘过程（核心）
  interpretation: CaseInterpretation;

  // 真实结果
  actualOutcome?: string;        // 实际结果描述
  outcomeCorrect?: boolean | null; // 判断是否正确（null=未知）

  // 元信息
  source: CaseSource;
  difficulty: '入门' | '进阶' | '高级';
  tags: string[];                // 知识点标签（如"乙庚合"、"空亡"、"值使门"）
  teachingNotes?: string;        // 教学价值说明

  // 书籍来源详情
  bookRef?: BookReference;
}

export type CaseSource = '书籍' | '老师' | '自己' | '视频' | '其他';

export interface BookReference {
  title: string;         // 书名
  author?: string;       // 作者
  chapter?: string;      // 章节
  page?: string;         // 页码
}

export interface CaseChartInfo {
  // 基础信息（文本形式，方便从书上直接抄录）
  dateTime: string;      // 起盘时间描述（如"2024年3月15日 巳时"）
  jieQi: string;         // 节气
  yuan: string;          // 三元
  dunType: string;       // 阴阳遁
  juNumber: number;      // 局数
  zhiFu: string;         // 值符
  zhiShi: string;        // 值使

  // 九宫简要（可选，用于展示）
  palaceNotes?: string;  // 盘面要点描述（自由文本，从书上摘录关键信息）

  // 四柱
  siZhu?: string;        // 如"甲子年 丙寅月 庚午日 壬午时"

  // 如果有完整排盘数据，可关联
  chartSnapshotId?: string;  // 关联到 EventRecord.id
}

// ─── localStorage 存储 ───────────────────────────────────────────────────────

const STORAGE_KEY = 'qimen_case_studies';

function loadAll(): CaseStudy[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(cases: CaseStudy[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export function createCase(data: Omit<CaseStudy, 'id' | 'createdAt' | 'version'>): CaseStudy {
  const record: CaseStudy = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    version: 1,
  };
  const all = loadAll();
  all.push(record);
  saveAll(all);
  return record;
}

export function updateCase(id: string, updates: Partial<Omit<CaseStudy, 'id' | 'createdAt' | 'version'>>): boolean {
  const all = loadAll();
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return false;
  all[idx] = { ...all[idx], ...updates };
  saveAll(all);
  return true;
}

export function deleteCase(id: string): boolean {
  const all = loadAll();
  const filtered = all.filter(c => c.id !== id);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}

export function getAllCases(): CaseStudy[] {
  return loadAll();
}

export function getCasesByEventType(eventType: EventTypeKey): CaseStudy[] {
  return loadAll().filter(c => c.eventType === eventType);
}

export function getCasesByTag(tag: string): CaseStudy[] {
  return loadAll().filter(c => c.tags.includes(tag));
}

export function getCasesByDifficulty(difficulty: CaseStudy['difficulty']): CaseStudy[] {
  return loadAll().filter(c => c.difficulty === difficulty);
}

/** 获取所有已用标签（去重） */
export function getAllTags(): string[] {
  const all = loadAll();
  const tagSet = new Set<string>();
  for (const c of all) {
    for (const t of c.tags) tagSet.add(t);
  }
  return [...tagSet].sort();
}

/** 统计 */
export function getCaseStats(): {
  total: number;
  byEventType: Record<string, number>;
  byDifficulty: Record<string, number>;
  bySource: Record<string, number>;
  correctCount: number;
  incorrectCount: number;
} {
  const all = loadAll();
  const byEventType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let correctCount = 0;
  let incorrectCount = 0;

  for (const c of all) {
    byEventType[c.eventType] = (byEventType[c.eventType] ?? 0) + 1;
    byDifficulty[c.difficulty] = (byDifficulty[c.difficulty] ?? 0) + 1;
    bySource[c.source] = (bySource[c.source] ?? 0) + 1;
    if (c.outcomeCorrect === true) correctCount++;
    if (c.outcomeCorrect === false) incorrectCount++;
  }

  return { total: all.length, byEventType, byDifficulty, bySource, correctCount, incorrectCount };
}

/** 导出 JSON */
export function exportCasesJSON(): string {
  return JSON.stringify(loadAll(), null, 2);
}

/** 导入 JSON（合并，不覆盖） */
export function importCasesJSON(json: string): { imported: number; skipped: number } {
  const incoming: CaseStudy[] = JSON.parse(json);
  if (!Array.isArray(incoming)) return { imported: 0, skipped: 0 };
  const existing = loadAll();
  const existingIds = new Set(existing.map(c => c.id));

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
