/**
 * 研究线数据 Schema
 *
 * 设计原则（参照预注册临床试验）：
 * - 标签定义在看数据之前锁死
 * - 每个事类有明确的二值化结果定义
 * - 记录完整盘面快照 + 提取的结构化特征
 * - 支持消融实验：M0(base rate) / M1(question-only) / M2(question+chart) / M3(question+random chart)
 */

import type { EventTypeKey } from '../interpretation/data/yongShen';
import type { PalaceIndex } from '../constants';

// ─── 结果标签定义（预锁定，不可事后调整） ─────────────────────────────────────

export interface OutcomeDefinition {
  eventType: EventTypeKey;
  positiveLabel: string;   // 正例定义
  negativeLabel: string;   // 负例定义
  timeHorizon: string;     // 判定时间窗口
  notes: string;           // 标签边界说明
}

/**
 * 预注册结果定义 — 每个事类的二值化标准
 * 一旦开始收集数据，这些定义不可修改
 */
export const OUTCOME_DEFINITIONS: Record<EventTypeKey, OutcomeDefinition> = {
  '婚姻感情': {
    eventType: '婚姻感情',
    positiveLabel: '感情进展顺利（确立/维持/复合）',
    negativeLabel: '感情受阻或破裂（分手/冷淡/拒绝）',
    timeHorizon: '起盘后3个月内',
    notes: '模糊状态（无明显变化）标记为 null，不纳入分析',
  },
  '求财经商': {
    eventType: '求财经商',
    positiveLabel: '财务目标达成（盈利/签约/到账）',
    negativeLabel: '财务目标未达成（亏损/流产/未到账）',
    timeHorizon: '起盘后1个月内',
    notes: '部分达成按主观满意度判定，需记录具体金额比例',
  },
  '考试求学': {
    eventType: '考试求学',
    positiveLabel: '通过/录取/达到目标分数',
    negativeLabel: '未通过/未录取/低于目标分数',
    timeHorizon: '出成绩时',
    notes: '有明确分数线的用客观标准，无分数线的用主观满意度',
  },
  '出行远行': {
    eventType: '出行远行',
    positiveLabel: '顺利完成出行',
    negativeLabel: '出行受阻（取消/延误>4h/事故/目的未达）',
    timeHorizon: '出行结束时',
    notes: '小延误（<1h）不算负例',
  },
  '疾病健康': {
    eventType: '疾病健康',
    positiveLabel: '病情好转或稳定',
    negativeLabel: '病情加重或恶化',
    timeHorizon: '起盘后1个月内',
    notes: '慢性病以趋势判定，急性病以是否痊愈判定',
  },
  '官讼诉讼': {
    eventType: '官讼诉讼',
    positiveLabel: '我方胜诉或达成有利和解',
    negativeLabel: '我方败诉或被迫接受不利条件',
    timeHorizon: '案件终结时',
    notes: '调解视结果是否满意判定',
  },
  '求职面试': {
    eventType: '求职面试',
    positiveLabel: '获得offer或录用',
    negativeLabel: '未获得offer',
    timeHorizon: '面试流程结束时（最多起盘后2个月）',
    notes: '获得offer但自己放弃的算正例（预测的是能否获得）',
  },
  '失物寻找': {
    eventType: '失物寻找',
    positiveLabel: '找到失物',
    negativeLabel: '未找到失物',
    timeHorizon: '起盘后1个月内',
    notes: '找到但已损坏算正例',
  },
  '体育竞猜': {
    eventType: '体育竞猜',
    positiveLabel: '主队胜（含加时）',
    negativeLabel: '客队胜或平局',
    timeHorizon: '比赛结束时',
    notes: '平局归入负例。如需三分类（主胜/平/客胜），另建模型',
  },
};

// ─── 事件登记记录 ────────────────────────────────────────────────────────────

export interface EventRecord {
  id: string;                        // UUID
  createdAt: string;                 // ISO 8601
  version: 1;                        // schema 版本，便于未来迁移

  // 问题信息
  eventType: EventTypeKey;
  questionText: string;              // 用户原始问题文本
  questionMeta?: Record<string, string>; // 可选的结构化元信息

  // 盘面快照（完整序列化）
  chartSnapshot: ChartSnapshot;

  // 提取的结构化特征（喂 ML 用）
  features: ChartFeatures;

  // 系统输出
  systemPrediction: SystemPrediction;

  // 结果回访
  outcome: OutcomeRecord | null;     // null = 尚未回访
}

// ─── 盘面快照 ────────────────────────────────────────────────────────────────

export interface ChartSnapshot {
  // 基础
  jieQi: string;
  yuan: string;
  dunType: string;
  juNumber: number;
  zhiFu: string;
  zhiShi: string;
  xunShou: string;
  kongWang: string[];

  // 四柱
  siZhu: {
    year: string;   // "甲子"
    month: string;
    day: string;
    hour: string;
  };

  // 九宫（扁平化）
  palaces: PalaceSnapshot[];
}

export interface PalaceSnapshot {
  index: PalaceIndex;
  diPanGan: string;
  tianPanGan: string;
  star: string;
  gate: string;
  deity: string;
  isEmpty: boolean;
}

// ─── 结构化特征（ML 特征向量） ───────────────────────────────────────────────

export interface ChartFeatures {
  // 全局特征
  dunType: 0 | 1;          // 阳遁=1, 阴遁=0
  juNumber: number;         // 1-9
  jieQiIndex: number;       // 节气编号 0-23
  zhiFuIndex: number;       // 值符九星编号 0-8
  zhiShiIndex: number;      // 值使八门编号 0-7
  kongWangCount: number;    // 空亡宫数

  // 每宫特征 (9宫 × 6特征 = 54维)
  palaceFeatures: PalaceFeatureRow[];

  // 用神特征（事类相关）
  yongShenScores: number[];        // 各用神的 fortuneScore
  yongShenPalaces: (number | -1)[];  // 各用神落宫 (-1=未定位)
  yongShenRelationScores: number[]; // 用神间关系得分 (1=吉, 0=平, -1=凶)
  weightedScore: number;            // 加权总分
  coherence: number;                // 信号一致性 (0=弱, 1=中, 2=强)

  // 格局特征
  auspiciousPatternCount: number;
  inauspiciousPatternCount: number;
}

export interface PalaceFeatureRow {
  index: PalaceIndex;
  diPanGanIndex: number;     // 三奇六仪编号 0-9
  tianPanGanIndex: number;
  starIndex: number;         // 九星编号 0-8
  gateIndex: number;         // 八门编号 0-7
  deityIndex: number;        // 八神编号 0-7
  isEmpty: 0 | 1;
}

// ─── 系统预测输出 ─────────────────────────────────────────────────────────────

export interface SystemPrediction {
  tier: string;              // 大吉/小吉/平/小凶/大凶
  coherence: string;         // 强/中/弱
  conclusion: string;        // 系统生成的结论文本
}

// ─── 结果回访 ─────────────────────────────────────────────────────────────────

export interface OutcomeRecord {
  recordedAt: string;        // ISO 8601
  outcome: true | false | null;  // true=正例, false=负例, null=模糊/无法判定
  confidence: 1 | 2 | 3;    // 对标签的确信度：1=不确定, 2=较确定, 3=非常确定
  actualResult: string;      // 实际结果的自由文本描述
  notes?: string;            // 补充说明
}
