/**
 * 用神定义 — 每个事类的用神映射
 *
 * 用神类型：
 * - 'gan': 在九宫中查找天盘干或地盘干匹配
 * - 'gate': 在九宫中查找八门匹配
 * - 'star': 在九宫中查找九星匹配
 */

import type { SanQiLiuYi, GateName, StarName } from '../../constants';

export interface YongShenRole {
  label: string;          // 角色名（如"男方"、"求财方"）
  type: 'gan' | 'gate' | 'star';
  target: string;         // 匹配目标（如"庚"、"生"、"天心"），动态目标时为占位符
  description: string;    // 解释为什么用这个用神
  weight: 1 | 2 | 3;     // 权重：3=主用神，2=核心辅助，1=参考
  targetSource?: 'dayGan' | 'hourGan' | 'zhiFu';  // 动态目标来源（从盘面取值）
  searchScope?: 'tianPan' | 'diPan';  // 限定搜索天盘或地盘（默认两盘都搜）
}

export interface EventTemplate {
  name: string;
  icon: string;
  roles: YongShenRole[];
  analysisGuide: string;  // 分析要点
}

export type EventTypeKey = '婚姻感情' | '求财经商' | '考试求学' | '出行远行' | '疾病健康' | '官讼诉讼' | '求职面试' | '失物寻找' | '体育竞猜';

