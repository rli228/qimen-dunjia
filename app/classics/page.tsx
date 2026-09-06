import { ClassicReader } from '@/components/Classics/ClassicReader';

export default async function ClassicsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-qimen-gold">古籍经典</h1>
        <p className="mt-1 text-sm text-qimen-text-secondary">
          烟波钓叟歌 · 奇门秘诀 · 十干克应
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <ClassicReader highlightId={params.id} />
      </div>
    </div>
  );
}
