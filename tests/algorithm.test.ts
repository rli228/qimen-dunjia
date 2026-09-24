import { describe, it, expect } from 'vitest';
import {
  layoutDiPan,
  layoutShenPan,
  generateChart,
} from '../lib/qimen/algorithm';
import {
  getJieQiInfo,
  getSiZhu,
  getDunType,
  getXunShouInfo,
} from '../lib/qimen/calendar';
import { SAN_QI_LIU_YI, ROTATE_ORDER, STAR_NAMES, STAR_ORIGINAL_PALACE } from '../lib/qimen/constants';
import { analyzeYongShen } from '../lib/qimen/interpretation/yongShenAnalysis';
import { EVENT_TYPE_KEYS } from '../lib/qimen/interpretation/data/yongShen';

// ─── 地盘排布测试 ────────────────────────────────────────────────────────────

describe('layoutDiPan', () => {
  it('阳遁一局：戊从坎一宫开始，按洛书顺序排布', () => {
    const diPan = layoutDiPan(1, '阳遁');
    // 阳遁洛书顺序: 1→2→3→4→5→6→7→8→9
    // 三奇六仪: 戊己庚辛壬癸丁丙乙
    expect(diPan[1]).toBe('戊'); // 坎
    expect(diPan[2]).toBe('己'); // 坤
    expect(diPan[3]).toBe('庚'); // 震
    expect(diPan[4]).toBe('辛'); // 巽
    expect(diPan[5]).toBe('壬'); // 中
    expect(diPan[6]).toBe('癸'); // 乾
    expect(diPan[7]).toBe('丁'); // 兑
    expect(diPan[8]).toBe('丙'); // 艮
    expect(diPan[9]).toBe('乙'); // 离
  });

  it('阳遁三局：戊从震三宫开始', () => {
    const diPan = layoutDiPan(3, '阳遁');
    expect(diPan[3]).toBe('戊'); // 震
    expect(diPan[4]).toBe('己'); // 巽
    expect(diPan[5]).toBe('庚'); // 中
    expect(diPan[6]).toBe('辛'); // 乾
    expect(diPan[7]).toBe('壬'); // 兑
    expect(diPan[8]).toBe('癸'); // 艮
    expect(diPan[9]).toBe('丁'); // 离
    expect(diPan[1]).toBe('丙'); // 坎
    expect(diPan[2]).toBe('乙'); // 坤
  });

  it('阴遁九局：戊从离九宫开始，按洛书逆序排布', () => {
    const diPan = layoutDiPan(9, '阴遁');
    // 阴遁洛书逆序: 9→8→7→6→5→4→3→2→1
    expect(diPan[9]).toBe('戊'); // 离
    expect(diPan[8]).toBe('己'); // 艮
    expect(diPan[7]).toBe('庚'); // 兑
    expect(diPan[6]).toBe('辛'); // 乾
    expect(diPan[5]).toBe('壬'); // 中
    expect(diPan[4]).toBe('癸'); // 巽
    expect(diPan[3]).toBe('丁'); // 震
    expect(diPan[2]).toBe('丙'); // 坤
    expect(diPan[1]).toBe('乙'); // 坎
  });

  it('阴遁一局：戊从坎一宫开始，按洛书逆序排布', () => {
    const diPan = layoutDiPan(1, '阴遁');
    // 阴遁逆序: 9→8→7→6→5→4→3→2→1, 戊起于1
    // 1在逆序中的位置是最后, 所以戊在坎一, 然后逆序继续: 己→离九, 庚→艮八...
    expect(diPan[1]).toBe('戊');
    expect(diPan[9]).toBe('己');
    expect(diPan[8]).toBe('庚');
    expect(diPan[7]).toBe('辛');
    expect(diPan[6]).toBe('壬');
    expect(diPan[5]).toBe('癸');
    expect(diPan[4]).toBe('丁');
    expect(diPan[3]).toBe('丙');
    expect(diPan[2]).toBe('乙');
  });

  it('地盘始终包含全部九个三奇六仪', () => {
    for (let ju = 1; ju <= 9; ju++) {
      const diPanYang = layoutDiPan(ju, '阳遁');
      const diPanYin = layoutDiPan(ju, '阴遁');

      const yangValues = Object.values(diPanYang).sort();
      const yinValues = Object.values(diPanYin).sort();
      const expected = [...SAN_QI_LIU_YI].sort();

      expect(yangValues).toEqual(expected);
      expect(yinValues).toEqual(expected);
    }
  });
});

// ─── 神盘排布测试 ────────────────────────────────────────────────────────────

