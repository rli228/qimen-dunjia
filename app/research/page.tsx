import { OutcomePanel } from '@/components/Research/OutcomePanel';

export default function ResearchPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-qimen-gold">研究记录</h1>
        <p className="mt-1 text-sm text-qimen-text-secondary">
          解盘自动登记 · 结果人工回访 · 应期客观计分
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <OutcomePanel />
      </div>
    </div>
  );
}
