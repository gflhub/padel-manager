'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TESTIDS } from '@/lib/testids'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[app-error-boundary]', error)
    }, [error])

    return (
        <div
            data-testid={TESTIDS.APP_ERROR_BOUNDARY}
            className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8 text-center"
        >
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="space-y-1">
                <p className="text-lg font-semibold">Algo deu errado</p>
                <p className="text-sm text-muted-foreground">
                    Não foi possível carregar esta página. Tente novamente.
                </p>
            </div>
            <Button data-testid={TESTIDS.ERROR_RETRY} onClick={() => reset()}>
                Tentar novamente
            </Button>
        </div>
    )
}
