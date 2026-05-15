export type ProviderCategory = 'direct' | 'tokenplan'

export type ApiFormat = 'openai' | 'anthropic' | 'gemini'

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'minimax'
  | 'minimax_en'
  | 'moonshot'
  | 'moonshot_coding'
  | 'zhipu'
  | 'zhipu_en'
  | 'qwen'
  | 'qwen_coding'
  | 'baichuan'
  | 'yi'
  | 'doubao'
  | 'stepfun'
  | 'stepfun_en'
  | 'hunyuan'
  | 'baidu'
  | 'baidu_coding'
  | 'mimo'
  | 'groq'
  | 'mistral'
  | 'perplexity'
  | 'grok'
  | 'nvidia'
  | 'cerebras'
  | 'together'
  | 'fireworks'
  | 'ollama'
  | 'lmstudio'
  | 'siliconflow'
  | 'siliconflow_en'
  | 'openrouter'
  | 'therouter'
  | 'aihubmix'
  | '302ai'
  | 'dmxapi'
  | 'modelscope'
  | 'longcat'
  | 'ppio'
  | 'novita'
  | 'pipellm'
  | 'shengsuanyun'
  | 'compshare'
  | 'compshare_coding'
  | 'katcoder'
  | 'bailing'
  | 'packycode'
  | 'cubence'
  | 'aigocode'
  | 'rightcode'
  | 'aicodemirror'
  | 'aicoding'
  | 'crazyrouter'
  | 'sssaicode'
  | 'micu'
  | 'ctok'
  | 'ddshub'
  | 'eflowcode'
  | 'lionccapi'
  | 'lemondata'
  | 'github_copilot'
  | 'codex'
  | 'aws_bedrock'
  | 'custom'

export interface ModelPreset {
  id: string
  label: string
  maxTokens?: number
}

