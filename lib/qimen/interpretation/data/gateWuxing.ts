/**
 * 八门五行属性与旺相休囚死计算
 *
 * 当令五行取月令（月支），不是四季：寅卯木、巳午火、申酉金、亥子水，
 * 辰戌丑未四季月土旺。月支以「节」交接，故按节气查表即等于按月令查表。
 *
 * 旺相休囚死（当令者旺、令生者相、生令者休、克令者囚、令克者死）：
 * 旺 — 与月令五行相同
 * 相 — 月令生我
 * 休 — 我生月令
 * 囚 — 我克月令
 * 死 — 月令克我
 */

import type { GateName, JieQi } from '../../constants';

// 八门五行属性
export const GATE_WUXING: Record<Exclude<GateName, '中'>, string> = {
  '休': '水',
  '死': '土',
  '伤': '木',
  '杜': '木',
  '开': '金',
  '惊': '金',
  '生': '土',
  '景': '火',
};

// 节气 → 月令五行（每个月支含一节一气）
export const JIEQI_WUXING: Record<JieQi, string> = {
  '立春': '木', '雨水': '木', // 寅
  '惊蛰': '木', '春分': '木', // 卯
  '清明': '土', '谷雨': '土', // 辰
  '立夏': '火', '小满': '火', // 巳
  '芒种': '火', '夏至': '火', // 午
  '小暑': '土', '大暑': '土', // 未
  '立秋': '金', '处暑': '金', // 申
  '白露': '金', '秋分': '金', // 酉
  '寒露': '土', '霜降': '土', // 戌
  '立冬': '水', '小雪': '水', // 亥
  '大雪': '水', '冬至': '水', // 子
  '小寒': '土', '大寒': '土', // 丑
}

// 五行生克关系
// 生：木→火→土→金→水→木
// 克：木→土→水→火→金→木
const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

const KE: Record<string, string> = {
  '木': '土', '土': '水', '水': '火', '火': '金', '金': '木',
};

export type Vitality = '旺' | '相' | '休' | '囚' | '死';

/**
 * 计算门的旺相休囚死
 */
export function getVitality(gateWuxing: string, seasonWuxing: string): Vitality {
  if (gateWuxing === seasonWuxing) return '旺';       // 同五行 → 最旺
  if (SHENG[seasonWuxing] === gateWuxing) return '相'; // 季节生我 → 得生气
  if (SHENG[gateWuxing] === seasonWuxing) return '休'; // 我生季节 → 泄气
  if (KE[gateWuxing] === seasonWuxing) return '囚';    // 我克季节 → 耗力
  if (KE[seasonWuxing] === gateWuxing) return '死';    // 季节克我 → 受克
  return '休'; // fallback
}
