declare module 'lunar-javascript' {
  export class Solar {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getLunar(): Lunar;
  }

  export class Lunar {
    static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Lunar;
    getSolar(): Solar;
    getEightChar(): EightChar;
    getPrevJieQi(wholeDay?: boolean): JieQi;
    getNextJieQi(wholeDay?: boolean): JieQi;
    getDayGanExact(): string;
    getDayZhiExact(): string;
  }

  export class EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
  }

  export class JieQi {
    getName(): string;
    getSolar(): Solar;
  }

  export class SolarUtil {
    static isLeapYear(year: number): boolean;
  }
}