describe('layoutShenPan', () => {
  it('阳遁：八神从值符落宫顺排', () => {
    const shenPan = layoutShenPan(1, '阳遁');
    // 从坎一宫开始，顺时针: 1→8→3→4→9→2→7→6
    expect(shenPan[1]).toBe('值符');
    expect(shenPan[8]).toBe('螣蛇');
    expect(shenPan[3]).toBe('太阴');
    expect(shenPan[4]).toBe('六合');
    expect(shenPan[9]).toBe('白虎');
    expect(shenPan[2]).toBe('玄武');
    expect(shenPan[7]).toBe('九地');
    expect(shenPan[6]).toBe('九天');
  });

  it('阴遁：八神从值符落宫逆排', () => {
    const shenPan = layoutShenPan(1, '阴遁');
    // 从坎一宫开始，逆时针: 1→6→7→2→9→4→3→8
    expect(shenPan[1]).toBe('值符');
    expect(shenPan[6]).toBe('螣蛇');
    expect(shenPan[7]).toBe('太阴');
    expect(shenPan[2]).toBe('六合');
    expect(shenPan[9]).toBe('勾陈');
    expect(shenPan[4]).toBe('朱雀');
    expect(shenPan[3]).toBe('九地');
    expect(shenPan[8]).toBe('九天');
  });

  it('八神覆盖全部八宫（不含中五宫）', () => {
    const shenPan = layoutShenPan(3, '阳遁');
    const coveredPalaces = Object.keys(shenPan).map(Number).sort((a, b) => a - b);
    expect(coveredPalaces).toEqual(ROTATE_ORDER.slice().sort((a, b) => a - b));
    expect(coveredPalaces).not.toContain(5);
  });
});

// ─── 历法测试 ────────────────────────────────────────────────────────────────

describe('calendar', () => {
  it('getSiZhu 正确计算四柱', () => {
    const siZhu = getSiZhu({ year: 2024, month: 1, day: 1, hour: 12, minute: 0 });
    expect(siZhu.year.gan).toBeDefined();
    expect(siZhu.year.zhi).toBeDefined();
    expect(siZhu.hour.gan).toBeDefined();
    expect(siZhu.hour.zhi).toBeDefined();
  });

  it('getDunType 冬至后为阳遁', () => {
    expect(getDunType('冬至')).toBe('阳遁');
    expect(getDunType('立春')).toBe('阳遁');
    expect(getDunType('芒种')).toBe('阳遁');
  });

  it('getDunType 夏至后为阴遁', () => {
    expect(getDunType('夏至')).toBe('阴遁');
    expect(getDunType('立秋')).toBe('阴遁');
    expect(getDunType('大雪')).toBe('阴遁');
  });

  it('getXunShouInfo 甲子旬空亡为戌亥', () => {
    const info = getXunShouInfo('甲', '子');
    expect(info.xunShou).toBe('甲子');
    expect(info.kongWang).toEqual(['戌', '亥']);
  });

  it('getXunShouInfo 丙寅在甲子旬', () => {
    const info = getXunShouInfo('丙', '寅');
    expect(info.xunShou).toBe('甲子');
    expect(info.kongWang).toEqual(['戌', '亥']);
  });

  it('getXunShouInfo 甲戌旬空亡为申酉', () => {
    const info = getXunShouInfo('甲', '戌');
    expect(info.xunShou).toBe('甲戌');
    expect(info.kongWang).toEqual(['申', '酉']);
  });
});

// ─── 完整排盘冒烟测试 ────────────────────────────────────────────────────────

describe('generateChart', () => {
  it('生成完整盘面，所有宫位有值', () => {
    const chart = generateChart({
      year: 2024, month: 3, day: 15, hour: 10, minute: 0,
    });

    // 基础信息
    expect(chart.dunType).toMatch(/^(阳遁|阴遁)$/);
    expect(chart.juNumber).toBeGreaterThanOrEqual(1);
    expect(chart.juNumber).toBeLessThanOrEqual(9);
    expect(chart.yuan).toMatch(/^(上元|中元|下元)$/);
    expect(chart.zhiFu).toBeDefined();
    expect(chart.zhiShi).toBeDefined();

    // 九宫完整性
    for (let i = 1; i <= 9; i++) {
      const palace = chart.palaces[i as 1];
      expect(palace).toBeDefined();
      expect(palace.diPanGan).toBeDefined();
      expect(palace.tianPanGan).toBeDefined();
      expect(palace.star).toBeDefined();
    }
  });

  it('不同时间生成不同盘面', () => {
    const chart1 = generateChart({
      year: 2024, month: 6, day: 1, hour: 8, minute: 0,
    });
    const chart2 = generateChart({
      year: 2024, month: 12, day: 1, hour: 8, minute: 0,
    });

    // 夏季和冬季应该阴阳遁不同
    expect(chart1.dunType !== chart2.dunType || chart1.juNumber !== chart2.juNumber).toBe(true);
  });
});

