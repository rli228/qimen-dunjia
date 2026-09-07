/**
 * 八门克应数据 — 门加宫、门加三奇六仪、门加门
 *
 * 数据来源：经典奇门遁甲文献整理
 * 单一数据源：百科展示与解盘分析共用此数据
 */

import type { GateName, PalaceIndex, SanQiLiuYi } from '../../constants';
import { PALACE_WUXING } from '../../constants';

// ─── 八门基础属性 ─────────────────────────────────────────────────────────────

export interface GateInfo {
  name: Exclude<GateName, '中'>;
  wuxing: string;
  category: '吉' | '凶' | '平';
  meaning: string;
  represents: string;
  divination: string;
  palace: PalaceIndex;
}

export const GATE_INFO: Record<Exclude<GateName, '中'>, GateInfo> = {
  '开': { name: '开', wuxing: '金', category: '吉', palace: 6, meaning: '开创、开始', represents: '领导、上司、官方', divination: '利求官、开业、出行' },
  '休': { name: '休', wuxing: '水', category: '吉', palace: 1, meaning: '休养、休息', represents: '贵人、长辈', divination: '利求财、见贵、休养' },
  '生': { name: '生', wuxing: '土', category: '吉', palace: 8, meaning: '生发、生机', represents: '财产、房产、田宅', divination: '利求财、营造、生产' },
  '伤': { name: '伤', wuxing: '木', category: '凶', palace: 3, meaning: '伤害、损伤', represents: '车船、道路', divination: '利行猎、捕盗、索债' },
  '杜': { name: '杜', wuxing: '木', category: '凶', palace: 4, meaning: '杜绝、隐藏', represents: '隐蔽、技术', divination: '利隐匿、防盗、堵漏' },
  '景': { name: '景', wuxing: '火', category: '平', palace: 9, meaning: '景象、光明', represents: '文书、信息、电报', divination: '利文书、考试、发信' },
  '死': { name: '死', wuxing: '土', category: '凶', palace: 2, meaning: '死亡、静止', represents: '坟墓、死人', divination: '利丧葬、吊唁，余事不利' },
  '惊': { name: '惊', wuxing: '金', category: '凶', palace: 7, meaning: '惊恐、口舌', represents: '口舌、官司', divination: '利争讼、惊吓，余事不利' },
};

// ─── 五行生克关系 ─────────────────────────────────────────────────────────────

type WuxingRelation = '比和' | '门生宫' | '宫生门' | '门克宫' | '宫克门';

const SHENG: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

function getWuxingRelation(gateWx: string, palaceWx: string): WuxingRelation {
  if (gateWx === palaceWx) return '比和';
  if (SHENG[gateWx] === palaceWx) return '门生宫';
  if (SHENG[palaceWx] === gateWx) return '宫生门';
  if (SHENG[SHENG[gateWx]] !== undefined && SHENG[SHENG[gateWx]] === palaceWx) {
    // gate克palace: 木克土, 土克水, 水克火, 火克金, 金克木
    return '门克宫';
  }
  return '宫克门';
}

// ─── 门加宫数据（64组）─────────────────────────────────────────────────────────

export interface GatePalaceData {
  gate: Exclude<GateName, '中'>;
  palace: PalaceIndex;
  relation: WuxingRelation;
  fortune: '吉' | '凶' | '平';
  meaning: string;
}

function buildGatePalaceData(): GatePalaceData[] {
  const gates: Exclude<GateName, '中'>[] = ['开', '休', '生', '伤', '杜', '景', '死', '惊'];
  const palaces: PalaceIndex[] = [1, 2, 3, 4, 6, 7, 8, 9];
  const results: GatePalaceData[] = [];

  for (const gate of gates) {
    const gateWx = GATE_INFO[gate].wuxing;
    for (const palace of palaces) {
      const palaceWx = PALACE_WUXING[palace];
      const relation = getWuxingRelation(gateWx, palaceWx);

      let fortune: '吉' | '凶' | '平';
      let meaning: string;

      if (relation === '比和') {
        fortune = '吉';
        meaning = `${gate}门与${palace}宫五行比和，门得宫助，力量旺盛`;
      } else if (relation === '宫生门') {
        fortune = '吉';
        meaning = `宫生门，${gate}门得${palace}宫相生，吉利`;
      } else if (relation === '门生宫') {
        fortune = '平';
        meaning = `门生宫，${gate}门泄气于${palace}宫，力量减弱`;
      } else if (relation === '门克宫') {
        fortune = '平';
        meaning = `门克宫，${gate}门克制${palace}宫，主事可成但费力`;
      } else {
        fortune = '凶';
        meaning = `宫克门，${gate}门受${palace}宫克制，不利`;
      }

      // 特殊组合覆盖
      const key = `${gate}_${palace}`;
      const special = GATE_PALACE_SPECIAL[key];
      if (special) {
        fortune = special.fortune;
        meaning = special.meaning;
      }

      results.push({ gate, palace, relation, fortune, meaning });
    }
  }

  return results;
}

