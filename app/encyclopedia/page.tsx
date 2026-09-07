import { PatternReference } from '@/components/Encyclopedia/PatternReference';

export default function EncyclopediaPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-qimen-gold">奇门百科</h1>
        <p className="mt-1 text-sm text-qimen-text-secondary">
          吉格 · 凶格 · 格局速查
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <PatternReference />
      </div>
    </div>
  );
}
