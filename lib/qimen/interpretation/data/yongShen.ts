/**
 * 用神定义 — 每个事类的用神映射
 *
 * 取用依据：张志春《神奇之门》（中国商业出版社 2011）下编各章第一节
 * 「取用判断经验」。每个角色的 description 标注了书页出处。
 *
 * 贯穿全书的主线是**日干为求测之人、时干为所测之事**，随起盘时刻变化；
 * 固定符号（戊为资本、丁为文章等）是类象，属次要参照。原先的模板以固定符号
 * 为主用神，与本门断法不合。
 *
 * 用神类型：
 * - 'gan':   在九宫中查找天盘干或地盘干匹配
 * - 'gate':  在九宫中查找八门匹配
 * - 'star':  在九宫中查找九星匹配
 * - 'deity': 在九宫中查找八神匹配
 */

import type { SanQiLiuYi, GateName, StarName } from '../../constants';

export interface YongShenRole {
  label: string;          // 角色名（如"男方"、"求财方"）
  type: 'gan' | 'gate' | 'star' | 'deity';
  target: string;         // 匹配目标（如"庚"、"生"、"天心"），动态目标时为占位符
  description: string;    // 解释为什么用这个用神
  weight: 1 | 2 | 3;     // 权重：3=主用神，2=核心辅助，1=参考
  /**
   * 动态目标来源 —— 随起盘时刻变化的用神。
   *
   * 这是本门断法的主线：日干为求测之人，时干为所测之事。固定符号（戊为资本、
   * 丁为文章等）是类象，属次要参照。参见张志春《神奇之门》下编各章第一节。
   *
   * tianYi —— 天乙，即值符落宫的地盘原星。官司类以之为被告。
   */
  targetSource?: 'dayGan' | 'hourGan' | 'zhiFu' | 'zhiShi' | 'yearGan' | 'monthGan' | 'tianYi';
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
      { label: '女方', type: 'gan', target: '乙', description: '天盘乙奇为女方（书页 160）', weight: 3, searchScope: 'tianPan' },
      { label: '男方', type: 'gan', target: '庚', description: '天盘庚为男方（书页 160）', weight: 3, searchScope: 'tianPan' },
      { label: '媒人', type: 'deity', target: '六合', description: '六合为媒人；六合落宫生乙奇宫则媒人偏向女方，生庚宫则偏向男方（书页 160）', weight: 2 },
      { label: '第三者女', type: 'gan', target: '丁', description: '丁奇为插足男女双方的第三者女人（书页 160）', weight: 1 },
      { label: '第三者男', type: 'gan', target: '丙', description: '丙奇为插足男女双方的第三者男人（书页 160）', weight: 1 },
    ],
    analysisGuide: '以天盘乙为女方、天盘庚为男方。两者落宫相生和比和、又逢吉门吉格，则恋爱可成、婚姻美满；两宫相冲相克则婚事难成，或夫妻关系不好。乙、庚落宫所临门星神及格局，分别代表双方性格、身材、长相及职业状态。六合为媒人，落宫生谁则偏向谁。（书页 160）',
  },
  '求财经商': {
    name: '求财经商',
    icon: '💰',
    roles: [
      { label: '求测之人', type: 'gan', target: '', description: '日干为求测之人（书页 201）', weight: 3, targetSource: 'dayGan' },
      { label: '财/货物', type: 'gan', target: '', description: '时干为财或货物（书页 201）', weight: 3, targetSource: 'hourGan' },
      { label: '利息', type: 'gate', target: '生', description: '生门为利息，所临之星为财星（书页 201）', weight: 2 },
      { label: '资本', type: 'gan', target: '戊', description: '甲子戊为资本（书页 201）', weight: 2 },
      { label: '店铺门面', type: 'gate', target: '开', description: '开门为店铺、门面（书页 201）', weight: 1 },
      { label: '经纪人', type: 'deity', target: '六合', description: '六合为经纪人、中介（书页 201）', weight: 1 },
    ],
    analysisGuide: '以日干为求测之人、时干为财或货物，看二者生克。生门落旺宫、又得奇得吉格则获利大，相则平，休囚死微。甲子戊与生门落空亡、反吟、墓绝，再有凶格凶神，不仅不得财，反会招惹是非。得财时间：甲子戊与生门同落内盘为距离近、速度快。（书页 201-204）',
  },
  '考试求学': {
    name: '考试求学',
    icon: '📚',
    roles: [
      { label: '考生', type: 'gan', target: '', description: '考生本人求测以日干为考生；父母代测子女则以时干为考生（书页 180）', weight: 3, targetSource: 'dayGan' },
      { label: '考试院', type: 'star', target: '天辅', description: '天辅星为考试院（书页 180）', weight: 2 },
      { label: '主考官', type: 'star', target: '', description: '值符为主考官或监考官（书页 180）', weight: 2, targetSource: 'zhiFu' },
      { label: '文章', type: 'gan', target: '丁', description: '丁奇为考生文章（书页 180）', weight: 2 },
      { label: '试卷', type: 'gate', target: '景', description: '景门为试卷（书页 180）', weight: 2 },
      { label: '录取学校', type: 'gan', target: '', description: '年干为录取学校（书页 180）', weight: 1, targetSource: 'yearGan' },
      { label: '副主考官', type: 'gate', target: '', description: '值使为副主考官或副监考官（书页 180）', weight: 1, targetSource: 'zhiShi' },
    ],
    analysisGuide: '考生落宫旺相、得三奇吉门吉格，又生天辅星、值符、年干者，能考入理想学校；落宫休囚无力又不得奇门吉格，但得天辅、值符、年干相生者，虽成绩不佳但能录取；落宫死绝入墓或空亡、又逢凶门凶格、受天辅值符年干相克者，考不上。丁奇与景门落宫状态及与天辅、值符、年干的生克，判断答题优劣与得分。（书页 180）',
  },
  '出行远行': {
    name: '出行远行',
    icon: '🚗',
    roles: [
      { label: '出行之人', type: 'gan', target: '', description: '日干落宫为出行之人（书页 228）', weight: 3, targetSource: 'dayGan' },
      { label: '所往之事', type: 'gan', target: '', description: '兼看时干，以辅助判断出行利弊吉凶（书页 228）', weight: 2, targetSource: 'hourGan' },
      { label: '道路', type: 'gate', target: '景', description: '乘车以景门所临之宫为道路（书页 228）', weight: 2 },
      { label: '车船', type: 'gate', target: '伤', description: '伤门为车；乘船则伤门为船只（书页 228）', weight: 2 },
      { label: '飞机', type: 'gate', target: '开', description: '坐飞机出行以开门为飞机（书页 228）', weight: 1 },
      { label: '航线', type: 'deity', target: '九天', description: '九天所临之宫为航线（书页 228）', weight: 1 },
    ],
    analysisGuide: '以日干落宫为出行之人，看所去方向。该方向若有吉格吉门来生日干落宫则顺利；无吉门吉格但该方向地盘宫与日干落宫比和，也为顺利。所往之方遇凶门凶格、又来冲克日干落宫，则大凶。日干或时干落空亡、墓、绝之宫也主不利。（书页 228）',
  },
  '疾病健康': {
    name: '疾病健康',
    icon: '🏥',
    roles: [
      { label: '求测之人', type: 'gan', target: '', description: '日干为求测者本人，看其与病星的生克（书页 150）', weight: 3, targetSource: 'dayGan' },
      { label: '病星', type: 'star', target: '天芮', description: '天芮星为疾病的主要代表符号（书页 150）', weight: 3 },
      { label: '医生', type: 'star', target: '天心', description: '天心星为医生（书页 151）', weight: 3 },
      { label: '医药', type: 'gan', target: '乙', description: '乙奇为医药（书页 151）', weight: 2 },
      { label: '疾病(辅)', type: 'gan', target: '', description: '也可以时干代表疾病（书页 151）', weight: 2, targetSource: 'hourGan' },
      { label: '疾病(门)', type: 'gate', target: '', description: '也可以值使门代表疾病（书页 151）', weight: 1, targetSource: 'zhiShi' },
    ],
    analysisGuide: '以天芮星为病星，兼看死、伤、惊、杜、景门，以及天芮所临三奇六仪与八神，据此判断疾病性质和部位。再结合格局吉凶、节气时令的旺相休囚、以及与求测者本人的生克，综合判断病情轻重与预后。天心星和乙奇为医生与医药，看其落宫与天芮落宫的生克，以判断治疗成败。九宫亦模拟人体：离9头部、巽4左臂、坤2右臂、震3左肋左腰、兑7右肋右腰、艮8左腿、乾6右腿、坎1泌尿生殖。（书页 150-151）',
  },
  '官讼诉讼': {
    name: '官讼诉讼',
    icon: '⚖️',
    roles: [
      { label: '原告', type: 'star', target: '', description: '值符为原告（书页 279）', weight: 3, targetSource: 'zhiFu' },
      { label: '被告', type: 'star', target: '', description: '天乙（值符落宫地盘之星）为被告。作者明确指出古籍与今人著作中以乙奇为被告「从易理上讲不通，经过实践验证也不准确」（书页 279）', weight: 3, targetSource: 'tianYi' },
      { label: '法官', type: 'gate', target: '开', description: '开门为法官（书页 279）', weight: 2 },
      { label: '诉状', type: 'gate', target: '景', description: '景门为诉状，代表起诉书（书页 279）', weight: 2 },
      { label: '证人证据', type: 'deity', target: '六合', description: '六合为证人证据（书页 279）', weight: 1 },
      { label: '律师', type: 'gate', target: '惊', description: '惊门为律师（书页 279）', weight: 1 },
      { label: '传票', type: 'gan', target: '丁', description: '丁奇为传票（书页 279）', weight: 1 },
    ],
    analysisGuide: '值符落宫旺相有气、乘吉门吉星吉格来克天乙落宫者，原告胜；天乙落宫旺相有气、乘吉门吉星吉格来克值符宫者，被告胜；二宫比和则可能合解。开门落宫既克值符宫又克天乙宫，法官铁面无私、公平审判；开门生值符则法官向原告，开门生天乙则向被告。（书页 279）',
  },
  '求职面试': {
    name: '求职面试',
    icon: '💼',
    roles: [
      { label: '求测之人', type: 'gan', target: '', description: '日干代表求测之人（书页 190）', weight: 3, targetSource: 'dayGan' },
      { label: '文职工作/单位', type: 'gate', target: '开', description: '开门代表文职工作及单位（书页 190）', weight: 3 },
      { label: '顶头上司', type: 'star', target: '', description: '值符代表顶头上司（书页 190）', weight: 2, targetSource: 'zhiFu' },
      { label: '上级领导', type: 'gan', target: '', description: '年干代表上级领导（书页 190）', weight: 1, targetSource: 'yearGan' },
      { label: '同事', type: 'gan', target: '', description: '月干代表同事（书页 190）', weight: 1, targetSource: 'monthGan' },
      { label: '武职工作/单位', type: 'gate', target: '杜', description: '杜门代表武职工作及单位（书页 190）', weight: 1 },
    ],
    analysisGuide: '日干或年命落宫旺相、得吉门吉格吉神者，自身条件好，得天时地利；再得开门或杜门相生，则求职得官顺利。若日干或年命克开门或杜门，经过努力也能得到工作或官职；若自身不得天时地利、又受开门或杜门冲克，必然得不到。开门克用神则文官降调，杜门克用神则武官降职。（书页 190）',
  },
  '失物寻找': {
    name: '失物寻找',
    icon: '🔍',
    roles: [
      { label: '失主', type: 'gan', target: '', description: '日干落宫为失主（书页 255）', weight: 3, targetSource: 'dayGan' },
      { label: '失物', type: 'gan', target: '', description: '时干落宫为丢失之钱物（书页 255）', weight: 3, targetSource: 'hourGan' },
      { label: '盗贼', type: 'deity', target: '玄武', description: '时干临玄武则可能被人偷去；玄武乘阳星为男人，乘阴星为女子（书页 255）', weight: 2 },
      { label: '盗贼(星)', type: 'star', target: '天蓬', description: '时干宫被玄武宫或天蓬宫所克，则可能被人盗走（书页 255）', weight: 1 },
    ],
    analysisGuide: '日干与时干同宫，为没有丢失、可以找到；时干落宫乘旺相之气来生日干落宫，也能找回；反吟者也主能找回。时干落空亡、墓、绝之宫则难找回。日干与时干同在内盘，钱物丢失在家中或近处；同在外盘则在外边或远处；日干在内、时干在外则失在外边；时干在内、日干在外则丢失在家中。（书页 255）',
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
