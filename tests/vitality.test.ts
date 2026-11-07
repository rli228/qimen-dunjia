import { describe, it, expect } from 'vitest';
import { GATE_WUXING, JIEQI_WUXING, getVitality } from '@/lib/qimen/interpretation/data/gateWuxing';

describe('月令旺相休囚死', () => {
  it('辰戌丑未月土旺：生门、死门在谷雨/大寒为旺', () => {
    expect(getVitality(GATE_WUXING['生'], JIEQI_WUXING['谷雨'])).toBe('旺');
    expect(getVitality(GATE_WUXING['死'], JIEQI_WUXING['大寒'])).toBe('旺');
  });
  it('季月土当令：开门(金)为相，休门(水)为死', () => {
    expect(getVitality(GATE_WUXING['开'], JIEQI_WUXING['霜降'])).toBe('相');
    expect(getVitality(GATE_WUXING['休'], JIEQI_WUXING['小暑'])).toBe('死');
  });
  it('孟仲月不变：立春木旺伤门', () => {
    expect(getVitality(GATE_WUXING['伤'], JIEQI_WUXING['立春'])).toBe('旺');
  });
});
