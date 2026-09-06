'use client';

import { useState } from 'react';
import type { QimenChart } from '@/lib/qimen/types';
import type { PalaceIndex } from '@/lib/qimen/constants';
import { PALACE_GRID, STAR_ORIGINAL_PALACE } from '@/lib/qimen/constants';
import { PalaceCell } from './PalaceCell';
import { PalaceDetail } from './PalaceDetail';

interface NinePalaceGridProps {
  chart: QimenChart;
}

export function NinePalaceGrid({ chart }: NinePalaceGridProps) {
  const [selectedPalace, setSelectedPalace] = useState<PalaceIndex | null>(null);

  // 值符落宫
  const zhiFuPalace = Object.entries(chart.palaces).find(
    ([_, p]) => p.star === chart.zhiFu
  )?.[0];

  return (
    <div>
      {/* 盘面信息头 */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="rounded-md bg-qimen-gold/10 px-2 py-1 text-qimen-gold">
          {chart.dunType} {chart.juNumber}局
        </span>
        <span>{chart.yuan}</span>
        <span>值符: <span className="star-color">{chart.zhiFu}</span></span>
        <span>值使: <span className="gate-color">{chart.zhiShi}门</span></span>
        <span className="text-qimen-text-secondary">旬首: {chart.xunShou}</span>
        <span className="text-qimen-text-secondary">
          空亡: {chart.kongWang.join('、')}
        </span>
      </div>

      {/* 四柱 */}
      <div className="mb-4 flex gap-4 text-sm">
        <span>年: {chart.siZhu.year.gan}{chart.siZhu.year.zhi}</span>
        <span>月: {chart.siZhu.month.gan}{chart.siZhu.month.zhi}</span>
        <span>日: {chart.siZhu.day.gan}{chart.siZhu.day.zhi}</span>
        <span>时: {chart.siZhu.hour.gan}{chart.siZhu.hour.zhi}</span>
      </div>

      {/* 图例 */}
      <div className="mb-3 flex gap-4 text-xs text-qimen-text-secondary">
        <span><span className="deity-color">■</span> 神</span>
        <span><span className="star-color">■</span> 星</span>
        <span><span className="tian-gan-color">■</span> 天盘干</span>
        <span><span className="di-gan-color">■</span> 地盘干</span>
        <span><span className="gate-color">■</span> 门</span>
      </div>

      {/* 九宫格 */}
      <div className="grid grid-cols-3 gap-2">
        {PALACE_GRID.flat().map(palaceIdx => {
          const palace = chart.palaces[palaceIdx];
          const isZhiFu = String(palaceIdx) === zhiFuPalace;

          return (
            <PalaceCell
              key={palaceIdx}
              palace={palace}
              isZhiFuPalace={isZhiFu}
              onClick={() => setSelectedPalace(palaceIdx)}
            />
          );
        })}
      </div>

      {/* 方位标注 */}
      <div className="mt-2 flex justify-between text-xs text-qimen-text-secondary">
        <span>东南 ← → 西南</span>
        <span>上南下北</span>
        <span>东北 ← → 西北</span>
      </div>

      {/* 宫位详情弹窗 */}
      {selectedPalace && (
        <PalaceDetail
          palace={chart.palaces[selectedPalace]}
          onClose={() => setSelectedPalace(null)}
        />
      )}
    </div>
  );
}