export const EVENT_TEMPLATES: Record<EventTypeKey, EventTemplate> = {
  '婚姻感情': {
    name: '婚姻感情',
    icon: '💍',
    roles: [
      { label: '男方', type: 'gan', target: '庚', description: '庚金代表男方、丈夫', weight: 3 },
      { label: '女方', type: 'gan', target: '乙', description: '乙木代表女方、妻子', weight: 3 },
      { label: '感情', type: 'gate', target: '休', description: '休门主和合、感情', weight: 2 },
      { label: '婚姻宫', type: 'gan', target: '丙', description: '丙火代表婚姻、喜庆', weight: 1 },
    ],
    analysisGuide: '重点看男方（庚）与女方（乙）所落宫位的生克关系。乙庚合为吉，宫位相生利婚姻。值使门吉利则婚事顺利。',
  },
  '求财经商': {
    name: '求财经商',
    icon: '💰',
    roles: [
      { label: '财星', type: 'gan', target: '戊', description: '戊土代表资本、大财', weight: 2 },
      { label: '生门', type: 'gate', target: '生', description: '生门主财运、生意', weight: 3 },
      { label: '求财者', type: 'gan', target: '乙', description: '乙木代表求财之人（日干乙）', weight: 2 },
      { label: '开门', type: 'gate', target: '开', description: '开门主开业、商机', weight: 1 },
    ],
    analysisGuide: '重点看生门落宫状态。生门旺相得奇为大利求财。戊落宫与生门宫相生为吉。开门吉利则商机好。',
  },
  '考试求学': {
    name: '考试求学',
    icon: '📚',
    roles: [
      { label: '文昌', type: 'gan', target: '丁', description: '丁火为星奇，代表文书、考试', weight: 3 },
      { label: '景门', type: 'gate', target: '景', description: '景门主文书、考试', weight: 3 },
      { label: '学业星', type: 'star', target: '天辅', description: '天辅星主文教、学术', weight: 2 },
      { label: '日奇', type: 'gan', target: '乙', description: '乙木为日奇，代表本人', weight: 1 },
    ],
    analysisGuide: '重点看丁奇和景门落宫。丁奇得地、景门旺相则考试顺利。天辅星吉利代表学业有成。',
  },
  '出行远行': {
    name: '出行远行',
    icon: '🚗',
    roles: [
      { label: '出行门', type: 'gate', target: '开', description: '开门主出行、远行', weight: 3 },
      { label: '道路', type: 'gate', target: '伤', description: '伤门主车船、道路', weight: 2 },
      { label: '月奇', type: 'gan', target: '丙', description: '丙火为月奇，利出行', weight: 2 },
      { label: '马星', type: 'gate', target: '休', description: '休门得奇利远行', weight: 1 },
    ],
    analysisGuide: '重点看开门落宫。开门得奇（乙丙丁）利出行。伤门所在宫位凶则路上有险。忌空亡、忌庚格。',
  },
  '疾病健康': {
    name: '疾病健康',
    icon: '🏥',
    roles: [
      { label: '病星', type: 'star', target: '天芮', description: '天芮星代表疾病', weight: 3 },
      { label: '死门', type: 'gate', target: '死', description: '死门主死亡、重病', weight: 2 },
      { label: '天心', type: 'star', target: '天心', description: '天心星代表医药、医生', weight: 3 },
      { label: '生门', type: 'gate', target: '生', description: '生门主生机、康复', weight: 2 },
    ],
    analysisGuide: '天芮落宫看病情轻重。天心落宫看医药是否有效。生门旺相则有生机。死门临病宫则凶险。',
  },
  '官讼诉讼': {
    name: '官讼诉讼',
    icon: '⚖️',
    roles: [
      { label: '官方', type: 'gan', target: '庚', description: '庚金代表官方、对手', weight: 3 },
      { label: '开门', type: 'gate', target: '开', description: '开门代表官府、法院', weight: 2 },
      { label: '惊门', type: 'gate', target: '惊', description: '惊门主口舌、诉讼', weight: 3 },
      { label: '值使', type: 'gan', target: '丁', description: '丁火代表文书、证据', weight: 1 },
    ],
    analysisGuide: '惊门落宫看官司走势。开门旺相利我方。庚金被制则对方弱。丁奇得地则文书证据有利。',
  },
  '求职面试': {
    name: '求职面试',
    icon: '💼',
    roles: [
      { label: '求职者', type: 'gan', target: '乙', description: '乙木代表自己', weight: 3 },
      { label: '机遇', type: 'gate', target: '开', description: '开门代表机遇、新工作', weight: 3 },
      { label: '上司', type: 'gan', target: '戊', description: '戊土代表上司、领导', weight: 2 },
      { label: '贵人', type: 'gate', target: '休', description: '休门代表贵人提携', weight: 1 },
    ],
    analysisGuide: '开门落宫旺相则机遇好。乙木与戊土宫位关系看与上司缘分。休门得奇有贵人帮助。',
  },
  '失物寻找': {
    name: '失物寻找',
    icon: '🔍',
    roles: [
      { label: '失物', type: 'gan', target: '戊', description: '戊土代表失物', weight: 3 },
      { label: '杜门', type: 'gate', target: '杜', description: '杜门主隐藏、丢失', weight: 2 },
      { label: '天禽', type: 'star', target: '天禽', description: '天禽星主中央、丢失物', weight: 2 },
      { label: '景门', type: 'gate', target: '景', description: '景门主信息、线索', weight: 1 },
    ],
    analysisGuide: '戊落宫看失物所在方位。杜门所在宫位看藏匿处。戊落空亡则难寻。戊与值使门生合则可找回。',
  },
  '体育竞猜': {
    name: '体育竞猜',
    icon: '⚽',
    roles: [
      { label: '主队', type: 'gan', target: '', description: '地盘时干代表主队', weight: 3, targetSource: 'hourGan', searchScope: 'diPan' },
      { label: '客队', type: 'gan', target: '', description: '天盘时干代表客队', weight: 3, targetSource: 'hourGan', searchScope: 'tianPan' },
      { label: '裁判', type: 'star', target: '', description: '值符代表裁判', weight: 1, targetSource: 'zhiFu' },
      { label: '器械', type: 'gan', target: '庚', description: '庚金代表比赛器械', weight: 1 },
      { label: '金牌', type: 'gan', target: '辛', description: '辛金代表金牌、荣誉', weight: 2 },
      { label: '技术', type: 'gate', target: '景', description: '景门代表技术指导', weight: 1 },
    ],
    analysisGuide: '主队（地盘时干）与客队（天盘时干）落宫比较，宫旺者胜。看宫位五行旺衰（月令生克）判断时令对谁有利。辛（金牌）地盘与天盘落宫比较，地盘辛宫克天盘辛宫则主队夺冠。值符（裁判）与哪方同宫则判罚倾向哪方。景门看教练指导。',
  },
};

export const EVENT_TYPE_KEYS: EventTypeKey[] = [
  '婚姻感情', '求财经商', '考试求学', '出行远行',
  '疾病健康', '官讼诉讼', '求职面试', '失物寻找',
  '体育竞猜',
];
