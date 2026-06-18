import { AlertTriangle, OctagonAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClubTrialStatus } from '@/lib/club-trial'
import { TESTIDS } from '@/lib/testids'

interface TrialBannerProps {
    status: ClubTrialStatus
    daysRemaining: number | null
}

export function TrialBanner({ status, daysRemaining }: TrialBannerProps) {
    if (status !== 'warning' && status !== 'expired') {
        return null
    }

    const isExpired = status === 'expired'

    return (
        <div
            data-testid={isExpired ? TESTIDS.TRIAL_EXPIRED : undefined}
            className={cn(
                'flex items-center gap-3 border-b px-4 py-3 text-sm font-medium md:px-6',
                isExpired
                    ? 'bg-red-50 text-red-700 border-red-100'
                    : 'bg-amber-50 text-amber-700 border-amber-100'
            )}
        >
            {isExpired ? <OctagonAlert className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {isExpired ? (
                <span>Seu período de teste expirou. O clube está em modo somente leitura — entre em contato para contratar um plano.</span>
            ) : (
                <span>
                    Seu período de teste termina em {daysRemaining} dia{daysRemaining === 1 ? '' : 's'}. Contrate um plano para manter o acesso completo.
                </span>
            )}
        </div>
    )
}