// 特殊门宫组合（覆盖通用规则）
const GATE_PALACE_SPECIAL: Record<string, { fortune: '吉' | '凶' | '平'; meaning: string }> = {
  // 门归本宫
  '开_6': { fortune: '吉', meaning: '开门归本宫乾六宫，门宫相合，百事大吉' },
  '休_1': { fortune: '吉', meaning: '休门归本宫坎一宫，门宫相合，休养生息，贵人扶持' },
  '生_8': { fortune: '吉', meaning: '生门归本宫艮八宫，门宫相合，求财营造大利' },
  '伤_3': { fortune: '平', meaning: '伤门归本宫震三宫，门宫相合，但伤门本凶，凶性稍减' },
  '杜_4': { fortune: '平', meaning: '杜门归本宫巽四宫，门宫相合，利隐匿避祸' },
  '景_9': { fortune: '吉', meaning: '景门归本宫离九宫，门宫相合，文书大利' },
  '死_2': { fortune: '凶', meaning: '死门归本宫坤二宫，门宫相合，凶上加凶，大不吉' },
  '惊_7': { fortune: '凶', meaning: '惊门归本宫兑七宫，门宫相合，口舌是非加重' },
  // 三吉门特殊
  '开_9': { fortune: '吉', meaning: '开门加离九宫，火克金，官星得火炼，利求名求官' },
  '休_8': { fortune: '吉', meaning: '休门加艮八宫，土克水力弱，但艮为止，利休养安居' },
  '生_9': { fortune: '平', meaning: '生门加离九宫，火生土，生门得生反泄气，求财平平' },
};

export const GATE_PALACE_DATA: GatePalaceData[] = buildGatePalaceData();

// ─── 门加三奇六仪数据（72组）─────────────────────────────────────────────────

export interface GateStemData {
  gate: Exclude<GateName, '中'>;
  stem: SanQiLiuYi;
  fortune: '吉' | '凶' | '平';
  meaning: string;
}

