import { AccordionItem } from '@/shared/components/Accordion'
import { LogViewer } from './LogViewer'

export function LogViewerSettings() {
  return (
    <AccordionItem title="日志配置" defaultOpen={false}>
      <div className="h-96">
        <LogViewer />
      </div>
    </AccordionItem>
  )
}
