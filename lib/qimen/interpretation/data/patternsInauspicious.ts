/**
 * 凶格定义 — 奇门遁甲凶险格局
 *
 * 可编辑：修改 description 或 detect 条件即可
 */

import type { QimenChart } from '../../types';
import type { PalaceIndex } from '../../constants';
import { PALACE_WUXING, STAR_ORIGINAL_PALACE, GATE_ORIGINAL_PALACE } from '../../constants';
import type { DetectablePattern } from './patternsAuspicious';

// 五行相克关系：A克B
const WU_XING_KE: Record<string, string> = {
  '金': '木', '木': '土', '土': '水', '水': '火', '火': '金',
};

// 天干五行
const GAN_WUXING: Record<string, string> = {
  '戊': '土', '己': '土', '庚': '金', '辛': '金',
  '壬': '水', '癸': '水', '丁': '火', '丙': '火', '乙': '木',
};

export const INAUSPICIOUS_PATTERNS: DetectablePattern[] = [
  {
    name: '伏吟',
    type: '凶格',
    description: '星/门归原位不动，主停滞、拖延、有始无终。百事不宜妄动',
    tags: ['伏吟', '格局'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      // 星伏吟：九星回到原始宫位
      for (const [idx, p] of Object.entries(chart.palaces)) {
        const palaceIdx = Number(idx) as PalaceIndex;
        if (STAR_ORIGINAL_PALACE[p.star] === palaceIdx) {
          results.push(palaceIdx);
        }
      }
      return results;
    },
  },
  {
    name: '反吟',
    type: '凶格',
    description: '星/门到对冲宫位，主反复不定、事与愿违。谋事多变',
    tags: ['反吟', '格局'],
    detect(chart) {
      // 对冲宫位：1↔9, 2↔8, 3↔7, 4↔6
      const CHONG: Record<number, number> = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        const palaceIdx = Number(idx) as PalaceIndex;
        const originalPalace = STAR_ORIGINAL_PALACE[p.star];
        if (originalPalace && CHONG[originalPalace] === palaceIdx) {
          results.push(palaceIdx);
        }
      }
      return results;
    },
  },
  {
    name: '入墓',
    type: '凶格',
    description: '天盘干入墓于所在宫位，主昏暗不明、被困难出',
    tags: ['入墓', '格局'],
    detect(chart) {
      // 入墓：天干的五行被所在宫位的五行所墓
      // 火墓在戌(乾6)，金墓在丑(艮8)，木墓在未(坤2)，水墓在辰(巽4)，土墓在辰(巽4)
      const MU_GONG: Record<string, PalaceIndex> = {
        '火': 6, '金': 8, '木': 2, '水': 4, '土': 4,
      };
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        const palaceIdx = Number(idx) as PalaceIndex;
        const ganWx = GAN_WUXING[p.tianPanGan];
        if (ganWx && MU_GONG[ganWx] === palaceIdx) {
          results.push(palaceIdx);
        }
      }
      return results;
    },
  },
  {
    name: '击刑',
    type: '凶格',
    description: '门所在宫位与门的原始宫位形成地支相刑，主刑伤是非',
    tags: ['击刑', '格局'],
    detect(chart) {
      // 简化的刑关系：三刑 —— 宫位间的刑
      // 震3(卯)刑自刑, 坎1(子)刑震3(卯), 巽4(辰巳)刑自身
      // 这里检测门是否到了与原宫相刑的位置
      const XING: Record<number, number[]> = {
        1: [3],     // 子刑卯
        3: [1],     // 卯刑子（互刑）
        8: [2],     // 丑刑未（艮刑坤）
        2: [8],     // 未刑丑
        9: [9],     // 午自刑
        7: [7],     // 酉自刑
      };
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        const palaceIdx = Number(idx) as PalaceIndex;
        if (palaceIdx === 5) continue;
        const originalPalace = GATE_ORIGINAL_PALACE[p.gate];
        if (originalPalace && XING[originalPalace]?.includes(palaceIdx)) {
          results.push(palaceIdx);
        }
      }
      return results;
    },
  },
  {
    name: '门迫',
    type: '凶格',
    description: '门的五行被所在宫位的五行所克，主事受迫不利',
    tags: ['门迫', '格局'],
    detect(chart) {
      const GATE_WX: Record<string, string> = {
        '休': '水', '死': '土', '伤': '木', '杜': '木',
        '开': '金', '惊': '金', '生': '土', '景': '火',
      };
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        const palaceIdx = Number(idx) as PalaceIndex;
        if (palaceIdx === 5) continue;
        const gateWx = GATE_WX[p.gate];
        const palaceWx = PALACE_WUXING[palaceIdx];
        // 宫克门 = 门迫
        if (gateWx && palaceWx && WU_XING_KE[palaceWx] === gateWx) {
          results.push(palaceIdx);
        }
      }
      return results;
    },
  },
  {
    name: '太白入荧',
    type: '凶格',
    description: '庚加丙，白虎犯火，主贼来犯，兵战不利',
    tags: ['庚', '丙', '太白入荧'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '庚' && p.diPanGan === '丙') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '荧入太白',
    type: '凶格',
    description: '丙加庚，贼人得利，门户有破，防盗防失',
    tags: ['丙', '庚', '荧入太白'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丙' && p.diPanGan === '庚') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '战格',
    type: '凶格',
    description: '庚加庚，太白同宫，主两败俱伤，大凶',
    tags: ['庚', '战格'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '庚' && p.diPanGan === '庚') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '悖格',
    type: '凶格',
    description: '癸加丁，天网张向朱雀，文书口舌，讼事不利',
    tags: ['癸', '丁', '悖格'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '癸' && p.diPanGan === '丁') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '大格',
    type: '凶格',
    description: '庚加癸，行事阻碍重重，大凶之兆',
    tags: ['庚', '癸', '大格'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '庚' && p.diPanGan === '癸') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '小格',
    type: '凶格',
    description: '壬加庚，小凶之格，病讼不吉',
    tags: ['壬', '庚', '小格'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '壬' && p.diPanGan === '庚') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '刑格',
    type: '凶格',
    description: '己加庚，主官讼刑伤，百事不利',
    tags: ['己', '庚', '刑格'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '己' && p.diPanGan === '庚') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '上格',
    type: '凶格',
    description: '庚加己，主官讼纠缠，百事阻隔',
    tags: ['庚', '己', '上格'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '庚' && p.diPanGan === '己') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '五不遇时',
    type: '凶格',
    description: '时干克日干，主此时辰诸事不宜',
    tags: ['五不遇时', '格局'],
    isChartWide: true,
    detect(chart) {
      const dayGanWx = GAN_WUXING[chart.siZhu.day.gan as string];
      const hourGanWx = GAN_WUXING[chart.siZhu.hour.gan as string];
      if (dayGanWx && hourGanWx && WU_XING_KE[hourGanWx] === dayGanWx) {
        return [1 as PalaceIndex]; // chart-wide: value ignored by interpreter
      }
      return [];
    },
  },
  {
    name: '时干入墓',
    type: '凶格',
    description: '时干落入自身墓库宫位，主此时诸事迟缓不利',
    tags: ['时干入墓', '格局'],
    detect(chart) {
      const MU_GONG: Record<string, PalaceIndex> = {
        '火': 6, '金': 8, '木': 2, '水': 4, '土': 4,
      };
      const hourGan = chart.siZhu.hour.gan;
      const hourGanWx = GAN_WUXING[hourGan as string];
      if (!hourGanWx) return [];
      const muGong = MU_GONG[hourGanWx];
      // 检查时干在地盘的位置是否就是墓库
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.diPanGan === hourGan && Number(idx) === muGong) {
          return [muGong];
        }
      }
      return [];
    },
  },
];
