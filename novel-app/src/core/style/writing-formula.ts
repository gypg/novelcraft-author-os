import { callLlmForSwarm } from '@/core/ai-engine/modes/swarm-engine'
import { repairJson } from '@/core/ai-engine/modes/swarm-engine'
import { logger } from '@/shared/utils/logger'

export interface WritingFormula {
  id: string
  name: string
  sourceText: string
  techniques: {
    syntax: string[]
    narrative: string[]
    emotion: string[]
    structure: string[]
    dialogue: string[]
  }
  antiPatterns: string[]
  targetGenre: string
}

const EXTRACTION_PROMPT = `你是一个文学技法分析专家。请分析以下文本的写作技法，从 5 个维度提取特征。

输出格式（JSON）：
{
  "techniques": {
    "syntax": ["句法技法1", "句法技法2"],
    "narrative": ["叙事技法1"],
    "emotion": ["情感技法1"],
    "structure": ["结构技法1"],
    "dialogue": ["对话技法1"]
  },
  "antiPatterns": ["应避免的模式1"],
  "targetGenre": "最匹配的题材"
}

技法说明：
- syntax: 句式特点（短句密集/长句铺陈/碎片化等）
- narrative: 叙事手法（视角切换/时间跳跃/信息投喂节奏等）
- emotion: 情感表达（间接暗示/环境烘托/行为传达等）
- structure: 结构特征（场景切换/章末钩子/伏笔方式等）
- dialogue: 对话风格（口语化/潜台词/打断省略等）

只输出 JSON，不要添加其他文字。`