export interface ProviderPreset {
  type: ProviderType
  category: ProviderCategory
  label: string
  baseUrl: string
  anthropicBaseUrl?: string
  apiFormat: ApiFormat
  icon: string
  color: string
  models: ModelPreset[]
  defaultModel: string
  websiteUrl?: string
  apiKeyUrl?: string
  modelsUrl?: string
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    type: 'openai',
    category: 'direct',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiFormat: 'openai',
    icon: '🤖',
    color: '#00A67E',
    defaultModel: 'gpt-4o',
    websiteUrl: 'https://platform.openai.com',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', maxTokens: 128000 },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', maxTokens: 128000 },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', maxTokens: 16385 },
      { id: 'o1', label: 'o1', maxTokens: 200000 },
      { id: 'o1-mini', label: 'o1 Mini', maxTokens: 128000 },
      { id: 'o3-mini', label: 'o3 Mini', maxTokens: 200000 },
    ],
  },
  {
    type: 'anthropic',
    category: 'direct',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiFormat: 'anthropic',
    icon: '🧠',
    color: '#D4915D',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://console.anthropic.com',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', maxTokens: 200000 },
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', maxTokens: 200000 },
      { id: 'claude-haiku-3-5-20241022', label: 'Claude 3.5 Haiku', maxTokens: 200000 },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', maxTokens: 200000 },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', maxTokens: 200000 },
    ],
  },
  {
    type: 'google',
    category: 'direct',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiFormat: 'gemini',
    icon: '✨',
    color: '#4285F4',
    defaultModel: 'gemini-2.5-pro',
    websiteUrl: 'https://aistudio.google.com',
    models: [
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', maxTokens: 1048576 },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', maxTokens: 1048576 },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', maxTokens: 1048576 },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', maxTokens: 2097152 },
    ],
  },
  {
    type: 'deepseek',
    category: 'direct',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    anthropicBaseUrl: 'https://api.deepseek.com/anthropic',
    apiFormat: 'openai',
    icon: '🔍',
    color: '#1E88E5',
    defaultModel: 'deepseek-chat',
    websiteUrl: 'https://platform.deepseek.com',
    modelsUrl: 'https://api.deepseek.com/models',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3', maxTokens: 65536 },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1', maxTokens: 65536 },
    ],
  },
  {
    type: 'minimax',
    category: 'direct',
    label: 'MiniMax (国内)',
    baseUrl: 'https://api.minimaxi.com/v1',
    anthropicBaseUrl: 'https://api.minimaxi.com/anthropic',
    apiFormat: 'openai',
    icon: '🎯',
    color: '#FF6B6B',
    defaultModel: 'MiniMax-Text-01',
    websiteUrl: 'https://platform.minimaxi.com',
    apiKeyUrl: 'https://platform.minimaxi.com/subscribe/coding-plan',
    models: [
      { id: 'MiniMax-Text-01', label: 'MiniMax-Text-01', maxTokens: 1048576 },
      { id: 'MiniMax-M2.7', label: 'MiniMax M2.7', maxTokens: 131072 },
      { id: 'abab-6.5s-chat', label: 'ABAB 6.5s', maxTokens: 131072 },
      { id: 'abab-6.5t-chat', label: 'ABAB 6.5t', maxTokens: 131072 },
    ],
  },
  {
    type: 'minimax_en',
    category: 'direct',
    label: 'MiniMax (国际)',
    baseUrl: 'https://api.minimax.io/v1',
    anthropicBaseUrl: 'https://api.minimax.io/anthropic',
    apiFormat: 'openai',
    icon: '🎯',
    color: '#FF6B6B',
    defaultModel: 'MiniMax-Text-01',
    websiteUrl: 'https://platform.minimax.io',
    apiKeyUrl: 'https://platform.minimax.io/subscribe/coding-plan',
    models: [
      { id: 'MiniMax-Text-01', label: 'MiniMax-Text-01', maxTokens: 1048576 },
      { id: 'MiniMax-M2.7', label: 'MiniMax M2.7', maxTokens: 131072 },
    ],
  },
  {
    type: 'moonshot',
    category: 'direct',
    label: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn',
    anthropicBaseUrl: 'https://api.moonshot.cn/anthropic',
    apiFormat: 'openai',
    icon: '🌙',
    color: '#6366F1',
    defaultModel: 'moonshot-v1-128k',
    websiteUrl: 'https://platform.moonshot.cn',
    models: [
      { id: 'moonshot-v1-128k', label: 'Moonshot V1 128K', maxTokens: 131072 },
      { id: 'moonshot-v1-32k', label: 'Moonshot V1 32K', maxTokens: 32768 },
      { id: 'moonshot-v1-8k', label: 'Moonshot V1 8K', maxTokens: 8192 },
      { id: 'kimi-k2.5', label: 'Kimi K2.5', maxTokens: 131072 },
      { id: 'kimi-k2.6', label: 'Kimi K2.6', maxTokens: 131072 },
    ],
  },
  {
    type: 'moonshot_coding',
    category: 'direct',
    label: 'Kimi For Coding',
    baseUrl: 'https://api.kimi.com/coding',
    apiFormat: 'anthropic',
    icon: '🌙',
    color: '#6366F1',
    defaultModel: 'kimi-k2.6',
    websiteUrl: 'https://www.kimi.com/code/docs/',
    models: [
      { id: 'kimi-k2.6', label: 'Kimi K2.6', maxTokens: 131072 },
    ],
  },
  {
    type: 'zhipu',
    category: 'direct',
    label: '智谱 (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    anthropicBaseUrl: 'https://open.bigmodel.cn/api/anthropic',
    apiFormat: 'openai',
    icon: '🔮',
    color: '#0F62FE',
    defaultModel: 'glm-4-plus',
    websiteUrl: 'https://open.bigmodel.cn',
    apiKeyUrl: 'https://www.bigmodel.cn/claude-code?ic=RRVJPB5SII',
    models: [
      { id: 'glm-4-plus', label: 'GLM-4 Plus', maxTokens: 131072 },
      { id: 'glm-5', label: 'GLM-5', maxTokens: 131072 },
      { id: 'glm-4-0520', label: 'GLM-4', maxTokens: 131072 },
      { id: 'glm-4-air', label: 'GLM-4 Air', maxTokens: 131072 },
      { id: 'glm-4-flash', label: 'GLM-4 Flash', maxTokens: 131072 },
      { id: 'glm-4-long', label: 'GLM-4 Long', maxTokens: 1048576 },
    ],
  },
  {
    type: 'zhipu_en',
    category: 'direct',
    label: '智谱 (z.ai 国际)',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    anthropicBaseUrl: 'https://api.z.ai/api/anthropic',
    apiFormat: 'openai',
    icon: '🔮',
    color: '#0F62FE',
    defaultModel: 'glm-5',
    websiteUrl: 'https://z.ai',
    apiKeyUrl: 'https://z.ai/subscribe?ic=8JVLJQFSKB',
    models: [
      { id: 'glm-5', label: 'GLM-5', maxTokens: 131072 },
    ],
  },
  {
    type: 'qwen',
    category: 'direct',
    label: '通义千问 (百炼)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    anthropicBaseUrl: 'https://dashscope.aliyuncs.com/apps/anthropic',
    apiFormat: 'openai',
    icon: '☁️',
    color: '#624AFF',
    defaultModel: 'qwen-max',
    websiteUrl: 'https://bailian.console.aliyun.com',
    models: [
      { id: 'qwen3.5-plus', label: 'Qwen3.5 Plus', maxTokens: 131072 },
      { id: 'qwen3.5-flash', label: 'Qwen3.5 Flash', maxTokens: 131072 },
      { id: 'qwen3-max', label: 'Qwen3 Max', maxTokens: 131072 },
      { id: 'qwen-max', label: 'Qwen Max', maxTokens: 32768 },
      { id: 'qwen-plus', label: 'Qwen Plus', maxTokens: 131072 },
      { id: 'qwen-turbo', label: 'Qwen Turbo', maxTokens: 131072 },
      { id: 'qwen-long', label: 'Qwen Long', maxTokens: 1048576 },
      { id: 'qwen2.5-72b-instruct', label: 'Qwen 2.5 72B', maxTokens: 131072 },
    ],
  },
  {
    type: 'qwen_coding',
    category: 'direct',
    label: '百炼 For Coding',
    baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic',
    apiFormat: 'anthropic',
    icon: '☁️',
    color: '#624AFF',
    defaultModel: 'qwen3.5-plus',
    websiteUrl: 'https://bailian.console.aliyun.com',
    models: [
      { id: 'qwen3.5-plus', label: 'Qwen3.5 Plus', maxTokens: 131072 },
    ],
  },
  {
    type: 'baichuan',
    category: 'direct',
    label: '百川',
    baseUrl: 'https://api.baichuan-ai.com',
    apiFormat: 'openai',
    icon: '🏔️',
    color: '#2563EB',
    defaultModel: 'Baichuan4',
    websiteUrl: 'https://www.baichuan-ai.com',
    models: [
      { id: 'Baichuan4', label: 'Baichuan 4', maxTokens: 131072 },
      { id: 'Baichuan3-Turbo', label: 'Baichuan 3 Turbo', maxTokens: 32768 },
      { id: 'Baichuan3-Turbo-128k', label: 'Baichuan 3 Turbo 128K', maxTokens: 131072 },
    ],
  },
  {
    type: 'yi',
    category: 'direct',
    label: '零一万物 (Yi)',
    baseUrl: 'https://api.lingyiwanwu.com',
    apiFormat: 'openai',
    icon: '🌟',
    color: '#8B5CF6',
    defaultModel: 'yi-lightning',
    websiteUrl: 'https://platform.lingyiwanwu.com',
    models: [
      { id: 'yi-lightning', label: 'Yi Lightning', maxTokens: 16384 },
      { id: 'yi-large', label: 'Yi Large', maxTokens: 16384 },
      { id: 'yi-medium', label: 'Yi Medium', maxTokens: 16384 },
    ],
  },
  {
    type: 'doubao',
    category: 'direct',
    label: '豆包 (火山引擎)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    anthropicBaseUrl: 'https://ark.cn-beijing.volces.com/api/coding',
    apiFormat: 'openai',
    icon: '🫘',
    color: '#3370FF',
    defaultModel: 'doubao-pro-32k',
    websiteUrl: 'https://console.volcengine.com/ark',
    models: [
      { id: 'doubao-seed-2-0-pro-260215', label: 'Doubao Seed 2.0 Pro', maxTokens: 131072 },
      { id: 'doubao-seed-2-0-lite-260215', label: 'Doubao Seed 2.0 Lite', maxTokens: 131072 },
      { id: 'doubao-seed-2-0-code-preview-260215', label: 'Doubao Seed 2.0 Code', maxTokens: 131072 },
      { id: 'doubao-pro-32k-241215', label: 'Doubao Pro 32K', maxTokens: 32768 },
      { id: 'doubao-pro-128k-241115', label: 'Doubao Pro 128K', maxTokens: 131072 },
      { id: 'doubao-lite-32k-240828', label: 'Doubao Lite 32K', maxTokens: 32768 },
    ],
  },
  {
    type: 'stepfun',
    category: 'direct',
    label: '阶跃星辰 (StepFun)',
    baseUrl: 'https://api.stepfun.com',
    anthropicBaseUrl: 'https://api.stepfun.com/step_plan',
    apiFormat: 'openai',
    icon: '🚶',
    color: '#16D6D2',
    defaultModel: 'step-2-16k',
    websiteUrl: 'https://platform.stepfun.com',
    apiKeyUrl: 'https://platform.stepfun.com/interface-key',
    models: [
      { id: 'step-2-16k', label: 'Step 2 16K', maxTokens: 16384 },
      { id: 'step-3.5-flash-2603', label: 'Step 3.5 Flash', maxTokens: 32768 },
      { id: 'step-1-8k', label: 'Step 1 8K', maxTokens: 8192 },
      { id: 'step-1-flash', label: 'Step 1 Flash', maxTokens: 8192 },
    ],
  },
  {
    type: 'stepfun_en',
    category: 'direct',
    label: 'StepFun (国际)',
    baseUrl: 'https://api.stepfun.ai',
    anthropicBaseUrl: 'https://api.stepfun.ai/step_plan',
    apiFormat: 'openai',
    icon: '🚶',
    color: '#16D6D2',
    defaultModel: 'step-3.5-flash-2603',
    websiteUrl: 'https://platform.stepfun.ai',
    apiKeyUrl: 'https://platform.stepfun.ai/interface-key',
    models: [
      { id: 'step-3.5-flash-2603', label: 'Step 3.5 Flash', maxTokens: 32768 },
    ],
  },
  {
    type: 'hunyuan',
    category: 'direct',
    label: '腾讯混元',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com',
    apiFormat: 'openai',
    icon: '🐧',
    color: '#00A4FF',
    defaultModel: 'hunyuan-turbos',
    websiteUrl: 'https://cloud.tencent.com/product/hunyuan',
    models: [
      { id: 'hunyuan-turbos', label: '混元 Turbo S', maxTokens: 131072 },
      { id: 'hunyuan-turbo', label: '混元 Turbo', maxTokens: 131072 },
      { id: 'hunyuan-pro', label: '混元 Pro', maxTokens: 32768 },
      { id: 'hunyuan-lite', label: '混元 Lite', maxTokens: 32768 },
    ],
  },
  {
    type: 'baidu',
    category: 'direct',
    label: '百度千帆',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    apiFormat: 'openai',
    icon: '🐻',
    color: '#2932E1',
    defaultModel: 'ernie-4.0-8k-latest',
    websiteUrl: 'https://cloud.baidu.com/product/qianfan',
    models: [
      { id: 'ernie-4.0-8k-latest', label: 'ERNIE 4.0', maxTokens: 8192 },
      { id: 'ernie-4.0-turbo-8k-latest', label: 'ERNIE 4.0 Turbo', maxTokens: 8192 },
      { id: 'ernie-speed-8k', label: 'ERNIE Speed', maxTokens: 8192 },
      { id: 'deepseek-r1', label: 'DeepSeek R1', maxTokens: 65536 },
      { id: 'deepseek-v3', label: 'DeepSeek V3', maxTokens: 65536 },
    ],
  },
  {
    type: 'baidu_coding',
    category: 'direct',
    label: '百度千帆 Coding Plan',
    baseUrl: 'https://qianfan.baidubce.com/anthropic/coding',
    apiFormat: 'anthropic',
    icon: '🐻',
    color: '#2932E1',
    defaultModel: 'qianfan-code-latest',
    websiteUrl: 'https://cloud.baidu.com/product/qianfan_modelbuilder',
    apiKeyUrl: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
    models: [
      { id: 'qianfan-code-latest', label: 'Qianfan Code', maxTokens: 131072 },
    ],
  },
  {
    type: 'mimo',
    category: 'direct',
    label: '小米 MiMo',
    baseUrl: 'https://api.xiaomimimo.com',
    anthropicBaseUrl: 'https://api.xiaomimimo.com/anthropic',
    apiFormat: 'openai',
    icon: '📱',
    color: '#FF6900',
    defaultModel: 'mimo-v2-pro',
    websiteUrl: 'https://platform.xiaomimimo.com',
    apiKeyUrl: 'https://platform.xiaomimimo.com/#/console/api-keys',
    models: [
      { id: 'mimo-v2-pro', label: 'MiMo V2 Pro', maxTokens: 131072 },
    ],
  },
  {
    type: 'groq',
    category: 'direct',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai',
    apiFormat: 'openai',
    icon: '⚡',
    color: '#F55036',
    defaultModel: 'llama-3.3-70b-versatile',
    websiteUrl: 'https://groq.com',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', maxTokens: 131072 },
      { id: 'llama3-70b-8192', label: 'Llama 3 70B', maxTokens: 8192 },
      { id: 'llama3-8b-8192', label: 'Llama 3 8B', maxTokens: 8192 },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', maxTokens: 32768 },
    ],
  },
  {
    type: 'mistral',
    category: 'direct',
    label: 'Mistral',
    baseUrl: 'https://api.mistral.ai',
    apiFormat: 'openai',
    icon: '🌀',
    color: '#FF7000',
    defaultModel: 'mistral-large-latest',
    websiteUrl: 'https://mistral.ai',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large', maxTokens: 131072 },
      { id: 'mistral-small-latest', label: 'Mistral Small', maxTokens: 32768 },
      { id: 'codestral-latest', label: 'Codestral', maxTokens: 32768 },
    ],
  },
  {
    type: 'perplexity',
    category: 'direct',
    label: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    apiFormat: 'openai',
    icon: '🔎',
    color: '#20808D',
    defaultModel: 'sonar-pro',
    websiteUrl: 'https://perplexity.ai',
    models: [
      { id: 'sonar-pro', label: 'Sonar Pro', maxTokens: 200000 },
      { id: 'sonar', label: 'Sonar', maxTokens: 131072 },
      { id: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro', maxTokens: 131072 },
    ],
  },
  {
    type: 'grok',
    category: 'direct',
    label: 'Grok (xAI)',
    baseUrl: 'https://api.x.ai',
    apiFormat: 'openai',
    icon: '✖️',
    color: '#000000',
    defaultModel: 'grok-3',
    websiteUrl: 'https://x.ai',
    models: [
      { id: 'grok-3', label: 'Grok 3', maxTokens: 131072 },
      { id: 'grok-3-mini', label: 'Grok 3 Mini', maxTokens: 131072 },
    ],
  },
  {
    type: 'nvidia',
    category: 'direct',
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com',
    apiFormat: 'openai',
    icon: '🟢',
    color: '#76B900',
    defaultModel: 'moonshotai/kimi-k2.5',
    websiteUrl: 'https://build.nvidia.com',
    apiKeyUrl: 'https://build.nvidia.com/settings/api-keys',
    models: [
      { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5', maxTokens: 131072 },
      { id: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B', maxTokens: 131072 },
    ],
  },
  {
    type: 'cerebras',
    category: 'direct',
    label: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiFormat: 'openai',
    icon: '🧊',
    color: '#1E88E5',
    defaultModel: 'llama-3.3-70b',
    websiteUrl: 'https://cerebras.ai',
    models: [
      { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', maxTokens: 131072 },
    ],
  },
  {
    type: 'together',
    category: 'direct',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz',
    apiFormat: 'openai',
    icon: '🤝',
    color: '#117865',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    websiteUrl: 'https://together.ai',
    models: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B', maxTokens: 131072 },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1', maxTokens: 65536 },
    ],
  },
  {
    type: 'fireworks',
    category: 'direct',
    label: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference',
    apiFormat: 'openai',
    icon: '🎆',
    color: '#FF4500',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    websiteUrl: 'https://fireworks.ai',
    models: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', label: 'Llama 3.3 70B', maxTokens: 131072 },
    ],
  },
  {
    type: 'ollama',
    category: 'direct',
    label: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434',
    apiFormat: 'openai',
    icon: '🦙',
    color: '#000000',
    defaultModel: 'llama3',
    websiteUrl: 'https://ollama.com',
    models: [],
  },
  {
    type: 'lmstudio',
    category: 'direct',
    label: 'LM Studio (本地)',
    baseUrl: 'http://localhost:1234',
    apiFormat: 'openai',
    icon: '🏠',
    color: '#6366F1',
    defaultModel: '',
    websiteUrl: 'https://lmstudio.ai',
    models: [],
  },
  {
    type: 'siliconflow',
    category: 'tokenplan',
    label: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    anthropicBaseUrl: 'https://api.siliconflow.cn',
    apiFormat: 'openai',
    icon: '⚡',
    color: '#6E29F6',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    websiteUrl: 'https://siliconflow.cn',
    apiKeyUrl: 'https://cloud.siliconflow.cn/i/drGuwc9k',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', maxTokens: 65536 },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1', maxTokens: 65536 },
      { id: 'Pro/MiniMaxAI/MiniMax-M2.7', label: 'MiniMax M2.7', maxTokens: 131072 },
      { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B', maxTokens: 131072 },
      { id: 'THUDM/glm-4-9b-chat', label: 'GLM-4 9B', maxTokens: 8192 },
    ],
  },
  {
    type: 'siliconflow_en',
    category: 'tokenplan',
    label: 'SiliconFlow (国际)',
    baseUrl: 'https://api.siliconflow.com/v1',
    anthropicBaseUrl: 'https://api.siliconflow.com',
    apiFormat: 'openai',
    icon: '⚡',
    color: '#000000',
    defaultModel: 'MiniMaxAI/MiniMax-M2.7',
    websiteUrl: 'https://siliconflow.com',
    apiKeyUrl: 'https://cloud.siliconflow.cn/i/drGuwc9k',
    models: [
      { id: 'MiniMaxAI/MiniMax-M2.7', label: 'MiniMax M2.7', maxTokens: 131072 },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', maxTokens: 65536 },
    ],
  },
  {
    type: 'openrouter',
    category: 'tokenplan',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    anthropicBaseUrl: 'https://openrouter.ai/api',
    apiFormat: 'openai',
    icon: '🔀',
    color: '#6566F1',
    defaultModel: 'openai/gpt-4o',
    websiteUrl: 'https://openrouter.ai',
    apiKeyUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'openai/gpt-4o', label: 'GPT-4o', maxTokens: 128000 },
      { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4', maxTokens: 200000 },
      { id: 'google/gemini-2.5-flash-preview', label: 'Gemini 2.5 Flash', maxTokens: 1048576 },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', maxTokens: 65536 },
      { id: 'qwen/qwen-2.5-7b-instruct:free', label: 'Qwen 2.5 7B (免费)', maxTokens: 32768 },
    ],
  },
  {
    type: 'therouter',
    category: 'tokenplan',
    label: 'TheRouter',
    baseUrl: 'https://api.therouter.ai/v1',
    anthropicBaseUrl: 'https://api.therouter.ai',
    apiFormat: 'openai',
    icon: '🔀',
    color: '#6D28D9',
    defaultModel: 'anthropic/claude-sonnet-4-20250514',
    websiteUrl: 'https://therouter.ai',
    apiKeyUrl: 'https://dashboard.therouter.ai',
    models: [
      { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4', maxTokens: 200000 },
      { id: 'anthropic/claude-opus-4-20250514', label: 'Claude Opus 4', maxTokens: 200000 },
    ],
  },
  {
    type: 'aihubmix',
    category: 'tokenplan',
    label: 'AiHubMix',
    baseUrl: 'https://aihubmix.com/v1',
    anthropicBaseUrl: 'https://aihubmix.com',
    apiFormat: 'openai',
    icon: '🌐',
    color: '#006FFB',
    defaultModel: 'gpt-4o',
    websiteUrl: 'https://aihubmix.com',
    apiKeyUrl: 'https://aihubmix.com',
    models: [],
  },
  {
    type: '302ai',
    category: 'tokenplan',
    label: '302.AI',
    baseUrl: 'https://api.302.ai/v1',
    apiFormat: 'openai',
    icon: '🚀',
    color: '#E11D48',
    defaultModel: 'gpt-4o',
    websiteUrl: 'https://302.ai',
    models: [],
  },
  {
    type: 'dmxapi',
    category: 'tokenplan',
    label: 'DMXAPI',
    baseUrl: 'https://www.dmxapi.cn/v1',
    anthropicBaseUrl: 'https://www.dmxapi.cn',
    apiFormat: 'openai',
    icon: '📊',
    color: '#00A67E',
    defaultModel: 'gpt-4o',
    websiteUrl: 'https://www.dmxapi.cn',
    apiKeyUrl: 'https://www.dmxapi.cn',
    models: [],
  },
  {
    type: 'modelscope',
    category: 'tokenplan',
    label: 'ModelScope (魔搭)',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    anthropicBaseUrl: 'https://api-inference.modelscope.cn',
    apiFormat: 'openai',
    icon: '🔬',
    color: '#624AFF',
    defaultModel: 'ZhipuAI/GLM-5',
    websiteUrl: 'https://modelscope.cn',
    models: [
      { id: 'ZhipuAI/GLM-5', label: 'GLM-5', maxTokens: 131072 },
      { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B', maxTokens: 131072 },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3', maxTokens: 65536 },
    ],
  },
  {
    type: 'longcat',
    category: 'tokenplan',
    label: 'LongCat',
    baseUrl: 'https://api.longcat.chat/openai',
    anthropicBaseUrl: 'https://api.longcat.chat/anthropic',
    apiFormat: 'openai',
    icon: '🐱',
    color: '#29E154',
    defaultModel: 'LongCat-Flash-Chat',
    websiteUrl: 'https://longcat.chat',
    apiKeyUrl: 'https://longcat.chat/platform/api_keys',
    models: [
      { id: 'LongCat-Flash-Chat', label: 'LongCat Flash', maxTokens: 131072 },
    ],
  },
  {
    type: 'ppio',
    category: 'tokenplan',
    label: 'PPIO (派欧云)',
    baseUrl: 'https://api.ppinfra.com/v3/openai',
    apiFormat: 'openai',
    icon: '🔵',
    color: '#3B82F6',
    defaultModel: 'deepseek/deepseek-r1',
    websiteUrl: 'https://ppio.com',
    models: [
      { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1', maxTokens: 65536 },
      { id: 'deepseek/deepseek-v3', label: 'DeepSeek V3', maxTokens: 65536 },
    ],
  },
  {
    type: 'novita',
    category: 'tokenplan',
    label: 'Novita AI',
    baseUrl: 'https://api.novita.ai/v1',
    anthropicBaseUrl: 'https://api.novita.ai/anthropic',
    apiFormat: 'openai',
    icon: '💎',
    color: '#000000',
    defaultModel: 'zai-org/glm-5',
    websiteUrl: 'https://novita.ai',
    models: [
      { id: 'zai-org/glm-5', label: 'GLM-5', maxTokens: 131072 },
    ],
  },
  {
    type: 'pipellm',
    category: 'tokenplan',
    label: 'PIPELLM',
    baseUrl: 'https://cc-api.pipellm.ai/v1',
    anthropicBaseUrl: 'https://cc-api.pipellm.ai',
    apiFormat: 'openai',
    icon: '🔌',
    color: '#6366F1',
    defaultModel: 'claude-opus-4-20250514',
    websiteUrl: 'https://code.pipellm.ai',
    apiKeyUrl: 'https://code.pipellm.ai/login?ref=uvw650za',
    models: [
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', maxTokens: 200000 },
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', maxTokens: 200000 },
    ],
  },
  {
    type: 'shengsuanyun',
    category: 'tokenplan',
    label: '胜算云',
    baseUrl: 'https://router.shengsuanyun.com/api/v1',
    anthropicBaseUrl: 'https://router.shengsuanyun.com/api',
    apiFormat: 'openai',
    icon: '☁️',
    color: '#00A67E',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.shengsuanyun.com',
    apiKeyUrl: 'https://www.shengsuanyun.com/?from=CH_4HHXMRYF',
    models: [],
  },
  {
    type: 'compshare',
    category: 'tokenplan',
    label: '优云智算 (Compshare)',
    baseUrl: 'https://api.modelverse.cn/v1',
    anthropicBaseUrl: 'https://api.modelverse.cn',
    apiFormat: 'openai',
    icon: '🏗️',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.compshare.cn',
    apiKeyUrl: 'https://www.compshare.cn/coding-plan?ytag=GPU_YY_YX_git_cc-switch',
    models: [],
  },
  {
    type: 'compshare_coding',
    category: 'tokenplan',
    label: '优云智算 Coding Plan',
    baseUrl: 'https://cp.compshare.cn/v1',
    anthropicBaseUrl: 'https://cp.compshare.cn',
    apiFormat: 'openai',
    icon: '🏗️',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.compshare.cn',
    apiKeyUrl: 'https://www.compshare.cn/coding-plan?ytag=GPU_YY_YX_git_cc-switch',
    models: [],
  },
  {
    type: 'katcoder',
    category: 'tokenplan',
    label: 'KAT-Coder',
    baseUrl: 'https://vanchin.streamlake.ai/api/gateway/v1/endpoints',
    apiFormat: 'anthropic',
    icon: '🐾',
    color: '#FF6B35',
    defaultModel: 'KAT-Coder-Pro V1',
    websiteUrl: 'https://console.streamlake.ai',
    apiKeyUrl: 'https://console.streamlake.ai/console/api-key',
    models: [
      { id: 'KAT-Coder-Pro V1', label: 'KAT-Coder Pro', maxTokens: 131072 },
      { id: 'KAT-Coder-Air V1', label: 'KAT-Coder Air', maxTokens: 32768 },
    ],
  },
  {
    type: 'bailing',
    category: 'tokenplan',
    label: '百灵 (BaiLing)',
    baseUrl: 'https://api.tbox.cn/api',
    anthropicBaseUrl: 'https://api.tbox.cn/api/anthropic',
    apiFormat: 'openai',
    icon: '🐦',
    color: '#3370FF',
    defaultModel: 'Ling-2.5-1T',
    websiteUrl: 'https://alipaytbox.yuque.com/sxs0ba/ling/get_started',
    models: [
      { id: 'Ling-2.5-1T', label: 'Ling 2.5 1T', maxTokens: 131072 },
    ],
  },
  {
    type: 'packycode',
    category: 'tokenplan',
    label: 'PackyCode',
    baseUrl: 'https://www.packyapi.com/v1',
    anthropicBaseUrl: 'https://www.packyapi.com',
    apiFormat: 'openai',
    icon: '📦',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.packyapi.com',
    apiKeyUrl: 'https://www.packyapi.com/register?aff=cc-switch',
    models: [],
  },
  {
    type: 'cubence',
    category: 'tokenplan',
    label: 'Cubence',
    baseUrl: 'https://api.cubence.com/v1',
    anthropicBaseUrl: 'https://api.cubence.com',
    apiFormat: 'openai',
    icon: '🎲',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://cubence.com',
    apiKeyUrl: 'https://cubence.com/signup?code=CCSWITCH&source=ccs',
    models: [],
  },
  {
    type: 'aigocode',
    category: 'tokenplan',
    label: 'AIGoCode',
    baseUrl: 'https://api.aigocode.com/v1',
    anthropicBaseUrl: 'https://api.aigocode.com',
    apiFormat: 'openai',
    icon: '💻',
    color: '#5B7FFF',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://aigocode.com',
    apiKeyUrl: 'https://aigocode.com/invite/CC-SWITCH',
    models: [],
  },
  {
    type: 'rightcode',
    category: 'tokenplan',
    label: 'RightCode',
    baseUrl: 'https://www.right.codes/claude',
    apiFormat: 'anthropic',
    icon: '✅',
    color: '#E96B2C',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.right.codes',
    apiKeyUrl: 'https://www.right.codes/register?aff=CCSWITCH',
    models: [],
  },
  {
    type: 'aicodemirror',
    category: 'tokenplan',
    label: 'AICodeMirror',
    baseUrl: 'https://api.aicodemirror.com/api/claudecode',
    apiFormat: 'anthropic',
    icon: '🪞',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.aicodemirror.com',
    apiKeyUrl: 'https://www.aicodemirror.com/register?invitecode=9915W3',
    models: [],
  },
  {
    type: 'aicoding',
    category: 'tokenplan',
    label: 'AICoding',
    baseUrl: 'https://api.aicoding.sh/v1',
    anthropicBaseUrl: 'https://api.aicoding.sh',
    apiFormat: 'openai',
    icon: '⌨️',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://aicoding.sh',
    apiKeyUrl: 'https://aicoding.sh/i/CCSWITCH',
    models: [],
  },
  {
    type: 'crazyrouter',
    category: 'tokenplan',
    label: 'CrazyRouter',
    baseUrl: 'https://crazyrouter.com/v1',
    anthropicBaseUrl: 'https://crazyrouter.com',
    apiFormat: 'openai',
    icon: '🤪',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.crazyrouter.com',
    apiKeyUrl: 'https://www.crazyrouter.com/register?aff=OZcm&ref=cc-switch',
    models: [],
  },
  {
    type: 'sssaicode',
    category: 'tokenplan',
    label: 'SSSAiCode',
    baseUrl: 'https://node-hk.sssaicode.com/api/v1',
    anthropicBaseUrl: 'https://node-hk.sssaicode.com/api',
    apiFormat: 'openai',
    icon: '🔐',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.sssaicode.com',
    apiKeyUrl: 'https://www.sssaicode.com/register?ref=DCP0SM',
    models: [],
  },
  {
    type: 'micu',
    category: 'tokenplan',
    label: 'Micu',
    baseUrl: 'https://www.openclaudecode.cn/v1',
    anthropicBaseUrl: 'https://www.openclaudecode.cn',
    apiFormat: 'openai',
    icon: '🎤',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.openclaudecode.cn',
    apiKeyUrl: 'https://www.openclaudecode.cn/register?aff=aOYQ',
    models: [],
  },
  {
    type: 'ctok',
    category: 'tokenplan',
    label: 'CTok.ai',
    baseUrl: 'https://api.ctok.ai/v1',
    anthropicBaseUrl: 'https://api.ctok.ai',
    apiFormat: 'openai',
    icon: '🔑',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://ctok.ai',
    apiKeyUrl: 'https://ctok.ai',
    models: [],
  },
  {
    type: 'ddshub',
    category: 'tokenplan',
    label: 'DDSHub',
    baseUrl: 'https://www.ddshub.cc/v1',
    anthropicBaseUrl: 'https://www.ddshub.cc',
    apiFormat: 'openai',
    icon: '📡',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://www.ddshub.cc',
    apiKeyUrl: 'https://ddshub.short.gy/ccswitch',
    models: [],
  },
  {
    type: 'eflowcode',
    category: 'tokenplan',
    label: 'E-FlowCode',
    baseUrl: 'https://e-flowcode.cc/v1',
    anthropicBaseUrl: 'https://e-flowcode.cc',
    apiFormat: 'openai',
    icon: '🌊',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://e-flowcode.cc',
    models: [],
  },
  {
    type: 'lionccapi',
    category: 'tokenplan',
    label: 'LionCCAPI',
    baseUrl: 'https://vibecodingapi.ai/v1',
    anthropicBaseUrl: 'https://vibecodingapi.ai',
    apiFormat: 'openai',
    icon: '🦁',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://vibecodingapi.ai',
    models: [],
  },
  {
    type: 'lemondata',
    category: 'tokenplan',
    label: 'LemonData',
    baseUrl: 'https://api.lemondata.cc/v1',
    anthropicBaseUrl: 'https://api.lemondata.cc',
    apiFormat: 'openai',
    icon: '🍋',
    color: '#FFD700',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://lemondata.cc',
    apiKeyUrl: 'https://lemondata.cc/r/FFX1ZDUP',
    models: [],
  },
  {
    type: 'github_copilot',
    category: 'tokenplan',
    label: 'GitHub Copilot',
    baseUrl: 'https://api.githubcopilot.com',
    apiFormat: 'openai',
    icon: '🐙',
    color: '#000000',
    defaultModel: 'claude-sonnet-4-20250514',
    websiteUrl: 'https://github.com/features/copilot',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', maxTokens: 200000 },
      { id: 'gpt-4o', label: 'GPT-4o', maxTokens: 128000 },
    ],
  },
  {
    type: 'codex',
    category: 'tokenplan',
    label: 'Codex (ChatGPT)',
    baseUrl: 'https://chatgpt.com/backend-api/codex',
    apiFormat: 'openai',
    icon: '🔮',
    color: '#000000',
    defaultModel: 'gpt-5.4',
    websiteUrl: 'https://openai.com/chatgpt/pricing',
    models: [
      { id: 'gpt-5.4', label: 'GPT-5.4', maxTokens: 200000 },
    ],
  },
  {
    type: 'aws_bedrock',
    category: 'tokenplan',
    label: 'AWS Bedrock',
    baseUrl: 'https://bedrock-runtime.us-west-2.amazonaws.com',
    apiFormat: 'anthropic',
    icon: '☁️',
    color: '#FF9900',
    defaultModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
    websiteUrl: 'https://aws.amazon.com/bedrock/',
    models: [
      { id: 'anthropic.claude-sonnet-4-20250514-v1:0', label: 'Claude Sonnet 4', maxTokens: 200000 },
      { id: 'anthropic.claude-opus-4-20250514-v1:0', label: 'Claude Opus 4', maxTokens: 200000 },
    ],
  },
  {
    type: 'custom',
    category: 'tokenplan',
    label: '自定义 (OpenAI 兼容)',
    baseUrl: '',
    apiFormat: 'openai',
    icon: '🔧',
    color: '#6366F1',
    defaultModel: '',
    models: [],
  },
]

