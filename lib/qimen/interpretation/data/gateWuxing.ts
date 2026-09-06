/**
 * 八门五行属性与旺相休囚死计算
 *
 * 旺相休囚死的计算规则：
 * 旺 — 门的五行与当令季节五行相同
 * 相 — 门的五行生当令季节五行
 * 休 — 当令季节五行生门的五行
 * 囚 — 门的五行克当令季节五行
 * 死 — 当令季节五行克门的五行
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

// 节气对应的当令五行（按季节划分）
export const JIEQI_WUXING: Record<JieQi, string> = {
  // 春 — 木
  '立春': '木', '雨水': '木', '惊蛰': '木', '春分': '木', '清明': '木', '谷雨': '木',
  // 夏 — 火
  '立夏': '火', '小满': '火', '芒种': '火', '夏至': '火', '小暑': '火', '大暑': '火',
  // 秋 — 金
  '立秋': '金', '处暑': '金', '白露': '金', '秋分': '金', '寒露': '金', '霜降': '金',
  // 冬 — 水
  '立冬': '水', '小雪': '水', '大雪': '水', '冬至': '水', '小寒': '水', '大寒': '水',
};

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
  if (gateWuxing === seasonWuxing) return '旺';       // 同五行
  if (SHENG[gateWuxing] === seasonWuxing) return '相'; // 门生季节
  if (SHENG[seasonWuxing] === gateWuxing) return '休'; // 季节生门
  if (KE[gateWuxing] === seasonWuxing) return '囚';    // 门克季节
  if (KE[seasonWuxing] === gateWuxing) return '死';    // 季节克门
  return '休'; // fallback
}