export const PRESET_FORMULAS: Record<string, Partial<WritingFormula>> = {
  '天蚕土豆式': {
    name: '天蚕土豆式',
    targetGenre: '玄幻修仙',
    techniques: {
      syntax: ['短句密集推进', '排比递进', '感叹句收尾'],
      narrative: ['升级节奏明快', '金手指明确展示', '对手递进式登场'],
      emotion: ['爽感驱动', '危机→逆转→更强'],
      structure: ['每章至少一个小高潮', '章末悬念钩子', '战力体系明确'],
      dialogue: ['霸气宣言', '对手嘲讽→打脸', '简洁有力'],
    },
    antiPatterns: ['过度描写环境', '内心独白过长', '节奏拖沓'],
  },
  '辰东式': {
    name: '辰东式',
    targetGenre: '玄幻修仙',
    techniques: {
      syntax: ['长短句交替', '排比渲染气势'],
      narrative: ['宏大世界观铺陈', '伏笔深远', '多线并行'],
      emotion: ['苍凉壮阔', '史诗感', '宿命感'],
      structure: ['大场景开篇', '层层揭秘', '伏笔回收跨度大'],
      dialogue: ['充满哲理', '古风用语', '意味深长'],
    },
    antiPatterns: ['节奏过快失去厚重感', '设定解释过于直白'],
  },
  '猫腻式': {
    name: '猫腻式',
    targetGenre: '都市异能/仙侠',
    techniques: {
      syntax: ['灵活多变', '对话节奏紧凑'],
      narrative: ['人物驱动情节', '多视角切换', '黑色幽默'],
      emotion: ['克制内敛', '通过行为暗示情感', '温暖中带忧伤'],
      structure: ['小事件串联大格局', '日常与冲突交替', '角色成长弧光清晰'],
      dialogue: ['机智幽默', '潜台词丰富', '性格化表达'],
    },
    antiPatterns: ['过度说教', '角色行为矛盾', '情感直白化'],
  },
  '桐华式': {
    name: '桐华式',
    targetGenre: '现代言情',
    techniques: {
      syntax: ['细腻长句', '感官描写丰富'],
      narrative: ['情感线为主线', '回忆穿插', '双视角叙事'],
      emotion: ['细腻入微', '虐心设计', '含蓄表达'],
      structure: ['情感起伏节奏', '回忆与现实交织', '伏笔用于情感转折'],
      dialogue: ['内心独白丰富', '对话含蓄', '沉默比言语有力'],
    },
    antiPatterns: ['情感过度渲染', '情节推动不足', '配角功能单一'],
  },
  '唐家三少式': {
    name: '唐家三少式',
    targetGenre: '玄幻修仙',
    techniques: {
      syntax: ['简洁明快', '短句推进', '节奏紧凑'],
      narrative: ['升级体系清晰', '战斗描写细腻', '兄弟情义'],
      emotion: ['热血激昂', '情义深重', '温暖治愈'],
      structure: ['线性叙事', '副本式推进', '每章高潮'],
      dialogue: ['热血宣言', '兄弟对话', '简洁有力'],
    },
    antiPatterns: ['过度拖沓', '复杂设定堆砌'],
  },
  '梦入神机式': {
    name: '梦入神机式',
    targetGenre: '玄幻修仙',
    techniques: {
      syntax: ['长短句交替', '气势磅礴'],
      narrative: ['宏大世界观', '多线并行', '格局恢弘'],
      emotion: ['苍凉壮阔', '英雄主义', '悲壮感'],
      structure: ['大开大合', '伏笔宏大', '世界观铺陈'],
      dialogue: ['霸气外露', '意味深长', '古风典雅'],
    },
    antiPatterns: ['格局太小', '节奏拖沓'],
  },
  '烽火戏诸侯式': {
    name: '烽火戏诸侯式',
    targetGenre: '玄幻修仙',
    techniques: {
      syntax: ['文采飞扬', '华丽铺陈', '典故引用'],
      narrative: ['权谋与热血并存', '多线叙事', '人物群像'],
      emotion: ['豪情万丈', '兄弟情义', '家国情怀'],
      structure: ['大格局展开', '层层递进', '伏笔深远'],
      dialogue: ['文采斐然', '意味深长', '气势恢宏'],
    },
    antiPatterns: ['过度炫文采', '节奏失控'],
  },
  '我吃西红柿式': {
    name: '我吃西红柿式',
    targetGenre: '都市异能',
    techniques: {
      syntax: ['节奏明快', '短句密集', '冲突密集'],
      narrative: ['反转多', '升级爽感', '打脸设计'],
      emotion: ['爽感驱动', '逆袭快感', '满足感'],
      structure: ['密集冲突', '快速推进', '每章有爽点'],
      dialogue: ['简洁直接', '霸气宣言', '嘲讽打脸'],
    },
    antiPatterns: ['节奏拖沓', '情感描写过长'],
  },
  '鱼人二代式': {
    name: '鱼人二代式',
    targetGenre: '都市异能',
    techniques: {
      syntax: ['口语化', '轻松幽默', '对话驱动'],
      narrative: ['校园生活', '异能觉醒', '热血战斗'],
      emotion: ['轻松诙谐', '热血', '友情'],
      structure: ['日常与战斗交替', '节奏明快'],
      dialogue: ['口语化', '幽默', '接地气'],
    },
    antiPatterns: ['过于严肃', '设定复杂'],
  },
  '南派三叔式': {
    name: '南派三叔式',
    targetGenre: '悬疑推理',
    techniques: {
      syntax: ['悬疑铺垫', '短句制造紧张', '信息碎片化'],
      narrative: ['多线悬疑', '层层揭秘', '反转再反转'],
      emotion: ['紧张压抑', '恐惧感', '好奇驱动'],
      structure: ['谜题嵌套', '时间线交错', '章末钩子强'],
      dialogue: ['神秘暗示', '信息不对称', '紧张对话'],
    },
    antiPatterns: ['过早揭秘', '节奏失控', '设定矛盾'],
  },
  '天下霸唱式': {
    name: '天下霸唱式',
    targetGenre: '悬疑推理',
    techniques: {
      syntax: ['氛围营造', '细节描写丰富', '环境烘托'],
      narrative: ['探险叙事', '民间传说融合', '历史线索'],
      emotion: ['神秘诡异', '紧张刺激', '探索好奇'],
      structure: ['线索串联', '层层深入', '历史与现实交织'],
      dialogue: ['民间口语', '神秘暗示', '紧张对白'],
    },
    antiPatterns: ['恐怖过度', '逻辑漏洞'],
  },
  '月关式': {
    name: '月关式',
    targetGenre: '历史架空',
    techniques: {
      syntax: ['历史感强', '古风用语', '典雅庄重'],
      narrative: ['历史融入', '权谋智斗', '人物刻画深'],
      emotion: ['厚重感', '历史沧桑', '英雄气概'],
      structure: ['历史框架', '事件驱动', '人物成长'],
      dialogue: ['古风典雅', '权谋对话', '意味深长'],
    },
    antiPatterns: ['考据错误', '节奏拖沓'],
  },
  '墨香铜臭式': {
    name: '墨香铜臭式',
    targetGenre: '言情',
    techniques: {
      syntax: ['细腻流畅', '情感丰富', '画面感强'],
      narrative: ['双主角视角', '情感线为主', '世界观宏大'],
      emotion: ['细腻入微', '虐心与甜交织', '深情'],
      structure: ['情感弧线完整', '伏笔用于情感', '回忆穿插'],
      dialogue: ['含蓄深情', '机智幽默', '性格化'],
    },
    antiPatterns: ['过度虐心', '节奏拖沓'],
  },
  'priest式': {
    name: 'priest式',
    targetGenre: '奇幻',
    techniques: {
      syntax: ['简洁有力', '冷幽默', '哲理穿插'],
      narrative: ['双线叙事', '权谋与情感', '世界观宏大'],
      emotion: ['克制深沉', '冷幽默', '温暖内核'],
      structure: ['悬念驱动', '信息投喂精准', '角色成长清晰'],
      dialogue: ['冷幽默', '意味深长', '简洁犀利'],
    },
    antiPatterns: ['过度深沉', '节奏过慢'],
  },
  '御井烹香式': {
    name: '御井烹香式',
    targetGenre: '古代言情',
    techniques: {
      syntax: ['古风细腻', '场景描写精致', '情感含蓄'],
      narrative: ['古代背景', '宅斗权谋', '情感含蓄'],
      emotion: ['含蓄深情', '温暖治愈', '细腻动人'],
      structure: ['日常与冲突交替', '情感渐进', '伏笔自然'],
      dialogue: ['古风用语', '含蓄表达', '机智对话'],
    },
    antiPatterns: ['过度狗血', '节奏拖沓'],
  },
  '金庸式': {
    name: '金庸式',
    targetGenre: '武侠',
    techniques: {
      syntax: ['典雅庄重', '文白相间', '气势恢宏'],
      narrative: ['侠义精神', '江湖格局', '武功体系'],
      emotion: ['侠骨柔情', '家国情怀', '悲壮感'],
      structure: ['大格局展开', '多线并行', '伏笔宏大'],
      dialogue: ['古风典雅', '豪气干云', '意味深长'],
    },
    antiPatterns: ['过度说教', '节奏拖沓'],
  },
  '古龙式': {
    name: '古龙式',
    targetGenre: '武侠',
    techniques: {
      syntax: ['短句如刀', '节奏极快', '留白艺术'],
      narrative: ['悬疑推理', '心理描写', '意境营造'],
      emotion: ['孤独感', '冷峻', '诗意'],
      structure: ['短章快节奏', '悬念密集', '反转惊人'],
      dialogue: ['简洁犀利', '充满禅意', '暗藏机锋'],
    },
    antiPatterns: ['过度拖沓', '描写过多'],
  },
  '黄易式': {
    name: '黄易式',
    targetGenre: '玄幻修仙',
    techniques: {
      syntax: ['宏大叙事', '古风用语', '哲学思辨'],
      narrative: ['时空穿越', '历史融合', '武道哲学'],
      emotion: ['苍凉厚重', '宿命感', '探索精神'],
      structure: ['多时空交织', '宏大格局', '哲学探讨'],
      dialogue: ['哲理深邃', '古风典雅', '意味深长'],
    },
    antiPatterns: ['节奏过慢', '哲学过度'],
  },
  '萧鼎式': {
    name: '萧鼎式',
    targetGenre: '玄幻修仙',
    techniques: {
      syntax: ['细腻抒情', '画面感强', '意境优美'],
      narrative: ['仙侠世界', '情感主线', '宿命纠葛'],
      emotion: ['深情', '悲壮', '浪漫'],
      structure: ['情感驱动', '伏笔深远', '格局宏大'],
      dialogue: ['含蓄深情', '仙侠风格', '意味深长'],
    },
    antiPatterns: ['节奏拖沓', '结局仓促'],
  },
  '顾漫式': {
    name: '顾漫式',
    targetGenre: '现代言情',
    techniques: {
      syntax: ['轻松幽默', '对话精彩', '节奏明快'],
      narrative: ['甜宠为主线', '误会与和解', '双向暗恋'],
      emotion: ['甜蜜温馨', '轻松愉快', '温暖治愈'],
      structure: ['甜宠节奏', '日常与冲突交替', 'HE 结局'],
      dialogue: ['机智幽默', '甜蜜互动', '自然流畅'],
    },
    antiPatterns: ['过度甜腻', '配角工具化'],
  },
  '匪我思存式': {
    name: '匪我思存式',
    targetGenre: '现代言情',
    techniques: {
      syntax: ['细腻忧伤', '意象丰富', '文学性强'],
      narrative: ['虐恋为主线', '误会重重', '悲剧美学'],
      emotion: ['虐心', '悲伤', '刻骨铭心'],
      structure: ['虐心节奏', '回忆穿插', 'BE/HE 设计'],
      dialogue: ['含蓄深情', '文学化', '诗意'],
    },
    antiPatterns: ['过度虐心', '逻辑漏洞'],
  },
  '蒋胜男式': {
    name: '蒋胜男式',
    targetGenre: '历史架空',
    techniques: {
      syntax: ['历史感强', '考据严谨', '叙事宏大'],
      narrative: ['历史还原', '权谋智斗', '女性视角'],
      emotion: ['厚重感', '历史沧桑', '女性力量'],
      structure: ['历史框架', '人物群像', '事件驱动'],
      dialogue: ['古风用语', '权谋对话', '考据准确'],
    },
    antiPatterns: ['考据过度', '节奏拖沓'],
  },
  '流潋紫式': {
    name: '流潋紫式',
    targetGenre: '古代言情',
    techniques: {
      syntax: ['古风细腻', '场景精致', '情感含蓄'],
      narrative: ['宫廷背景', '权谋与情感', '女性群像'],
      emotion: ['含蓄深情', '隐忍与爆发', '宫廷冷暖'],
      structure: ['宫廷权力线', '情感暗线', '伏笔自然'],
      dialogue: ['古风用语', '含蓄表达', '暗藏机锋'],
    },
    antiPatterns: ['过度宫斗', '角色脸谱化'],
  },
  '紫金陈式': {
    name: '紫金陈式',
    targetGenre: '悬疑推理',
    techniques: {
      syntax: ['逻辑严密', '信息密集', '节奏紧凑'],
      narrative: ['社会派推理', '多视角叙事', '现实主义'],
      emotion: ['紧张压抑', '人性探讨', '黑色幽默'],
      structure: ['多线并行', '层层揭秘', '结局反转'],
      dialogue: ['简洁有力', '暗藏线索', '社会写实'],
    },
    antiPatterns: ['逻辑漏洞', '推理牵强'],
  },
  '辛夷坞式': {
    name: '辛夷坞式',
    targetGenre: '现代言情',
    techniques: {
      syntax: ['细腻流畅', '青春感强', '情感真挚'],
      narrative: ['青春成长', '爱情与现实', '时间跨度大'],
      emotion: ['青春感伤', '遗憾之美', '成长阵痛'],
      structure: ['时间线跨度', '回忆与现实', '成长弧光'],
      dialogue: ['青春气息', '自然真实', '情感直白'],
    },
    antiPatterns: ['过度伤感', '情节拖沓'],
  },
  '唐七式': {
    name: '唐七式',
    targetGenre: '仙侠言情',
    techniques: {
      syntax: ['古风华丽', '意境优美', '文采飞扬'],
      narrative: ['仙侠世界', '虐恋为主', '命运纠葛'],
      emotion: ['虐心', '深情', '宿命感'],
      structure: ['前世今生', '虐心节奏', '大格局收束'],
      dialogue: ['古风典雅', '深情含蓄', '诗意'],
    },
    antiPatterns: ['过度虐心', '设定堆砌'],
  },
  '天下归元式': {
    name: '天下归元式',
    targetGenre: '古代言情',
    techniques: {
      syntax: ['大气磅礴', '权谋感强', '古风庄重'],
      narrative: ['权谋与情感', '女性成长', '家国天下'],
      emotion: ['大气', '深情', '家国情怀'],
      structure: ['权谋线+情感线', '格局宏大', '人物成长'],
      dialogue: ['古风用语', '权谋对话', '大气磅礴'],
    },
    antiPatterns: ['权谋过度', '情感弱化'],
  },
  '藤萍式': {
    name: '藤萍式',
    targetGenre: '奇幻',
    techniques: {
      syntax: ['古风细腻', '意境深远', '文学性强'],
      narrative: ['奇幻世界', '宿命与选择', '多角色视角'],
      emotion: ['宿命感', '深沉', '哲理'],
      structure: ['多线叙事', '命运交织', '结局震撼'],
      dialogue: ['古风用语', '意味深长', '哲理思辨'],
    },
    antiPatterns: ['节奏过慢', '设定复杂'],
  },
  '九鹭非香式': {
    name: '九鹭非香式',
    targetGenre: '仙侠言情',
    techniques: {
      syntax: ['轻松幽默', '对话精彩', '节奏明快'],
      narrative: ['仙侠背景', '甜宠+虐', '人物鲜明'],
      emotion: ['轻松诙谐', '深情', '温暖'],
      structure: ['甜虐交替', '节奏明快', '人物驱动'],
      dialogue: ['机智幽默', '甜蜜互动', '性格化'],
    },
    antiPatterns: ['过度甜腻', '设定薄弱'],
  },
  '非天夜翔式': {
    name: '非天夜翔式',
    targetGenre: '古代言情',
    techniques: {
      syntax: ['古风自然', '场景细腻', '情感含蓄'],
      narrative: ['古代背景', '权谋暗线', '情感主线'],
      emotion: ['含蓄深情', '温暖治愈', '细腻动人'],
      structure: ['日常与权谋交替', '情感渐进', '伏笔自然'],
      dialogue: ['古风用语', '含蓄表达', '机智对话'],
    },
    antiPatterns: ['节奏拖沓', '权谋过度'],
  },
  '丁墨式': {
    name: '丁墨式',
    targetGenre: '悬疑推理',
    techniques: {
      syntax: ['节奏紧凑', '信息密集', '反转频繁'],
      narrative: ['悬疑+言情', '案件推进', '感情暗线'],
      emotion: ['紧张刺激', '甜蜜温馨', '反转惊喜'],
      structure: ['案件驱动', '感情暗线', '结局反转'],
      dialogue: ['简洁有力', '暗藏线索', '甜蜜互动'],
    },
    antiPatterns: ['推理牵强', '感情突兀'],
  },
}

