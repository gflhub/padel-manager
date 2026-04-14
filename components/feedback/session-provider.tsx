'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initSessionLogger, logNavigation } from '@/lib/session-logger'

/**
 * Provider que inicializa o session logger ao montar a aplicação.
 * Deve ser colocado no root layout para capturar todas as páginas.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Inicializa listeners de erro globais uma vez
  useEffect(() => {
    const cleanup = initSessionLogger()
    return cleanup
  }, [])

  // Registra cada troca de rota
  useEffect(() => {
    if (pathname) {
      logNavigation(pathname)
    }
  }, [pathname])

  return <>{children}</>
}
