/**
 * Session Logger — coleta eventos de navegação e erros JS durante a sessão.
 * Os dados ficam no sessionStorage e são enviados junto com o feedback do usuário.
 */

export interface SessionEvent {
  type: 'navigation' | 'error' | 'network_error' | 'action'
  timestamp: string
  path?: string
  message?: string
  stack?: string
  details?: string
}

export interface SessionLog {
  sessionStart: string
  events: SessionEvent[]
  browserInfo: {
    userAgent: string
    language: string
    viewport: string
    platform: string
    online: boolean
  }
}

const SESSION_KEY = 'pm_session_log'
const MAX_EVENTS = 30

function getNow(): string {
  return new Date().toISOString()
}

function getBrowserInfo(): SessionLog['browserInfo'] {
  if (typeof window === 'undefined') return { userAgent: '', language: '', viewport: '', platform: '', online: true }
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    platform: navigator.platform,
    online: navigator.onLine,
  }
}

function readLog(): SessionLog {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {/* ignore */}
  return {
    sessionStart: getNow(),
    events: [],
    browserInfo: getBrowserInfo(),
  }
}

function writeLog(log: SessionLog): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(log))
  } catch {/* ignore */}
}

function pushEvent(event: SessionEvent): void {
  const log = readLog()
  log.events.push(event)
  // Mantém apenas os últimos MAX_EVENTS eventos
  if (log.events.length > MAX_EVENTS) {
    log.events = log.events.slice(log.events.length - MAX_EVENTS)
  }
  writeLog(log)
}

export function logNavigation(path: string): void {
  pushEvent({ type: 'navigation', timestamp: getNow(), path })
}

export function logError(message: string, stack?: string): void {
  pushEvent({ type: 'error', timestamp: getNow(), message, stack })
}

export function logAction(details: string): void {
  pushEvent({ type: 'action', timestamp: getNow(), details })
}

export function getSessionLog(): SessionLog {
  return readLog()
}

/** Inicializa os listeners globais. Deve ser chamado apenas uma vez (no SessionProvider). */
export function initSessionLogger(): () => void {
  if (typeof window === 'undefined') return () => {}

  // Garante início de sessão com info de browser atualizado
  const log = readLog()
  log.browserInfo = getBrowserInfo()
  writeLog(log)

  // Registra a página atual imediatamente
  logNavigation(window.location.pathname + window.location.search)

  const handleError = (event: ErrorEvent) => {
    logError(event.message, event.error?.stack)
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const msg = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason)
    logError(`Unhandled Promise: ${msg}`, event.reason?.stack)
  }

  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    window.removeEventListener('error', handleError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}