export interface GenreProfile {
  id: string
  name: string
  category: string
  coreElements: string[]
  pacing: string
  readerHook: string
  coolPointType: string
  antiPatterns: string[]
}

export const GENRE_PROFILES: GenreProfile[] = [
  { id: 'xuanhuan', name: '玄幻', category: '男频', coreElements: ['修炼体系', '金手指', '升级打怪', '势力对抗'], pacing: '快节奏爽文', readerHook: '升级期待+打脸爽感', coolPointType: '逆袭打脸', antiPatterns: ['节奏拖沓', '金手指太弱'] },
  { id: 'xianxia', name: '仙侠', category: '男频', coreElements: ['仙道修炼', '法宝丹药', '宗门争斗', '长生追求'], pacing: '中速偏快', readerHook: '修仙境界突破+法宝获得', coolPointType: '境界突破', antiPatterns: ['设定矛盾', '战力崩坏'] },
  { id: 'dushi', name: '都市', category: '男频', coreElements: ['现代背景', '商战/异能', '社会关系', '逆袭'], pacing: '快节奏', readerHook: '现实代入+逆袭爽感', coolPointType: '装逼打脸', antiPatterns: ['脱离现实', '逻辑漏洞'] },
  { id: 'kehuan', name: '科幻', category: '男频', coreElements: ['科技设定', '未来世界', '太空探索', '人工智能'], pacing: '中速', readerHook: '世界观新奇+科技奇观', coolPointType: '科技突破', antiPatterns: ['设定不自洽', '硬伤'] },
  { id: 'xuanyi', name: '悬疑', category: '通用', coreElements: ['谜题设计', '线索铺设', '反转揭秘', '逻辑推理'], pacing: '紧凑', readerHook: '好奇心驱动+反转惊喜', coolPointType: '真相揭晓', antiPatterns: ['逻辑漏洞', '过早揭秘'] },
  { id: 'kongbu', name: '恐怖', category: '通用', coreElements: ['氛围营造', '心理恐惧', '未知威胁', '求生'], pacing: '张弛有度', readerHook: '恐惧感+好奇心', coolPointType: '恐怖反转', antiPatterns: ['恐怖过度', '逻辑崩坏'] },
  { id: 'lishi', name: '历史', category: '男频', coreElements: ['历史背景', '权谋智斗', '人物群像', '考据严谨'], pacing: '中速', readerHook: '历史代入+权谋博弈', coolPointType: '以弱胜强', antiPatterns: ['考据错误', '节奏拖沓'] },
  { id: 'yanqing_m', name: '言情(男)', category: '男频', coreElements: ['恋爱主线', '后宫/单女主', '情感冲突', '甜蜜互动'], pacing: '中速', readerHook: '情感代入+甜蜜爽感', coolPointType: '告白/确认关系', antiPatterns: ['过度虐心', '角色工具化'] },
  { id: 'wuxia', name: '武侠', category: '男频', coreElements: ['江湖格局', '武功体系', '侠义精神', '恩怨情仇'], pacing: '中速', readerHook: '侠义情怀+武学突破', coolPointType: '武功大成', antiPatterns: ['设定矛盾', '节奏拖沓'] },
  { id: 'litrpg', name: 'LITRPG', category: '男频', coreElements: ['游戏系统', '数值成长', '副本挑战', '装备获取'], pacing: '快节奏', readerHook: '数值成长+系统奖励', coolPointType: '升级/获得稀有装备', antiPatterns: ['数值膨胀', '系统无意义'] },
  { id: 'youxi', name: '游戏', category: '男频', coreElements: ['虚拟世界', '游戏机制', '竞技对抗', '团队合作'], pacing: '快节奏', readerHook: '游戏代入+竞技爽感', coolPointType: '逆风翻盘', antiPatterns: ['脱离游戏逻辑', '设定矛盾'] },
  { id: 'junshi', name: '军事', category: '男频', coreElements: ['战争场面', '军事策略', '兄弟情义', '家国情怀'], pacing: '紧凑', readerHook: '热血+策略博弈', coolPointType: '以少胜多', antiPatterns: ['军事常识错误', '过度说教'] },
  { id: 'qihuan', name: '奇幻', category: '通用', coreElements: ['魔法体系', '种族设定', '冒险旅程', '善恶对抗'], pacing: '中速', readerHook: '世界观探索+冒险', coolPointType: '魔法突破', antiPatterns: ['设定堆砌', '节奏拖沓'] },
  { id: 'tongren', name: '同人', category: '通用', coreElements: ['原作设定', '角色再创作', '剧情扩展', 'CP互动'], pacing: '灵活', readerHook: '原作情怀+新剧情', coolPointType: '名场面再现', antiPatterns: ['OOC', '脱离原作设定'] },
  { id: 'xianshi', name: '现实', category: '通用', coreElements: ['现实背景', '社会问题', '人物成长', '生活细节'], pacing: '慢节奏', readerHook: '共鸣感+人物命运', coolPointType: '人生转折', antiPatterns: ['说教过重', '脱离现实'] },
  { id: 'yanqing_f', name: '言情(女)', category: '女频', coreElements: ['情感主线', '人物塑造', '情感冲突', '甜蜜互动'], pacing: '中速偏慢', readerHook: '情感代入+心动瞬间', coolPointType: '告白/确认关系', antiPatterns: ['过度虐心', '角色脸谱化'] },
  { id: 'gudai_yanqing', name: '古代言情', category: '女频', coreElements: ['古代背景', '宫廷/宅斗', '权谋与情感', '女性成长'], pacing: '中速', readerHook: '古风美感+情感纠葛', coolPointType: '情感突破/权力反转', antiPatterns: ['过度宫斗', '角色脸谱化'] },
  { id: 'xianxia_yanqing', name: '仙侠言情', category: '女频', coreElements: ['仙侠世界', '虐恋深情', '命运纠葛', '前世今生'], pacing: '中速', readerHook: '虐心+深情', coolPointType: '生死相守/真相揭晓', antiPatterns: ['过度虐心', '设定堆砌'] },
  { id: 'dushi_yanqing', name: '都市言情', category: '女频', coreElements: ['现代背景', '职场/校园', '甜蜜互动', '成长蜕变'], pacing: '中速偏快', readerHook: '甜蜜代入+心动', coolPointType: '告白/甜蜜互动', antiPatterns: ['过度甜腻', '脱离现实'] },
  { id: 'xuanyi_yanqing', name: '悬疑言情', category: '女频', coreElements: ['悬疑案件', '感情暗线', '反转揭秘', '双线并行'], pacing: '紧凑', readerHook: '好奇心+心动', coolPointType: '真相+告白', antiPatterns: ['推理牵强', '感情突兀'] },
  { id: 'chuanyue', name: '穿越', category: '女频', coreElements: ['穿越设定', '现代知识', '古代适应', '逆袭成长'], pacing: '快节奏', readerHook: '现代视角+古代逆袭', coolPointType: '知识碾压/身份反转', antiPatterns: ['设定矛盾', '历史错误'] },
  { id: 'chongsheng', name: '重生', category: '女频', coreElements: ['重生设定', '前世记忆', '改变命运', '复仇/救赎'], pacing: '快节奏', readerHook: '先知优势+复仇爽感', coolPointType: '前世真相/复仇成功', antiPatterns: ['逻辑漏洞', '过度复仇'] },
]

