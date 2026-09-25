/**
 * 数据备份
 *
 * 研究记录和案例库都只存在浏览器的 localStorage 里 —— 清一次站点数据就全没了，
 * 换浏览器或设备也是两份互不相干的数据。而这些记录要积累数月才有统计意义，
 * 中途丢一次就等于从零开始。
 *
 * 备份文件把两类数据打包成一个带版本号的文件，用户不必分别管理两个 JSON。
 */

import { exportJSON as exportEvents, importJSON as importEvents, getAllEvents } from './eventStore';
import { exportCasesJSON, importCasesJSON, getAllCases } from './caseStudy';
import type { EventRecord } from './schema';
import type { CaseStudy } from './caseStudy';

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFile {
  format: 'qimen-research-backup';
  version: number;
  exportedAt: string;
  counts: { events: number; cases: number };
  events: EventRecord[];
  cases: CaseStudy[];
}

export function buildBackup(): BackupFile {
  const events = getAllEvents();
  const cases = getAllCases();
  return {
    format: 'qimen-research-backup',
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { events: events.length, cases: cases.length },
    events,
    cases,
  };
}

/** 建议的文件名，带日期便于分辨多次备份 */
export function backupFilename(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `qimen-research-${d}.json`;
}

export interface ImportSummary {
  events: { imported: number; skipped: number };
  cases: { imported: number; skipped: number };
}

export class BackupFormatError extends Error {}

/**
 * 导入备份。按 id 合并，已存在的跳过 —— 重复导入同一文件不会产生副本，
 * 也不会覆盖本地更新过的回访结果。
 */
export function restoreBackup(text: string): ImportSummary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupFormatError('不是合法的 JSON 文件');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BackupFormatError('文件内容不是对象');
  }
  const obj = parsed as Partial<BackupFile>;

  // 兼容直接导入旧版的裸事件数组
  if (Array.isArray(parsed)) {
    return {
      events: importEvents(JSON.stringify(parsed)),
      cases: { imported: 0, skipped: 0 },
    };
  }

  if (obj.format !== 'qimen-research-backup') {
    throw new BackupFormatError('不是本应用导出的备份文件');
  }
  if (typeof obj.version !== 'number' || obj.version > BACKUP_FORMAT_VERSION) {
    throw new BackupFormatError(
      `备份格式版本 ${obj.version} 高于本应用支持的 ${BACKUP_FORMAT_VERSION}，请升级后再导入`
    );
  }

  return {
    events: Array.isArray(obj.events)
      ? importEvents(JSON.stringify(obj.events))
      : { imported: 0, skipped: 0 },
    cases: Array.isArray(obj.cases)
      ? importCasesJSON(JSON.stringify(obj.cases))
      : { imported: 0, skipped: 0 },
  };
}

/** 供调试或手工检查用 —— 单独导出两类数据的原始 JSON */
export const raw = { exportEvents, exportCasesJSON };
