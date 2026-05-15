export interface GenrePreset {
  id: string
  name: string
  icon: string
  description: string
  typicalLength: string
  keyElements: string[]
}

export const GENRE_PRESETS: GenrePreset[] = [
  {
    id: 'xuanhuan',
    name: '玄幻',
    icon: '⚔️',
    description: '东方玄幻修仙',
    typicalLength: '200-500万字',
    keyElements: ['修炼体系', '金手指', '升级打怪', '宗门势力'],
  },
  {
    id: 'xianxia',
    name: '仙侠',
    icon: '🏔️',
    description: '古典仙侠',
    typicalLength: '100-300万字',
    keyElements: ['修仙', '法宝', '渡劫', '飞升'],
  },
  {
    id: 'dushi',
    name: '都市',
    icon: '🏙️',
    description: '现代都市',
    typicalLength: '100-300万字',
    keyElements: ['都市生活', '职场', '感情', '异能'],
  },
  {
    id: 'kehuan',
    name: '科幻',
    icon: '🚀',
    description: '未来科幻',
    typicalLength: '100-400万字',
    keyElements: ['科技', '太空', 'AI', '末世'],
  },
  {
    id: 'xuanyi',
    name: '悬疑',
    icon: '🔍',
    description: '悬疑推理',
    typicalLength: '50-200万字',
    keyElements: ['推理', '线索', '反转', '伏笔'],
  },
  {
    id: 'kongbu',
    name: '恐怖',
    icon: '👻',
    description: '灵异恐怖',
    typicalLength: '50-200万字',
    keyElements: ['恐怖氛围', '灵异事件', '生存'],
  },
  {
    id: 'lishi',
    name: '历史',
    icon: '📜',
    description: '历史架空',
    typicalLength: '100-400万字',
    keyElements: ['历史背景', '考据', '权谋', '战争'],
  },
  {
    id: 'yanqing',
    name: '言情',
    icon: '💕',
    description: '现代言情',
    typicalLength: '50-200万字',
    keyElements: ['感情线', '甜宠', '虐恋', 'HE/BE'],
  },
  {
    id: 'wuxia',
    name: '武侠',
    icon: '🗡️',
    description: '古典武侠',
    typicalLength: '100-300万字',
    keyElements: ['武功', '江湖', '门派', '侠义'],
  },
  {
    id: 'litrpg',
    name: 'LITRPG',
    icon: '🎮',
    description: '游戏化小说',
    typicalLength: '100-400万字',
    keyElements: ['属性面板', '等级', '副本', '技能'],
  },
  {
    id: 'qihuan',
    name: '奇幻',
    icon: '🐉',
    description: '西方奇幻',
    typicalLength: '100-400万字',
    keyElements: ['魔法', '种族', '王国', '冒险'],
  },
  {
    id: 'junshi',
    name: '军事',
    icon: '🎖️',
    description: '军事战争',
    typicalLength: '100-300万字',
    keyElements: ['战争', '军队', '战术', '英雄'],
  },
  {
    id: 'tongren',
    name: '同人',
    icon: '🎭',
    description: '同人创作',
    typicalLength: '50-200万字',
    keyElements: ['原著角色', '原著世界观', '二创'],
  },
  {
    id: 'danyuan',
    name: '短篇',
    icon: '📄',
    description: '短篇/中篇',
    typicalLength: '1-10万字',
    keyElements: ['精炼', '完整弧光', '单一主题'],
  },
  {
    id: 'qita',
    name: '其他',
    icon: '📝',
    description: '其他题材',
    typicalLength: '不限',
    keyElements: [],
  },
]

export function getGenrePreset(id: string): GenrePreset | undefined {
  return GENRE_PRESETS.find((g) => g.id === id)
}