// ─── 拆补法符头定局（依据张志春《神奇之门》）────────────────────────────────

describe('拆补法符头定局', () => {
  // 符头是甲日或己日（5 天一轮），不是旬首（只有甲日，10 天一轮）。
  // 书页 62 列出全部十二符头，书页 68 给了"癸酉日的符头是己巳"这个算例。
  const FU_TOU_YUAN: Record<string, '上元' | '中元' | '下元'> = {
    '甲子': '上元', '甲午': '上元', '己卯': '上元', '己酉': '上元',
    '甲寅': '中元', '甲申': '中元', '己巳': '中元', '己亥': '中元',
    '甲辰': '下元', '甲戌': '下元', '己丑': '下元', '己未': '下元',
  };

  it('十二符头自身的元与书上所列一致', () => {
    // 逐个找出这些日柱在 1996-1998 年间的实际日期并验证
    for (const [ganZhi, expected] of Object.entries(FU_TOU_YUAN)) {
      let found = false;
      for (let d = 0; d < 400 && !found; d++) {
        const dt = new Date(1996, 0, 1 + d);
        const chart = generateChart({
          year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(),
          hour: 10, minute: 0, method: '拆补法',
        });
        if (chart.siZhu.day.gan + chart.siZhu.day.zhi !== ganZhi) continue;
        found = true;
        expect(chart.yuan, `${ganZhi}日应为${expected}`).toBe(expected);
      }
      expect(found, `1996 年起 400 天内应能找到 ${ganZhi} 日`).toBe(true);
    }
  });

  it('己日也是符头 —— 1997-01-07 己酉日为上元，不是下元', () => {
    // 书上实例（恋爱婚姻·实例一，书页 160）：
    // 「丙子年辛丑月己酉日甲戌时，阳2局」。小寒上元正是阳遁二局。
    // 修复前此处算成"小寒下元"（阳5局），因为代码把符头当成了旬首，
    // 从己酉硬退五天到甲辰。
    const chart = generateChart({
      year: 1997, month: 1, day: 7, hour: 20, minute: 40, method: '拆补法',
    });
    expect(chart.siZhu.day.gan + chart.siZhu.day.zhi).toBe('己酉');
    expect(chart.jieQi).toBe('小寒');
    expect(chart.yuan).toBe('上元');
    expect(chart.dunType).toBe('阳遁');
    expect(chart.juNumber).toBe(2);
  });

  it('同一节气内相邻五天分属不同元，元不会被拉长成十天', () => {
    // 符头五天一轮，所以连续十天必定跨越两个元。
    const yuanSeen = new Set<string>();
    for (let d = 0; d < 10; d++) {
      const chart = generateChart({
        year: 1997, month: 1, day: 6 + d, hour: 10, minute: 0, method: '拆补法',
      });
      yuanSeen.add(chart.yuan);
    }
    expect(yuanSeen.size).toBeGreaterThanOrEqual(2);
  });
});

// ─── 与《神奇之门》书载盘面逐格核对 ─────────────────────────────────────────

