// ─── 天干 (Heavenly Stems) ───────────────────────────────────────────────────

export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export type TianGan = (typeof TIAN_GAN)[number];

// ─── 地支 (Earthly Branches) ─────────────────────────────────────────────────

export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export type DiZhi = (typeof DI_ZHI)[number];

// ─── 九宫 (Nine Palaces) ─────────────────────────────────────────────────────
// 洛书数字编号：坎一、坤二、震三、巽四、中五、乾六、兑七、艮八、离九

export const PALACE_NAMES = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'] as const;
export type PalaceName = (typeof PALACE_NAMES)[number];

// 宫位编号 1-9（洛书数）
export type PalaceIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 洛书顺序（阳遁排布顺序）：1→2→3→4→5→6→7→8→9
export const LUOSHU_ORDER: PalaceIndex[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// 洛书逆序（阴遁排布顺序）：9→8→7→6→5→4→3→2→1
export const LUOSHU_REVERSE: PalaceIndex[] = [9, 8, 7, 6, 5, 4, 3, 2, 1];

// 九宫对应五行
export const PALACE_WUXING: Record<PalaceIndex, string> = {
  1: '水', // 坎
  2: '土', // 坤
  3: '木', // 震
  4: '木', // 巽
  5: '土', // 中
  6: '金', // 乾
  7: '金', // 兑
  8: '土', // 艮
  9: '火', // 离
};

// 九宫格布局（用于UI渲染，行列位置）
// 巽四 | 离九 | 坤二
// 震三 | 中五 | 兑七
// 艮八 | 坎一 | 乾六
export const PALACE_GRID: PalaceIndex[][] = [
  [4, 9, 2],
  [3, 5, 7],
  [8, 1, 6],
];

// ─── 八门 (Eight Gates) ──────────────────────────────────────────────────────

export const GATE_NAMES = ['休', '死', '伤', '杜', '中', '开', '惊', '生', '景'] as const;
export type GateName = (typeof GATE_NAMES)[number];

// 八门原始宫位（值使门的本宫）
export const GATE_ORIGINAL_PALACE: Record<Exclude<GateName, '中'>, PalaceIndex> = {
  '休': 1, // 坎一宫
  '死': 2, // 坤二宫
  '伤': 3, // 震三宫
  '杜': 4, // 巽四宫
  '开': 6, // 乾六宫
  '惊': 7, // 兑七宫
  '生': 8, // 艮八宫
  '景': 9, // 离九宫
};

// 八门吉凶
export const GATE_FORTUNE: Record<Exclude<GateName, '中'>, '吉' | '凶' | '平'> = {
  '开': '吉',
  '休': '吉',
  '生': '吉',
  '伤': '凶',
  '杜': '凶',
  '景': '平', // 景门中平，得奇则吉
  '死': '凶',
  '惊': '凶',
};

// ─── 九星 (Nine Stars) ──────────────────────────────────────────────────────

export const STAR_NAMES = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'] as const;
export type StarName = (typeof STAR_NAMES)[number];

// 九星原始宫位
export const STAR_ORIGINAL_PALACE: Record<StarName, PalaceIndex> = {
  '天蓬': 1, // 坎一宫
  '天芮': 2, // 坤二宫
  '天冲': 3, // 震三宫
  '天辅': 4, // 巽四宫
  '天禽': 5, // 中五宫
  '天心': 6, // 乾六宫
  '天柱': 7, // 兑七宫
  '天任': 8, // 艮八宫
  '天英': 9, // 离九宫
};

// 九星吉凶
export const STAR_FORTUNE: Record<StarName, '大吉' | '吉' | '凶' | '大凶'> = {
  '天心': '大吉',
  '天任': '大吉',
  '天辅': '吉',
  '天冲': '吉',
  '天禽': '吉',
  '天蓬': '大凶',
  '天芮': '大凶',
  '天柱': '凶',
  '天英': '凶',
};

// ─── 八神 (Eight Deities) ────────────────────────────────────────────────────

export const DEITY_NAMES_YANG = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'] as const;
export const DEITY_NAMES_YIN = ['值符', '螣蛇', '太阴', '六合', '勾陈', '朱雀', '九地', '九天'] as const;
export type DeityName = (typeof DEITY_NAMES_YANG)[number] | '勾陈' | '朱雀';

// ─── 三奇六仪 (Three Wonders & Six Instruments) ─────────────────────────────

// 固定排列顺序，永不改变
export const SAN_QI_LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'] as const;
export type SanQiLiuYi = (typeof SAN_QI_LIU_YI)[number];

// 甲隐于六仪之下（甲子戊、甲戌己、甲申庚、甲午辛、甲辰壬、甲寅癸）
export const JIA_HIDDEN: Record<string, TianGan> = {
  '甲子': '戊',
  '甲戌': '己',
  '甲申': '庚',
  '甲午': '辛',
  '甲辰': '壬',
  '甲寅': '癸',
};

// 六甲旬首对应六仪
export const XUN_SHOU = [
  { ganZhi: '甲子', yiName: '戊', kongWang: ['戌', '亥'] as DiZhi[] },
  { ganZhi: '甲戌', yiName: '己', kongWang: ['申', '酉'] as DiZhi[] },
  { ganZhi: '甲申', yiName: '庚', kongWang: ['午', '未'] as DiZhi[] },
  { ganZhi: '甲午', yiName: '辛', kongWang: ['辰', '巳'] as DiZhi[] },
  { ganZhi: '甲辰', yiName: '壬', kongWang: ['寅', '卯'] as DiZhi[] },
  { ganZhi: '甲寅', yiName: '癸', kongWang: ['子', '丑'] as DiZhi[] },
] as const;

// ─── 二十四节气 ──────────────────────────────────────────────────────────────

export const JIE_QI = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
] as const;
export type JieQi = (typeof JIE_QI)[number];

// 节气对应的局数（上元、中元、下元）
// 每个节气有三个局数 [上元, 中元, 下元]
// 冬至后阳遁，夏至后阴遁
export const YANG_DUN_JU: Record<string, [number, number, number]> = {
  '冬至': [1, 7, 4],
  '小寒': [2, 8, 5],
  '大寒': [3, 9, 6],
  '立春': [8, 5, 2],
  '雨水': [9, 6, 3],
  '惊蛰': [1, 7, 4],
  '春分': [3, 9, 6],
  '清明': [4, 1, 7],
  '谷雨': [5, 2, 8],
  '立夏': [4, 1, 7],
  '小满': [5, 2, 8],
  '芒种': [6, 3, 9],
};

export const YIN_DUN_JU: Record<string, [number, number, number]> = {
  '夏至': [9, 3, 6],
  '小暑': [8, 2, 5],
  '大暑': [7, 1, 4],
  '立秋': [2, 5, 8],
  '处暑': [1, 4, 7],
  '白露': [9, 3, 6],
  '秋分': [7, 1, 4],
  '寒露': [6, 9, 3],
  '霜降': [5, 8, 2],
  '立冬': [6, 9, 3],
  '小雪': [5, 8, 2],
  '大雪': [4, 7, 1],
};

// ─── 转盘顺序 ────────────────────────────────────────────────────────────────
// 转盘中，宫位按顺时针旋转的顺序（跳过中五宫）
// 1(坎北) → 8(艮东北) → 3(震东) → 4(巽东南) → 9(离南) → 2(坤西南) → 7(兑西) → 6(乾西北)
export const ROTATE_ORDER: PalaceIndex[] = [1, 8, 3, 4, 9, 2, 7, 6];
