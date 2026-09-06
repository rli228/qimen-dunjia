'use client';

import { useState } from 'react';
import type { ChartInput } from '@/lib/qimen/types';

interface ChartFormProps {
  onSubmit: (input: ChartInput) => void;
}

export function ChartForm({ onSubmit }: ChartFormProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [day, setDay] = useState(now.getDate());
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(now.getMinutes());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ year, month, day, hour, minute });
  };

  const handleNow = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth() + 1);
    setDay(n.getDate());
    setHour(n.getHours());
    setMinute(n.getMinutes());
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-qimen-border bg-qimen-surface p-6">
      <h2 className="mb-4 text-lg font-semibold">排盘输入</h2>

      <div className="mb-4 grid grid-cols-5 gap-3">
        <div>
          <label className="mb-1 block text-xs text-qimen-text-secondary">年</label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="w-full rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-center text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-qimen-text-secondary">月</label>
          <input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-center text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-qimen-text-secondary">日</label>
          <input
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={e => setDay(Number(e.target.value))}
            className="w-full rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-center text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-qimen-text-secondary">时</label>
          <input
            type="number"
            min={0}
            max={23}
            value={hour}
            onChange={e => setHour(Number(e.target.value))}
            className="w-full rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-center text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-qimen-text-secondary">分</label>
          <input
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={e => setMinute(Number(e.target.value))}
            className="w-full rounded-lg border border-qimen-border bg-qimen-bg px-3 py-2 text-center text-sm"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-qimen-gold px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          起局排盘
        </button>
        <button
          type="button"
          onClick={handleNow}
          className="rounded-lg border border-qimen-border px-4 py-2.5 text-sm transition-colors hover:bg-qimen-border"
        >
          当前时间
        </button>
      </div>

      <p className="mt-3 text-xs text-qimen-text-secondary">
        时家奇门 · 拆补法 · 转盘
      </p>
    </form>
  );
}
