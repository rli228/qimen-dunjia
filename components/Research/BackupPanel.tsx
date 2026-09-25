'use client';

import { useRef, useState } from 'react';
import {
  buildBackup, backupFilename, restoreBackup, BackupFormatError,
  type ImportSummary,
} from '@/lib/qimen/research/backup';

/**
 * 数据备份
 *
 * 记录只存在这个浏览器的 localStorage 里：清站点数据就没了，换设备是另一份。
 * 而这些数据要积累数月才有统计意义 —— 没有导出入口，等于默认它迟早会丢。
 */
export function BackupPanel({ onRestored }: { onRestored?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const doExport = () => {
    try {
      const backup = buildBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFilename();
      a.click();
      URL.revokeObjectURL(url);
      setMsg({
        kind: 'ok',
        text: `已导出 ${backup.counts.events} 条记录、${backup.counts.cases} 条案例`,
      });
    } catch (err) {
      setMsg({ kind: 'err', text: `导出失败：${err instanceof Error ? err.message : String(err)}` });
    }
  };

  const doImport = async (file: File) => {
    try {
      const summary: ImportSummary = restoreBackup(await file.text());
      const parts: string[] = [];
      if (summary.events.imported || summary.events.skipped) {
        parts.push(`记录 新增 ${summary.events.imported}、跳过 ${summary.events.skipped}`);
      }
      if (summary.cases.imported || summary.cases.skipped) {
        parts.push(`案例 新增 ${summary.cases.imported}、跳过 ${summary.cases.skipped}`);
      }
      setMsg({ kind: 'ok', text: parts.length ? parts.join('；') : '文件中没有可导入的数据' });
      onRestored?.();
    } catch (err) {
      setMsg({
        kind: 'err',
        text: err instanceof BackupFormatError
          ? err.message
          : `导入失败：${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border border-qimen-border bg-qimen-surface p-4">
      <h3 className="text-sm font-bold text-qimen-gold">数据备份</h3>
      <p className="mt-1 text-xs text-qimen-text-secondary">
        记录只存在当前浏览器中。清除站点数据、换浏览器或换设备都会丢失，建议定期导出。
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={doExport}
          className="rounded-lg bg-qimen-gold px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          导出备份
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-qimen-border px-4 py-2 text-xs transition-colors hover:bg-qimen-border"
        >
          导入备份
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
          }}
          className="hidden"
        />
      </div>

      <p className="mt-2 text-[10px] text-qimen-text-secondary/60">
        导入按 id 合并，已存在的条目会跳过 —— 重复导入同一文件不会产生副本，也不会覆盖本地已填的回访结果。
      </p>

      {msg && (
        <p className={`mt-3 rounded px-3 py-2 text-xs ${
          msg.kind === 'ok' ? 'bg-qimen-green/10 text-qimen-green' : 'bg-qimen-red/10 text-qimen-red'
        }`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
