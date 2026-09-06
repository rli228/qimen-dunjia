/**
 * 十干克应数据 — 81种天盘干+地盘干组合
 *
 * 数据来源：经典奇门遁甲文献整理
 * 格式：键为 "天盘干_地盘干"，值为克应含义
 *
 * 可编辑：如需修改某个组合的含义，直接修改对应条目即可
 */

import type { GanInteraction } from '../../types';
import type { SanQiLiuYi } from '../../constants';

interface GanInteractionData {
  name: string;
  meaning: string;
  fortune: '吉' | '凶' | '平';
}

export const GAN_INTERACTION_DATA: Record<string, GanInteractionData> = {
  // ─── 戊（天盘）─────────────────────────────
  '戊_戊': { name: '戊加戊', meaning: '天门伏吟，主事物停滞，谋事不成，宜守不宜攻', fortune: '凶' },
  '戊_己': { name: '青龙返首', meaning: '天门生地户，百事吉利，求财求官皆如意', fortune: '吉' },
  '戊_庚': { name: '天乙飞宫', meaning: '天门克地户，主阻隔不通，行人迟到', fortune: '凶' },
  '戊_辛': { name: '青龙折足', meaning: '主招口舌是非，测病凶，谋事不利', fortune: '凶' },
  '戊_壬': { name: '青龙入天牢', meaning: '主困滞不安，诸事不顺', fortune: '凶' },
  '戊_癸': { name: '青龙华盖', meaning: '主遁迹修道，隐匿藏形，吉凶参半', fortune: '平' },
  '戊_丁': { name: '青龙耀明', meaning: '主威权显赫，文书吉利，利见贵人', fortune: '吉' },
  '戊_丙': { name: '青龙返首（丙）', meaning: '主官运亨通，财利双收', fortune: '吉' },
  '戊_乙': { name: '青龙合灵', meaning: '主和合吉利，婚姻美满，利求财', fortune: '吉' },

  // ─── 己（天盘）─────────────────────────────
  '己_戊': { name: '六合反吟', meaning: '地户入天门，主奸诈虚伪，利女不利男', fortune: '凶' },
  '己_己': { name: '地户伏吟', meaning: '主停滞不前，百事不利，宜静守', fortune: '凶' },
  '己_庚': { name: '刑格', meaning: '主官讼刑伤，百事不利，大凶', fortune: '凶' },
  '己_辛': { name: '游魂入墓', meaning: '主疾病昏迷，走失难寻', fortune: '凶' },
  '己_壬': { name: '地网高张', meaning: '主被困纠缠，阴谋败露', fortune: '凶' },
  '己_癸': { name: '地刑玄武', meaning: '主暗害欺骗，防小人', fortune: '凶' },
  '己_丁': { name: '朱雀入墓', meaning: '主文书官司，信息不通', fortune: '凶' },
  '己_丙': { name: '火入地户', meaning: '主文书不畅，谋事迟缓', fortune: '平' },
  '己_乙': { name: '日奇入墓', meaning: '主门户不利，被人欺瞒', fortune: '凶' },

  // ─── 庚（天盘）─────────────────────────────
  '庚_戊': { name: '值符飞宫', meaning: '主官灾横祸，行人不至，大凶', fortune: '凶' },
  '庚_己': { name: '上格', meaning: '主官讼纠缠，百事阻隔', fortune: '凶' },
  '庚_庚': { name: '战格（太白同宫）', meaning: '主战斗杀伐，两败俱伤，大凶', fortune: '凶' },
  '庚_辛': { name: '白虎干格', meaning: '主刑狱灾殃，道路艰难', fortune: '凶' },
  '庚_壬': { name: '上格小凶', meaning: '主交战不利，远行有阻', fortune: '凶' },
  '庚_癸': { name: '大格', meaning: '主大凶之兆，庚金遇癸水泄气', fortune: '凶' },
  '庚_丁': { name: '亭亭之格', meaning: '主因文书惹官非，注意火灾', fortune: '凶' },
  '庚_丙': { name: '太白入荧', meaning: '主贼来犯，兵战不利，防盗贼', fortune: '凶' },
  '庚_乙': { name: '太白逢星', meaning: '主道路不通，夫妻反目，利为客不利为主', fortune: '凶' },

  // ─── 辛（天盘）─────────────────────────────
  '辛_戊': { name: '困龙被伤', meaning: '主官灾破财，测病不吉', fortune: '凶' },
  '辛_己': { name: '入狱自刑', meaning: '主自招灾祸，牢狱之灾', fortune: '凶' },
  '辛_庚': { name: '白虎出力', meaning: '主官灾口舌，远行有险', fortune: '凶' },
  '辛_辛': { name: '伏吟天庭', meaning: '主停滞呻吟，忧愁不解', fortune: '凶' },
  '辛_壬': { name: '凶蛇入狱', meaning: '主官讼牢狱，凶险难测', fortune: '凶' },
  '辛_癸': { name: '天牢华盖', meaning: '主暗昧不明，隐匿之事', fortune: '凶' },
  '辛_丁': { name: '朱雀入狱', meaning: '主文书诉讼，因言获罪', fortune: '凶' },
  '辛_丙': { name: '天狱逢丙', meaning: '主因火灾致祸，或因急躁惹祸', fortune: '凶' },
  '辛_乙': { name: '虎猖狂', meaning: '主女人当权，阴谋暗害', fortune: '凶' },

  // ─── 壬（天盘）─────────────────────────────
  '壬_戊': { name: '小蛇得地', meaning: '主阴人利益，求财可得，利女人', fortune: '吉' },
  '壬_己': { name: '地网遮天', meaning: '主被困受阻，行事不通', fortune: '凶' },
  '壬_庚': { name: '小格', meaning: '主病讼不吉，行人不归', fortune: '凶' },
  '壬_辛': { name: '凶蛇入刑', meaning: '主牢狱刑伤，凶事连连', fortune: '凶' },
  '壬_壬': { name: '蛇矫伏吟', meaning: '主阴谋不成，水患灾祸', fortune: '凶' },
  '壬_癸': { name: '壬癸相投', meaning: '主阴谋暗害之事，防色欲之祸', fortune: '凶' },
  '壬_丁': { name: '蛇矫惊走', meaning: '主因惊恐而动，文书急迫', fortune: '平' },
  '壬_丙': { name: '水蛇入火', meaning: '主阴谋败露，因火灾致祸', fortune: '凶' },
  '壬_乙': { name: '小蛇得吉', meaning: '主阴人得利，利求财婚姻', fortune: '吉' },

  // ─── 癸（天盘）─────────────────────────────
  '癸_戊': { name: '天乙逢星', meaning: '主贵人提携，凡事吉利', fortune: '吉' },
  '癸_己': { name: '华盖地户', meaning: '主暗昧不明，利藏匿隐遁', fortune: '平' },
  '癸_庚': { name: '太白擒蛇', meaning: '主官灾刑伤，行路有凶', fortune: '凶' },
  '癸_辛': { name: '网盖天牢', meaning: '主牢狱之灾，百事不遂', fortune: '凶' },
  '癸_壬': { name: '癸壬相投', meaning: '主阴谋暗害之事，防色欲之祸', fortune: '凶' },
  '癸_癸': { name: '天网伏吟', meaning: '主滞留不动，水患暗疾', fortune: '凶' },
  '癸_丁': { name: '华盖悖格', meaning: '主奸盗诈伪，文书口舌', fortune: '凶' },
  '癸_丙': { name: '天网四张', meaning: '主因急躁致祸，利捕捉', fortune: '凶' },
  '癸_乙': { name: '华盖逢星', meaning: '主贵人暗助，利隐秘之事', fortune: '平' },

  // ─── 丁（天盘）── 星奇 ─────────────────────
  '丁_戊': { name: '青龙转光', meaning: '主官人升迁，常人威昌，财利大旺', fortune: '吉' },
  '丁_己': { name: '火入勾陈', meaning: '主文书不通，阴人阻隔', fortune: '凶' },
  '丁_庚': { name: '星奇入太白', meaning: '主文书口舌，因公事惹祸', fortune: '凶' },
  '丁_辛': { name: '朱雀入狱（辛）', meaning: '主罪人获释，占讼人被拘', fortune: '平' },
  '丁_壬': { name: '星奇入地', meaning: '主因文书得财，暗中谋利', fortune: '吉' },
  '丁_癸': { name: '朱雀投江', meaning: '主文书破败，信息沉没', fortune: '凶' },
  '丁_丁': { name: '星奇伏吟', meaning: '主文书迟缓，等待时机', fortune: '平' },
  '丁_丙': { name: '星月相会', meaning: '主贵人相助，文书大利', fortune: '吉' },
  '丁_乙': { name: '奇仪相佐', meaning: '主贵人帮扶，最利文书考试', fortune: '吉' },

  // ─── 丙（天盘）── 月奇 ─────────────────────
  '丙_戊': { name: '飞鸟跌穴', meaning: '主百事吉利，谋望如意，贵人相助', fortune: '吉' },
  '丙_己': { name: '火悖入刑', meaning: '主文书口舌是非，因急躁惹祸', fortune: '凶' },
  '丙_庚': { name: '荧入太白', meaning: '主贼人得利，门户有破，防盗', fortune: '凶' },
  '丙_辛': { name: '月奇逢刑', meaning: '主文书阻碍，利争讼不利和', fortune: '平' },
  '丙_壬': { name: '月奇悖师', meaning: '主因急躁致祸，水火不济', fortune: '凶' },
  '丙_癸': { name: '华盖悖师', meaning: '主奸谋暗害，文书暗昧', fortune: '凶' },
  '丙_丁': { name: '月星相会', meaning: '主贵人文书皆吉，利考试求官', fortune: '吉' },
  '丙_丙': { name: '月奇伏吟', meaning: '主官司反复，事多纠缠', fortune: '平' },
  '丙_乙': { name: '日月并行', meaning: '主公私皆利，谋望遂意', fortune: '吉' },

  // ─── 乙（天盘）── 日奇 ─────────────────────
  '乙_戊': { name: '日奇得使', meaning: '主阴贵人得力，婚姻和合，百事吉利', fortune: '吉' },
  '乙_己': { name: '日奇入墓（己）', meaning: '主门户闭塞，被人欺瞒，阴人不利', fortune: '凶' },
  '乙_庚': { name: '日奇被刑', meaning: '主门户破败，妻财有损，官灾口舌', fortune: '凶' },
  '乙_辛': { name: '龙逃走', meaning: '主奴仆逃走，六畜走失', fortune: '凶' },
  '乙_壬': { name: '日奇入地', meaning: '主尊卑悖乱，夫妻反目', fortune: '凶' },
  '乙_癸': { name: '日奇入网', meaning: '主被困受害，有网罗之灾', fortune: '凶' },
  '乙_丁': { name: '奇仪顺遂', meaning: '主贵人提携，文书吉利，最利考试', fortune: '吉' },
  '乙_丙': { name: '日月相会', meaning: '主官禄荣昌，利求名求利', fortune: '吉' },
  '乙_乙': { name: '日奇伏吟', meaning: '主自守待时，不宜妄动', fortune: '平' },
};

/**
 * 查询十干克应
 */
export function lookupGanInteraction(
  tianGan: SanQiLiuYi,
  diGan: SanQiLiuYi
): GanInteraction {
  const key = `${tianGan}_${diGan}`;
  const data = GAN_INTERACTION_DATA[key];

  if (!data) {
    return {
      tianGan,
      diGan,
      name: `${tianGan}加${diGan}`,
      meaning: '无特定克应记录',
      fortune: '平',
    };
  }

  return {
    tianGan,
    diGan,
    name: data.name,
    meaning: data.meaning,
    fortune: data.fortune,
  };
}
