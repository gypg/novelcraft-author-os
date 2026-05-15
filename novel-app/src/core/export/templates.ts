export interface ExportTemplate {
  id: string
  name: string
  platform: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

export const PLATFORM_TEMPLATES: ExportTemplate[] = [
  {
    id: 'qidian',
    name: '起点中文网',
    platform: '起点',
    fontFamily: '宋体',
    fontSize: 14,
    lineHeight: 1.8,
    marginTop: 2.5,
    marginBottom: 2.5,
    marginLeft: 3,
    marginRight: 3,
  },
  {
    id: 'tomato',
    name: '番茄小说',
    platform: '番茄',
    fontFamily: '微软雅黑',
    fontSize: 15,
    lineHeight: 1.6,
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 2.5,
    marginRight: 2.5,
  },
  {
    id: 'jinjiang',
    name: '晋江文学城',
    platform: '晋江',
    fontFamily: '宋体',
    fontSize: 14,
    lineHeight: 2.0,
    marginTop: 3,
    marginBottom: 3,
    marginLeft: 3.5,
    marginRight: 3.5,
  },
  {
    id: 'kindle',
    name: 'Kindle 电子书',
    platform: 'Kindle',
    fontFamily: 'Georgia',
    fontSize: 12,
    lineHeight: 1.5,
    marginTop: 1.5,
    marginBottom: 1.5,
    marginLeft: 2,
    marginRight: 2,
  },
]

export function getTemplateById(id: string): ExportTemplate | undefined {
  return PLATFORM_TEMPLATES.find((t) => t.id === id)
}

export function buildPandocArgs(template: ExportTemplate, format: string): string[] {
  const args: string[] = []

  args.push('--variable', `mainfont:${template.fontFamily}`)
  args.push('--variable', `fontsize:${template.fontSize}pt`)
  args.push('--variable', `linestretch:${template.lineHeight}`)
  args.push('--variable', `geometry:top=${template.marginTop}cm,bottom=${template.marginBottom}cm,left=${template.marginLeft}cm,right=${template.marginRight}cm`)

  if (format === 'epub') {
    args.push('--epub-chapter-level=1')
  }

  return args
}