export const GATE_STEM_DATA: GateStemData[] = [
  // ─── 开门加三奇六仪 ─────────────────────
  { gate: '开', stem: '乙', fortune: '吉', meaning: '开门加乙奇，贵人提携，利求官开业，事事顺遂' },
  { gate: '开', stem: '丙', fortune: '吉', meaning: '开门加丙奇，官星照耀，权势显赫，大利仕途' },
  { gate: '开', stem: '丁', fortune: '吉', meaning: '开门加丁奇，贵人文书双利，利考试升迁' },
  { gate: '开', stem: '戊', fortune: '吉', meaning: '开门加戊，财官双美，利经商求财' },
  { gate: '开', stem: '己', fortune: '凶', meaning: '开门加己，暗昧不明，利阴谋不利正事' },
  { gate: '开', stem: '庚', fortune: '凶', meaning: '开门加庚，太白入门，主道路阻塞，不宜出行' },
  { gate: '开', stem: '辛', fortune: '凶', meaning: '开门加辛，主口舌官非，破财损名' },
  { gate: '开', stem: '壬', fortune: '平', meaning: '开门加壬，波折反复，远行劳碌' },
  { gate: '开', stem: '癸', fortune: '凶', meaning: '开门加癸，主牢狱之灾，凡事闭塞' },

  // ─── 休门加三奇六仪 ─────────────────────
  { gate: '休', stem: '乙', fortune: '吉', meaning: '休门加乙奇，贵人相助，求财见贵皆吉' },
  { gate: '休', stem: '丙', fortune: '吉', meaning: '休门加丙奇，贵人光明，利求官求名' },
  { gate: '休', stem: '丁', fortune: '吉', meaning: '休门加丁奇，文书吉利，利考试求学' },
  { gate: '休', stem: '戊', fortune: '吉', meaning: '休门加戊，财星得地，大利求财' },
  { gate: '休', stem: '己', fortune: '凶', meaning: '休门加己，暗害不宁，防小人' },
  { gate: '休', stem: '庚', fortune: '凶', meaning: '休门加庚，行路受阻，不宜出行远行' },
  { gate: '休', stem: '辛', fortune: '凶', meaning: '休门加辛，主失财失物，不利求财' },
  { gate: '休', stem: '壬', fortune: '平', meaning: '休门加壬，阴人暗助，事多曲折' },
  { gate: '休', stem: '癸', fortune: '凶', meaning: '休门加癸，主暗昧纠缠，事不清白' },

  // ─── 生门加三奇六仪 ─────────────────────
  { gate: '生', stem: '乙', fortune: '吉', meaning: '生门加乙奇，利阴人求财，婚姻和合' },
  { gate: '生', stem: '丙', fortune: '吉', meaning: '生门加丙奇，主威权显赫，利营造生产' },
  { gate: '生', stem: '丁', fortune: '吉', meaning: '生门加丁奇，文书财利双收' },
  { gate: '生', stem: '戊', fortune: '吉', meaning: '生门加戊，大利求财置产，百事吉利' },
  { gate: '生', stem: '己', fortune: '凶', meaning: '生门加己，主产业纠纷，暗昧不清' },
  { gate: '生', stem: '庚', fortune: '凶', meaning: '生门加庚，主财路阻塞，求财不得' },
  { gate: '生', stem: '辛', fortune: '凶', meaning: '生门加辛，主破财损产，不利交易' },
  { gate: '生', stem: '壬', fortune: '平', meaning: '生门加壬，求财辛劳，费力可得' },
  { gate: '生', stem: '癸', fortune: '凶', meaning: '生门加癸，主产业不保，水患损财' },

  // ─── 伤门加三奇六仪 ─────────────────────
  { gate: '伤', stem: '乙', fortune: '平', meaning: '伤门加乙奇，伤害稍减，利索债追讨' },
  { gate: '伤', stem: '丙', fortune: '平', meaning: '伤门加丙奇，主口舌是非，因急躁惹祸' },
  { gate: '伤', stem: '丁', fortune: '平', meaning: '伤门加丁奇，因文书争讼致伤' },
  { gate: '伤', stem: '戊', fortune: '凶', meaning: '伤门加戊，主伤灾破财，车马有险' },
  { gate: '伤', stem: '己', fortune: '凶', meaning: '伤门加己，主暗伤暗害，防小人陷害' },
  { gate: '伤', stem: '庚', fortune: '凶', meaning: '伤门加庚，主官灾刑伤，大凶' },
  { gate: '伤', stem: '辛', fortune: '凶', meaning: '伤门加辛，主口舌伤害，因言惹祸' },
  { gate: '伤', stem: '壬', fortune: '凶', meaning: '伤门加壬，主因酒色致伤，行路不安' },
  { gate: '伤', stem: '癸', fortune: '凶', meaning: '伤门加癸，主因暗事致伤，水路不利' },

  // ─── 杜门加三奇六仪 ─────────────────────
  { gate: '杜', stem: '乙', fortune: '吉', meaning: '杜门加乙奇，利隐遁避祸，利守不利攻' },
  { gate: '杜', stem: '丙', fortune: '平', meaning: '杜门加丙奇，主事暗中进行，难以明了' },
  { gate: '杜', stem: '丁', fortune: '平', meaning: '杜门加丁奇，利隐匿密谋，暗中图谋' },
  { gate: '杜', stem: '戊', fortune: '平', meaning: '杜门加戊，主闭塞不通，宜守不宜动' },
  { gate: '杜', stem: '己', fortune: '凶', meaning: '杜门加己，主暗中受困，防陷阱' },
  { gate: '杜', stem: '庚', fortune: '凶', meaning: '杜门加庚，主道路不通，凡事阻隔' },
  { gate: '杜', stem: '辛', fortune: '凶', meaning: '杜门加辛，主牢狱之忧，有口难言' },
  { gate: '杜', stem: '壬', fortune: '凶', meaning: '杜门加壬，主暗中遇害，水路阻塞' },
  { gate: '杜', stem: '癸', fortune: '凶', meaning: '杜门加癸，主阴私暗昧，百事不利' },

  // ─── 景门加三奇六仪 ─────────────────────
  { gate: '景', stem: '乙', fortune: '吉', meaning: '景门加乙奇，文书大利，利考试发榜' },
  { gate: '景', stem: '丙', fortune: '吉', meaning: '景门加丙奇，主文运昌盛，光明远大' },
  { gate: '景', stem: '丁', fortune: '吉', meaning: '景门加丁奇，文书双美，大利科考' },
  { gate: '景', stem: '戊', fortune: '平', meaning: '景门加戊，主因文书得财，平稳可期' },
  { gate: '景', stem: '己', fortune: '凶', meaning: '景门加己，主文书不利，信息阻塞' },
  { gate: '景', stem: '庚', fortune: '凶', meaning: '景门加庚，主因文书惹官非，信息受阻' },
  { gate: '景', stem: '辛', fortune: '凶', meaning: '景门加辛，主因言获罪，文书有损' },
  { gate: '景', stem: '壬', fortune: '凶', meaning: '景门加壬，文书沉没，信息不通' },
  { gate: '景', stem: '癸', fortune: '凶', meaning: '景门加癸，主文书暗昧，防伪造' },

  // ─── 死门加三奇六仪 ─────────────────────
  { gate: '死', stem: '乙', fortune: '平', meaning: '死门加乙奇，凶性稍减，利丧葬祭祀' },
  { gate: '死', stem: '丙', fortune: '平', meaning: '死门加丙奇，主因急事致凶，需谨慎' },
  { gate: '死', stem: '丁', fortune: '平', meaning: '死门加丁奇，主文书不利，但凶减' },
  { gate: '死', stem: '戊', fortune: '凶', meaning: '死门加戊，主大凶，万事不利' },
  { gate: '死', stem: '己', fortune: '凶', meaning: '死门加己，主暗疾缠身，阴私害人' },
  { gate: '死', stem: '庚', fortune: '凶', meaning: '死门加庚，主大凶，刑杀之灾' },
  { gate: '死', stem: '辛', fortune: '凶', meaning: '死门加辛，主牢狱死伤，极凶' },
  { gate: '死', stem: '壬', fortune: '凶', meaning: '死门加壬，主因暗事致死伤，水灾凶险' },
  { gate: '死', stem: '癸', fortune: '凶', meaning: '死门加癸，主阴暗致凶，百事不利' },

  // ─── 惊门加三奇六仪 ─────────────────────
  { gate: '惊', stem: '乙', fortune: '平', meaning: '惊门加乙奇，口舌稍减，利争讼' },
  { gate: '惊', stem: '丙', fortune: '平', meaning: '惊门加丙奇，主因急躁惊恐，口舌纷争' },
  { gate: '惊', stem: '丁', fortune: '平', meaning: '惊门加丁奇，因文书引起惊恐争讼' },
  { gate: '惊', stem: '戊', fortune: '凶', meaning: '惊门加戊，主破财惊恐，官非口舌' },
  { gate: '惊', stem: '己', fortune: '凶', meaning: '惊门加己，主暗中惊恐，防阴谋暗害' },
  { gate: '惊', stem: '庚', fortune: '凶', meaning: '惊门加庚，主官讼大凶，惊恐不安' },
  { gate: '惊', stem: '辛', fortune: '凶', meaning: '惊门加辛，主口舌官非，因言获罪' },
  { gate: '惊', stem: '壬', fortune: '凶', meaning: '惊门加壬，主阴谋暗算，惊恐不宁' },
  { gate: '惊', stem: '癸', fortune: '凶', meaning: '惊门加癸，主因暗事引起惊恐，凡事不安' },
];