export function getGenreProfileByName(name: string): GenreProfile | undefined {
  return GENRE_PROFILES.find((g) => g.name === name)
}

export function getFormulasByGenre(genre: string): Partial<WritingFormula>[] {
  return Object.values(PRESET_FORMULAS).filter((f) => f.targetGenre?.includes(genre))
}

export async function extractFormula(
  text: string,
  name: string,
): Promise<WritingFormula> {
  logger.info('writing-formula', `Extracting formula from ${text.length} chars`)

  try {
    const output = await callLlmForSwarm(
      EXTRACTION_PROMPT,
      `请分析以下文本的写作技法：\n\n${text.slice(0, 3000)}`,
      'auditor',
      { temperature: 0.3, maxTokens: 1500 },
    )

    const repaired = repairJson(output)
    const parsed = JSON.parse(repaired)

    return {
      id: crypto.randomUUID(),
      name,
      sourceText: text.slice(0, 500),
      techniques: {
        syntax: Array.isArray(parsed.techniques?.syntax) ? parsed.techniques.syntax : [],
        narrative: Array.isArray(parsed.techniques?.narrative) ? parsed.techniques.narrative : [],
        emotion: Array.isArray(parsed.techniques?.emotion) ? parsed.techniques.emotion : [],
        structure: Array.isArray(parsed.techniques?.structure) ? parsed.techniques.structure : [],
        dialogue: Array.isArray(parsed.techniques?.dialogue) ? parsed.techniques.dialogue : [],
      },
      antiPatterns: Array.isArray(parsed.antiPatterns) ? parsed.antiPatterns : [],
      targetGenre: typeof parsed.targetGenre === 'string' ? parsed.targetGenre : '',
    }
  } catch (err) {
    logger.error('writing-formula', `Extraction failed: ${err}`)
    return {
      id: crypto.randomUUID(),
      name,
      sourceText: text.slice(0, 500),
      techniques: { syntax: [], narrative: [], emotion: [], structure: [], dialogue: [] },
      antiPatterns: [],
      targetGenre: '',
    }
  }
}

export function buildFormulaPrompt(formula: WritingFormula): string {
  const parts = ['## 写法配方']

  for (const [category, techniques] of Object.entries(formula.techniques)) {
    if (techniques.length > 0) {
      const labels: Record<string, string> = {
        syntax: '句法', narrative: '叙事', emotion: '情感',
        structure: '结构', dialogue: '对话',
      }
      parts.push(`- ${labels[category] || category}：${techniques.join('、')}`)
    }
  }

  if (formula.antiPatterns.length > 0) {
    parts.push(`- 避免：${formula.antiPatterns.join('、')}`)
  }

  parts.push(`- 题材：${formula.targetGenre}`)

  return parts.join('\n')
}
