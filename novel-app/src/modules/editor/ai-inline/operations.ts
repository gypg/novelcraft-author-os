export interface AiOperation {
  name: string
  label: string
  prompt: string
}

export const AI_OPERATIONS: Record<string, AiOperation> = {
  polish: {
    name: 'polish',
    label: '润色',
    prompt:
      '请润色以下文字，保持原意但提升文学性和表达力。不要添加任何解释，直接输出润色后的文字。',
  },
  rewrite: {
    name: 'rewrite',
    label: '改写',
    prompt:
      '请用完全不同的表达方式改写以下文字，保持意思不变但让文字焕然一新。不要添加任何解释，直接输出改写后的文字。',
  },
  deai: {
    name: 'deai',
    label: '去AI味',
    prompt:
      '请将以下AI生成的文字改写为更自然的人类写作风格。去掉所有AI写作的典型痕迹（过渡词过多、句式单一、情感直白、总结句倾向等），让文字更像真人写的。直接输出改写后的文字，不要加任何解释。',
  },
  translate: {
    name: 'translate',
    label: '翻译',
    prompt:
      '请将以下中文翻译为地道的英文。保持原文的语气和风格。直接输出翻译结果，不要加任何解释。',
  },
}
