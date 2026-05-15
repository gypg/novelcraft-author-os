import { isTauri } from './tauri-env'

let _invoke: typeof import('@tauri-apps/api/core').invoke | null = null

async function getInvoke() {
  if (!isTauri()) return null
  if (!_invoke) {
    try {
      const mod = await import('@tauri-apps/api/core')
      _invoke = mod.invoke
    } catch {
      return null
    }
  }
  return _invoke
}

export function log(level: string, module: string, message: string) {
  const tag = `[${module}]`
  if (level === 'ERROR') console.error(tag, message)
  else if (level === 'WARN') console.warn(tag, message)
  else console.log(tag, message)

  getInvoke().then((inv) => {
    if (inv) {
      inv('log_message', { level, module, message }).catch(() => {})
    }
  })
}

export const logger = {
  info: (module: string, msg: string) => log('INFO', module, msg),
  warn: (module: string, msg: string) => log('WARN', module, msg),
  error: (module: string, msg: string) => log('ERROR', module, msg),
  debug: (module: string, msg: string) => log('DEBUG', module, msg),
  critical: (module: string, msg: string) => log('CRITICAL', module, msg),
}

export async function readLogs(lines = 200): Promise<string> {
  const inv = await getInvoke()
  if (!inv) return '[browser mode] logs not available'
  return inv<string>('read_logs', { lines })
}
