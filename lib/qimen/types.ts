import type {
  PalaceIndex,
  PalaceName,
  GateName,
  StarName,
  DeityName,
  TianGan,
  DiZhi,
  SanQiLiuYi,
  JieQi,
} from './constants';

// ─── 排盘输入 ────────────────────────────────────────────────────────────────

export interface ChartInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  isLunar?: boolean; // 是否农历输入，默认公历
  method?: '拆补法' | '置闰法'; // 定局方法，默认拆补法
}

// ─── 四柱 ────────────────────────────────────────────────────────────────────

export interface SiZhu {
  year: { gan: TianGan; zhi: DiZhi };
  month: { gan: TianGan; zhi: DiZhi };
  day: { gan: TianGan; zhi: DiZhi };
  hour: { gan: TianGan; zhi: DiZhi };
}

// ─── 单宫信息 ────────────────────────────────────────────────────────────────

export interface Palace {
  index: PalaceIndex;            // 宫位编号（洛书数）
  name: PalaceName;              // 宫名（坎坤震巽中乾兑艮离）
  diPanGan: SanQiLiuYi;          // 地盘干（三奇六仪）
  tianPanGan: SanQiLiuYi;        // 天盘干（三奇六仪）
  star: StarName;                // 天盘九星
  gate: Exclude<GateName, '中'>; // 人盘八门
  deity: DeityName;              // 神盘八神
  anGan?: TianGan;               // 暗干
  isEmpty: boolean;              // 是否空亡
}

// ─── 完整盘面 ────────────────────────────────────────────────────────────────

export interface QimenChart {
  // 输入信息
  input: ChartInput;

  // 基础信息
  siZhu: SiZhu;                  // 四柱
  jieQi: JieQi;                  // 当前节气
  yuan: '上元' | '中元' | '下元'; // 三元
  dunType: '阳遁' | '阴遁';      // 阴阳遁
  juNumber: number;              // 局数（1-9）

  // 值符值使
  zhiFu: StarName;               // 值符（当值九星）
  zhiShi: Exclude<GateName, '中'>; // 值使（当值八门）

  // 九宫盘面
  palaces: Record<PalaceIndex, Palace>;

  // 旬首与空亡
  xunShou: string;               // 旬首（如"甲子"）
  kongWang: DiZhi[];              // 空亡地支

  // 马星
  maStar?: PalaceIndex;          // 马星所在宫位
}

// ─── 格局判断结果 ────────────────────────────────────────────────────────────

export interface Pattern {
  name: string;                  // 格局名称（如"龙遁"）
  type: '吉格' | '凶格';         // 吉凶分类
  palace?: PalaceIndex;          // 出现在哪个宫位（全盘性格局为 undefined）
  description: string;           // 格局说明
  tags: string[];                // 关联标签（用于古籍联动）
}

// ─── 十干克应 ────────────────────────────────────────────────────────────────

export interface GanInteraction {
  tianGan: SanQiLiuYi;           // 天盘干
  diGan: SanQiLiuYi;             // 地盘干
  name: string;                  // 克应名称
  meaning: string;               // 含义
  fortune: '吉' | '凶' | '平';   // 吉凶
}
