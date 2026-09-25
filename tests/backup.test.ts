/**
 * 备份/恢复测试
 *
 * 这块代码的失效方式很不友好：平时看不出问题，等到真的要恢复数据时才发现导入不进去，
 * 而那时原始数据往往已经没了。所以格式校验与合并语义都要有断言。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildBackup, backupFilename, restoreBackup, BackupFormatError, BACKUP_FORMAT_VERSION,
} from '../lib/qimen/research/backup';
import { createEvent, getAllEvents, clearAll } from '../lib/qimen/research/eventStore';
import { generateChart } from '../lib/qimen/algorithm';

// eventStore / caseStudy 依赖 localStorage
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (globalThis as { window?: unknown }).window = globalThis;
});

const chart = generateChart({ year: 1996, month: 3, day: 24, hour: 11, minute: 45 });

describe('备份文件', () => {
  it('带格式标识、版本号与条数，便于日后识别', () => {
    createEvent(chart, '失物寻找', '钱包丢哪了');
    const b = buildBackup();
    expect(b.format).toBe('qimen-research-backup');
    expect(b.version).toBe(BACKUP_FORMAT_VERSION);
    expect(b.counts.events).toBe(1);
    expect(b.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('文件名带日期，多次备份可区分', () => {
    expect(backupFilename(new Date('2026-09-24T10:00:00Z'))).toBe('qimen-research-2026-09-24.json');
  });
});

describe('恢复', () => {
  it('完整往返：导出后清空再导入，记录回来了', () => {
    createEvent(chart, '失物寻找', '钱包丢哪了');
    createEvent(chart, '疾病健康', '病情如何');
    const text = JSON.stringify(buildBackup());

    clearAll();
    expect(getAllEvents()).toHaveLength(0);

    const summary = restoreBackup(text);
    expect(summary.events.imported).toBe(2);
    expect(getAllEvents()).toHaveLength(2);
  });

  it('重复导入同一文件不产生副本', () => {
    createEvent(chart, '失物寻找', '钱包丢哪了');
    const text = JSON.stringify(buildBackup());

    const first = restoreBackup(text);
    expect(first.events.imported).toBe(0);   // 本地已有，全部跳过
    expect(first.events.skipped).toBe(1);
    expect(getAllEvents()).toHaveLength(1);

    clearAll();
    restoreBackup(text);
    const second = restoreBackup(text);
    expect(second.events.imported).toBe(0);
    expect(getAllEvents()).toHaveLength(1);
  });

  it('不覆盖本地已有记录 —— 回访结果不会被旧备份冲掉', () => {
    const e = createEvent(chart, '失物寻找', '钱包丢哪了');
    const text = JSON.stringify(buildBackup());

    // 本地补了回访
    const all = getAllEvents();
    all[0].outcome = { recordedAt: 'x', outcome: true, confidence: 3, actualResult: '找到了' };
    localStorage.setItem('qimen_research_events', JSON.stringify(all));

    restoreBackup(text);   // 导入没有回访的旧版本
    expect(getAllEvents()[0].outcome).not.toBeNull();
    expect(getAllEvents()[0].id).toBe(e.id);
  });

  it('非法 JSON 给出可读错误，而不是抛原始解析异常', () => {
    expect(() => restoreBackup('不是 json')).toThrow(BackupFormatError);
    expect(() => restoreBackup('不是 json')).toThrow(/不是合法的 JSON/);
  });

  it('别的应用导出的 JSON 会被拒绝，而不是静默导入零条', () => {
    expect(() => restoreBackup('{"foo":1}')).toThrow(/不是本应用导出的备份/);
  });

  it('未来版本的备份被明确拒绝，而不是丢字段导入', () => {
    const future = { format: 'qimen-research-backup', version: 99, events: [], cases: [] };
    expect(() => restoreBackup(JSON.stringify(future))).toThrow(/高于本应用支持的/);
  });

  it('兼容直接导入旧版的裸事件数组', () => {
    createEvent(chart, '失物寻找', '旧数据');
    const bare = localStorage.getItem('qimen_research_events')!;
    clearAll();

    const summary = restoreBackup(bare);
    expect(summary.events.imported).toBe(1);
    expect(getAllEvents()).toHaveLength(1);
  });
});