// ─── 门加门数据（64组）─────────────────────────────────────────────────────────

export interface GateGateData {
  gate1: Exclude<GateName, '中'>;  // 用神宫门
  gate2: Exclude<GateName, '中'>;  // 对方宫门
  fortune: '吉' | '凶' | '平';
  meaning: string;
}

function buildGateGateData(): GateGateData[] {
  const gates: Exclude<GateName, '中'>[] = ['开', '休', '生', '伤', '杜', '景', '死', '惊'];
  const results: GateGateData[] = [];

  for (const g1 of gates) {
    for (const g2 of gates) {
      const key = `${g1}_${g2}`;
      const special = GATE_GATE_SPECIAL[key];
      if (special) {
        results.push({ gate1: g1, gate2: g2, ...special });
      } else {
        // 默认规则：两吉门=吉，两凶门=凶，吉凶混=平
        const c1 = GATE_INFO[g1].category;
        const c2 = GATE_INFO[g2].category;
        let fortune: '吉' | '凶' | '平';
        let meaning: string;
        if (c1 === '吉' && c2 === '吉') {
          fortune = '吉';
          meaning = `${g1}门遇${g2}门，双吉相逢，诸事顺遂`;
        } else if (c1 === '凶' && c2 === '凶') {
          fortune = '凶';
          meaning = `${g1}门遇${g2}门，双凶叠加，诸事不利`;
        } else {
          fortune = '平';
          meaning = `${g1}门遇${g2}门，吉凶参半，需结合具体宫位判断`;
        }
        results.push({ gate1: g1, gate2: g2, fortune, meaning });
      }
    }
  }

  return results;
}