describe('书载盘面核对：张志春《神奇之门》恋爱婚姻·实例一（书页 160-161）', () => {
  // 书上原文：「丙子年辛丑月己酉日甲戌时，阳 2 局，天冲星为值符，伤门为值使」
  // 起盘时间：1997 年 1 月 7 日晚上 8 点 40 分
  //
  // 这一个案例同时锁死三处曾经出错的逻辑：
  //   1. 符头（甲己皆可）→ 元 → 局数
  //   2. 甲遁六仪（甲戌遁己，非戊）→ 值符落宫 → 九星与天盘干
  //   3. 八神起点必须与值符星同宫
  const chart = generateChart({
    year: 1997, month: 1, day: 7, hour: 20, minute: 40, method: '拆补法',
  });

  it('四柱与局数', () => {
    const { year, month, day, hour } = chart.siZhu;
    expect(`${year.gan}${year.zhi}`).toBe('丙子');
    expect(`${month.gan}${month.zhi}`).toBe('辛丑');
    expect(`${day.gan}${day.zhi}`).toBe('己酉');
    expect(`${hour.gan}${hour.zhi}`).toBe('甲戌');
    expect(chart.dunType).toBe('阳遁');
    expect(chart.juNumber).toBe(2);
  });

  it('值符值使 —— 天冲为值符、伤门为值使，且同落震三宫', () => {
    expect(chart.zhiFu).toBe('天冲');
    expect(chart.zhiShi).toBe('伤');
    expect(chart.palaces[3].star).toBe('天冲');
    expect(chart.palaces[3].gate).toBe('伤');
    // 值符神必与值符星同宫 —— 曾因甲遁错仪而分离
    expect(chart.palaces[3].deity).toBe('值符');
  });

  it('九宫逐格与书载一致', () => {
    // [宫位, 八神, 八门, 天盘干, 九星, 地盘干]
    const book: [number, string, string, string, string, string][] = [
      [4, '螣蛇', '杜', '庚', '天辅', '庚'],
      [9, '太阴', '景', '丙', '天英', '丙'],
      [2, '六合', '死', '戊', '天芮', '戊'],
      [3, '值符', '伤', '己', '天冲', '己'],
      [7, '白虎', '惊', '癸', '天柱', '癸'],
      [8, '九天', '生', '丁', '天任', '丁'],
      [1, '九地', '休', '乙', '天蓬', '乙'],
      [6, '玄武', '开', '壬', '天心', '壬'],
    ];
    for (const [idx, deity, gate, tianPan, star, diPan] of book) {
      const p = chart.palaces[idx as 1|2|3|4|6|7|8|9];
      expect(p.deity, `${idx}宫八神`).toBe(deity);
      expect(p.gate, `${idx}宫八门`).toBe(gate);
      expect(p.tianPanGan, `${idx}宫天盘干`).toBe(tianPan);
      expect(p.star, `${idx}宫九星`).toBe(star);
      expect(p.diPanGan, `${idx}宫地盘干`).toBe(diPan);
    }
  });
});

// ─── 六仪入中宫（天禽值符 / 值使起点）──────────────────────────────────────

describe('旬首六仪落中五宫', () => {
  // 六仪入中时，值符是天禽、值使由寄宫坤二反查得出。这两条路径原先都错：
  // 天禽不随转盘移动，值使又从坤二而非中五起步。
  // 六仪不在中宫时两者恰好等价，所以这个分支长期无人触及。

  it('天禽为值符时随天芮寄宫，不再卡在中五宫', () => {
    // 《神奇之门》工作就业·实例一（书页 191）：
    // 「丙子年庚寅月丙子日丁酉时，阳2局，甲午辛在5宫，天禽星为值符，落8宫，死门为值使落8宫」
    const chart = generateChart({
      year: 1996, month: 2, day: 9, hour: 18, minute: 0, method: '拆补法',
    });
    expect(chart.zhiFu).toBe('天禽');
    // 时干丁在地盘艮八宫，值符转到此处
    expect(chart.palaces[8].diPanGan).toBe('丁');
    expect(chart.palaces[8].lodgedStar).toBe('天禽');
    // 天禽与天芮同宫而行
    expect(chart.palaces[8].star).toBe('天芮');
    // 中五宫仍显示天禽（排盘惯例），但那不是它的落宫
    expect(chart.palaces[5].star).toBe('天禽');
    expect(chart.palaces[5].lodgedStar).toBeUndefined();
  });

  it('值使从六仪所在的中五宫起步，而非从门本宫坤二', () => {
    // 同上例：值使死门走 3 步（丁酉为甲午旬第 3 位），5→6→7→8，落艮八宫
    const chart = generateChart({
      year: 1996, month: 2, day: 9, hour: 18, minute: 0, method: '拆补法',
    });
    expect(chart.zhiShi).toBe('死');
    expect(chart.palaces[8].gate).toBe('死');
  });

  it('另一例：走 1 步落乾六宫', () => {
    // 工作就业·实例四（书页 196）：
    // 「丁丑年甲辰月丁亥日乙巳时，阳1局，甲辰旬，天禽星值符落9宫，死门值使落6宫」
    const chart = generateChart({
      year: 1997, month: 4, day: 15, hour: 10, minute: 0, method: '拆补法',
    });
    expect(chart.zhiFu).toBe('天禽');
    expect(chart.palaces[9].lodgedStar).toBe('天禽');   // 时干乙在离九宫
    expect(chart.zhiShi).toBe('死');
    expect(chart.palaces[6].gate).toBe('死');           // 5→6，一步
  });

  it('按星名查找宫位时能找到寄宫的天禽 —— 失物寻找事类以天禽为用神', () => {
    const chart = generateChart({
      year: 1996, month: 2, day: 9, hour: 18, minute: 0, method: '拆补法',
    });
    const found: number[] = [];
    for (let i = 1; i <= 9; i++) {
      const p = chart.palaces[i as 1|2|3|4|5|6|7|8|9];
      if (p.star === '天禽' || p.lodgedStar === '天禽') found.push(i);
    }
    // 中五宫（惯例）与实际落宫都能被找到，而不是只有中五宫
    expect(found).toContain(8);
  });
});

