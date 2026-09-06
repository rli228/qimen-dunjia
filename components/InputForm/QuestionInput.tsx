'use client';

import { useState } from 'react';

interface QuestionInputProps {
  onSubmit: (question: string) => void;
}

export function QuestionInput({ onSubmit }: QuestionInputProps) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    onSubmit(q);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-qimen-border bg-qimen-surface p-6">
      <h2 className="mb-2 text-lg font-semibold">问事起盘</h2>
      <p className="mb-4 text-xs text-qimen-text-secondary">
        输入您想问的问题，系统将以当前时辰自动起盘并解读
      </p>

      <textarea
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="例如：最近想跳槽，适合吗？/ 这笔投资能赚钱吗？/ 明天出差顺利吗？"
        rows={3}
        className="mb-4 w-full resize-none rounded-lg border border-qimen-border bg-qimen-bg px-4 py-3 text-sm leading-relaxed placeholder:text-qimen-text-secondary/50"
      />

      <button
        type="submit"
        disabled={!question.trim()}
        className="w-full rounded-lg bg-qimen-gold px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        起盘问事
      </button>
    </form>
  );
}
