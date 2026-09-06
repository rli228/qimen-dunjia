export interface ClassicPassage {
  id: string;
  source: ClassicSource;
  originalText: string;
  modernTranslation: string;
  tags: string[];
  topic: ClassicTopic;
}

export type ClassicSource = '烟波钓叟歌' | '奇门秘诀' | '十干克应';
export type ClassicTopic = '总论' | '布局' | '八门' | '九星' | '天干' | '格局' | '断事';