export const DIRECT_PROVIDERS = PROVIDER_PRESETS.filter((p) => p.category === 'direct')
export const TOKENPLAN_PROVIDERS = PROVIDER_PRESETS.filter((p) => p.category === 'tokenplan')

export function getPresetByType(type: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.type === type)
}

export function getModelLabel(modelId: string, providerType: string): string {
  const preset = getPresetByType(providerType)
  if (preset) {
    const model = preset.models.find((m) => m.id === modelId)
    if (model) return model.label
  }
  for (const preset of PROVIDER_PRESETS) {
    const model = preset.models.find((m) => m.id === modelId)
    if (model) return model.label
  }
  return modelId
}

const KNOWN_COMPAT_SUFFIXES = [
  '/api/claudecode',
  '/api/anthropic',
  '/apps/anthropic',
  '/api/coding',
  '/claudecode',
  '/anthropic',
  '/step_plan',
  '/coding',
  '/claude',
]

function stripCompatSuffix(baseUrl: string): string | null {
  const sorted = [...KNOWN_COMPAT_SUFFIXES].sort((a, b) => b.length - a.length)
  for (const suffix of sorted) {
    if (baseUrl.endsWith(suffix)) {
      return baseUrl.slice(0, baseUrl.length - suffix.length)
    }
  }
  return null
}

export function buildModelsUrlCandidates(baseUrl: string, presetModelsUrl?: string): string[] {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')

  const candidates: string[] = []

  if (presetModelsUrl && !candidates.includes(presetModelsUrl)) {
    candidates.push(presetModelsUrl)
  }

  if (trimmed) {
    const primary = trimmed.endsWith('/v1')
      ? `${trimmed}/models`
      : `${trimmed}/v1/models`
    if (!candidates.includes(primary)) candidates.push(primary)

    const stripped = stripCompatSuffix(trimmed)
    if (stripped) {
      const root = stripped.replace(/\/+$/, '')
      if (root.includes('://') && root.length > 8) {
        const v1Models = `${root}/v1/models`
        const modelsOnly = `${root}/models`
        if (!candidates.includes(v1Models)) candidates.push(v1Models)
        if (!candidates.includes(modelsOnly)) candidates.push(modelsOnly)
      }
    }
  }

  return candidates
}
