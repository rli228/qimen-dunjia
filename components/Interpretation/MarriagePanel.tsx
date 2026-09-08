'use client';

import { useMemo } from 'react';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import type { QimenChart } from '@/lib/qimen/types';
import { analyzeMarriage, type PersonProfile, type ThirdParty, type MatchmakerInfo } from '@/lib/qimen/interpretation/marriageAnalysis';

const tierStyle = {
  '大吉': { bg: 'bg-qimen-green/10 border-qimen-green/30', text: 'text-qimen-green', badge: 'bg-qimen-green text-white' },
  '小吉': { bg: 'bg-qimen-green/5 border-qimen-green/20', text: 'text-qimen-green', badge: 'bg-qimen-green/80 text-white' },
  '平':   { bg: 'bg-gray-500/5 border-gray-500/20', text: 'text-qimen-text-secondary', badge: 'bg-gray-500 text-white' },
  '小凶': { bg: 'bg-qimen-red/5 border-qimen-red/20', text: 'text-qimen-red', badge: 'bg-qimen-red/80 text-white' },
  '大凶': { bg: 'bg-qimen-red/10 border-qimen-red/30', text: 'text-qimen-red', badge: 'bg-qimen-red text-white' },
};

function ProfileCard({ profile }: { profile: PersonProfile }) {
  if (!profile.palace) {
    return (
      <div className="rounded-lg bg-qimen-bg px-4 py-3">
        <span className="text-sm font-medium">{profile.label}（{profile.gan}）</span>
        <span className="ml-2 text-xs text-qimen-text-secondary">未在盘面中定位到</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-qimen-bg px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{profile.label}（{profile.gan}）</span>
        <span className="text-xs text-qimen-text-secondary">
          落{profile.palaceName}({profile.palaceWuxing})
        </span>
        <span className="text-xs text-qimen-text-secondary">
          {profile.star}·{profile.gate}门·{profile.deity}
        </span>
        {profile.isEmpty && (
          <span className="rounded bg-qimen-red/10 px-1.5 py-0.5 text-[10px] text-qimen-red">空亡</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-1 text-xs text-qimen-text-secondary">
        <div><span className="font-medium text-qimen-text">性格：</span>{profile.traits.personality}</div>
        <div><span className="font-medium text-qimen-text">外貌：</span>{profile.traits.appearance}</div>
        <div><span className="font-medium text-qimen-text">职业：</span>{profile.traits.career}</div>
      </div>
    </div>
  );
}

function MatchmakerCard({ info }: { info: MatchmakerInfo }) {
  const favorColor = info.favors === '中立' ? 'text-qimen-text-secondary'
    : info.favors === '双方' ? 'text-qimen-green' : 'text-qimen-gold';

  return (
    <div className="rounded-lg bg-qimen-bg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">媒人（六合）</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${favorColor} bg-current/10`}>
          偏向{info.favors}
        </span>
      </div>
      <p className="text-xs text-qimen-text-secondary">{info.description}</p>
    </div>
  );
}

function ThirdPartyCard({ tp }: { tp: ThirdParty }) {
  const hasRisk = tp.threatsWho !== null;

  return (
    <div className={`rounded-lg px-4 py-3 ${hasRisk ? 'bg-qimen-red/5 border border-qimen-red/20' : 'bg-qimen-bg'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium">{tp.label}</span>
        {tp.palace && (
          <span className="text-xs text-qimen-text-secondary">落{tp.palaceName}</span>
        )}
        {hasRisk && (
          <span className="rounded bg-qimen-red/10 px-1.5 py-0.5 text-[10px] text-qimen-red">
            威胁{tp.threatsWho}
          </span>
        )}
      </div>
      <p className="text-xs text-qimen-text-secondary">{tp.description}</p>
    </div>
  );
}

interface Props {
  chart: QimenChart;
}

export function MarriagePanel({ chart }: Props) {
  const result = useMemo(() => analyzeMarriage(chart), [chart]);

  return (
    <div className="space-y-4">
      {/* 一眼结论 */}
      <div className={`rounded-lg border px-4 py-3 ${tierStyle[result.tier].bg}`}>
        <div className="flex items-center gap-3">
          <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${tierStyle[result.tier].badge}`}>
            {result.tier}
          </span>
          <span className={`text-base font-semibold ${tierStyle[result.tier].text}`}>
            {result.headline}
          </span>
        </div>
      </div>

      {/* 核心关系 */}
      <div className="rounded-lg border border-qimen-gold/20 bg-qimen-gold/5 px-4 py-3">
        <h4 className="mb-1 text-xs font-medium text-qimen-gold">乙庚关系（核心）</h4>
        <p className="text-sm text-qimen-text-secondary">{result.compatibility}</p>
      </div>

      {/* 人物画像 */}
      <CollapsibleSection title="人物画像" defaultOpen titleClass="text-sm font-semibold text-qimen-text">
        <div className="space-y-2">
          <ProfileCard profile={result.female} />
          <ProfileCard profile={result.male} />
        </div>
      </CollapsibleSection>

      {/* 媒人 & 第三者 */}
      <CollapsibleSection title="媒人与第三者" titleClass="text-sm font-semibold text-qimen-text">
        <div className="space-y-2">
          <MatchmakerCard info={result.matchmaker} />
          {result.thirdParties.map((tp, i) => (
            <ThirdPartyCard key={i} tp={tp} />
          ))}
        </div>
      </CollapsibleSection>

      {/* 详细分析 */}
      {result.details.length > 0 && (
        <CollapsibleSection title="详细分析" titleClass="text-sm font-semibold text-qimen-text">
          <ul className="space-y-1 text-sm text-qimen-text-secondary">
            {result.details.map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