// ─── 用神取法（依据《神奇之门》下编各章第一节）──────────────────────────────

describe('动态用神解析', () => {
  // 本门断法的主线是「日干为求测之人，时干为所测之事」，随起盘时刻变化。
  // 原模板以固定符号（戊为失物、乙为求职者）为主用神，与书上取用不合。
  const chart = generateChart({
    year: 1996, month: 3, day: 24, hour: 11, minute: 45, method: '拆补法',
  });
  // 书载：丙子年辛卯月庚申日壬午时（钱物丢失·实例三，书页 258）

  it('每个角色的 targetSource 都能解析出非空目标', () => {
    for (const key of EVENT_TYPE_KEYS) {
      const result = analyzeYongShen(chart, key);
      for (const loc of result.locations) {
        expect(loc.role.target, `${key} 的「${loc.role.label}」解析出空目标`).not.toBe('');
      }
    }
  });

  it('失物寻找以日干为失主、时干为失物 —— 而非固定的戊', () => {
    const r = analyzeYongShen(chart, '失物寻找');
    const owner = r.locations.find(l => l.role.label === '失主')!;
    const item = r.locations.find(l => l.role.label === '失物')!;
    // 日柱庚申 → 日干庚；时柱壬午 → 时干壬
    expect(owner.role.target).toBe('庚');
    expect(item.role.target).toBe('壬');
  });

  it('考试求学以年干为录取学校、值符为主考官、值使为副主考官', () => {
    const r = analyzeYongShen(chart, '考试求学');
    const school = r.locations.find(l => l.role.label === '录取学校')!;
    const chief = r.locations.find(l => l.role.label === '主考官')!;
    const deputy = r.locations.find(l => l.role.label === '副主考官')!;
    expect(school.role.target).toBe('丙');        // 年柱丙子
    expect(chief.role.target).toBe(chart.zhiFu);
    expect(deputy.role.target).toBe(chart.zhiShi);
  });

  it('求职面试以月干为同事、年干为上级领导、值符为顶头上司', () => {
    const r = analyzeYongShen(chart, '求职面试');
    expect(r.locations.find(l => l.role.label === '同事')!.role.target).toBe('辛');   // 月柱辛卯
    expect(r.locations.find(l => l.role.label === '上级领导')!.role.target).toBe('丙');
    expect(r.locations.find(l => l.role.label === '顶头上司')!.role.target).toBe(chart.zhiFu);
  });

  it('官讼诉讼的被告取天乙 —— 值符落宫的地盘原星，不是乙奇', () => {
    // 书页 279 明确否定「以乙奇为被告」：「从易理上讲不通，经过实践验证也不准确」
    const r = analyzeYongShen(chart, '官讼诉讼');
    const defendant = r.locations.find(l => l.role.label === '被告')!;
    expect(defendant.role.target).not.toBe('乙');
    expect(STAR_NAMES).toContain(defendant.role.target as never);

    // 天乙应是值符落宫的「本宫星」
    let zhiFuPalace = 0;
    for (let i = 1; i <= 9; i++) {
      const p = chart.palaces[i as 1|2|3|4|5|6|7|8|9];
      if (p.star === chart.zhiFu || p.lodgedStar === chart.zhiFu) zhiFuPalace = i;
    }
    expect(STAR_ORIGINAL_PALACE[defendant.role.target as keyof typeof STAR_ORIGINAL_PALACE])
      .toBe(zhiFuPalace);
  });

  it('八神类用神可被定位（媒人六合、盗贼玄武、航线九天）', () => {
    const deityRoles: [string, string][] = [
      ['婚姻感情', '媒人'], ['失物寻找', '盗贼'], ['出行远行', '航线'],
    ];
    for (const [key, label] of deityRoles) {
      const r = analyzeYongShen(chart, key as never);
      const loc = r.locations.find(l => l.role.label === label)!;
      expect(loc.role.type, `${key}·${label}`).toBe('deity');
      expect(loc.palace, `${key}·${label} 未能定位`).not.toBeNull();
    }
  });
});