const GATE_GATE_SPECIAL: Record<string, { fortune: '吉' | '凶' | '平'; meaning: string }> = {
  // 同门伏吟
  '开_开': { fortune: '平', meaning: '开门伏吟，事情反复，不宜创新开拓' },
  '休_休': { fortune: '平', meaning: '休门伏吟，停滞不前，宜静守等待' },
  '生_生': { fortune: '平', meaning: '生门伏吟，求财停滞，需等待时机' },
  '伤_伤': { fortune: '凶', meaning: '伤门伏吟，损伤加重，大不利' },
  '杜_杜': { fortune: '凶', meaning: '杜门伏吟，万事闭塞，进退两难' },
  '景_景': { fortune: '平', meaning: '景门伏吟，文书反复，事多纠缠' },
  '死_死': { fortune: '凶', meaning: '死门伏吟，大凶之兆，万事不利' },
  '惊_惊': { fortune: '凶', meaning: '惊门伏吟，惊恐不安，口舌加重' },
  // 三吉门互遇
  '开_休': { fortune: '吉', meaning: '开门遇休门，开创得贵人，万事亨通' },
  '开_生': { fortune: '吉', meaning: '开门遇生门，开创得财，大吉大利' },
  '休_开': { fortune: '吉', meaning: '休门遇开门，贵人助开创，诸事顺利' },
  '休_生': { fortune: '吉', meaning: '休门遇生门，贵人生财，求财大利' },
  '生_开': { fortune: '吉', meaning: '生门遇开门，财路大开，利经商' },
  '生_休': { fortune: '吉', meaning: '生门遇休门，财运亨通，得贵人助' },
  // 凶门特殊
  '伤_死': { fortune: '凶', meaning: '伤门遇死门，伤亡之象，大凶' },
  '死_伤': { fortune: '凶', meaning: '死门遇伤门，死伤之灾，极凶' },
  '惊_死': { fortune: '凶', meaning: '惊门遇死门，惊恐致死，大凶' },
  '死_惊': { fortune: '凶', meaning: '死门遇惊门，因凶致惊，极不利' },
};

export const GATE_GATE_DATA: GateGateData[] = buildGateGateData();

// ─── 查询函数 ─────────────────────────────────────────────────────────────────

export function lookupGatePalace(gate: Exclude<GateName, '中'>, palace: PalaceIndex): GatePalaceData | undefined {
  return GATE_PALACE_DATA.find(d => d.gate === gate && d.palace === palace);
}

export function lookupGateStem(gate: Exclude<GateName, '中'>, stem: SanQiLiuYi): GateStemData | undefined {
  return GATE_STEM_DATA.find(d => d.gate === gate && d.stem === stem);
}
