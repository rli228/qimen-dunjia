/**
 * 吉格定义 — 奇门遁甲吉利格局
 *
 * 每个格局包含 detect 函数，接收 QimenChart 返回匹配的宫位
 * 可编辑：修改 description 或 detect 条件即可
 */

import type { QimenChart } from '../../types';
import type { PalaceIndex } from '../../constants';

export interface DetectablePattern {
  name: string;
  type: '吉格' | '凶格';
  description: string;
  tags: string[];
  isChartWide?: boolean;
  detect(chart: QimenChart): PalaceIndex[];
}

export const AUSPICIOUS_PATTERNS: DetectablePattern[] = [
  {
    name: '天遁',
    type: '吉格',
    description: '丙奇（月奇）加生门，天门大开，百事吉利，利出行求财',
    tags: ['丙', '生门', '天遁', '求财', '出行'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丙' && p.gate === '生') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '地遁',
    type: '吉格',
    description: '乙奇（日奇）加开门，地户洞开，利隐藏遁形、出行',
    tags: ['乙', '开门', '地遁', '出行'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '乙' && p.gate === '开') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '人遁',
    type: '吉格',
    description: '丁奇（星奇）加休门，主贵人相助，利谒见求人',
    tags: ['丁', '休门', '人遁', '事业'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丁' && p.gate === '休') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '神遁',
    type: '吉格',
    description: '丙奇加九天加生门，神助天门，大吉',
    tags: ['丙', '九天', '生门', '神遁'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丙' && p.deity === '九天' && p.gate === '生') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '鬼遁',
    type: '吉格',
    description: '丁奇加九地加杜门，利隐匿谋划，暗中行事',
    tags: ['丁', '九地', '杜门', '鬼遁'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丁' && p.deity === '九地' && p.gate === '杜') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '龙遁',
    type: '吉格',
    description: '乙奇加开门加九天，龙飞天门，大利出行远行',
    tags: ['乙', '开门', '九天', '龙遁', '出行'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '乙' && p.gate === '开' && p.deity === '九天') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '虎遁',
    type: '吉格',
    description: '丙奇加休门加九地，猛虎伏地，利求财经营',
    tags: ['丙', '休门', '九地', '虎遁', '求财'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丙' && p.gate === '休' && p.deity === '九地') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '风遁',
    type: '吉格',
    description: '乙奇加开门加太阴，利谋略用计，出行平安',
    tags: ['乙', '开门', '太阴', '风遁'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '乙' && p.gate === '开' && p.deity === '太阴') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '云遁',
    type: '吉格',
    description: '丙奇加生门加六合，利求财交易，合作顺利',
    tags: ['丙', '生门', '六合', '云遁', '求财'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丙' && p.gate === '生' && p.deity === '六合') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '三奇得使',
    type: '吉格',
    description: '三奇（乙丙丁）临三吉门（开休生），万事大吉',
    tags: ['三奇', '开门', '休门', '生门', '三奇得使'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      const sanQi = ['乙', '丙', '丁'];
      const jiMen = ['开', '休', '生'];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (sanQi.includes(p.tianPanGan) && jiMen.includes(p.gate)) {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '玉女守门',
    type: '吉格',
    description: '丁奇加太阴加生门或开门，利阴谋密事',
    tags: ['丁', '太阴', '生门', '开门', '玉女守门'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (
          p.tianPanGan === '丁' &&
          p.deity === '太阴' &&
          (p.gate === '生' || p.gate === '开')
        ) {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '青龙返首',
    type: '吉格',
    description: '戊加己，天门生地户，百事吉利',
    tags: ['戊', '己', '青龙返首'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '戊' && p.diPanGan === '己') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
  {
    name: '飞鸟跌穴',
    type: '吉格',
    description: '丙加戊，月奇得使，百事亨通',
    tags: ['丙', '戊', '飞鸟跌穴'],
    detect(chart) {
      const results: PalaceIndex[] = [];
      for (const [idx, p] of Object.entries(chart.palaces)) {
        if (p.tianPanGan === '丙' && p.diPanGan === '戊') {
          results.push(Number(idx) as PalaceIndex);
        }
      }
      return results;
    },
  },
];
