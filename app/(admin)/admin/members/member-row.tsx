'use client'

import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TonalBadge } from "@/components/ui/tonal-badge"
import { getInitials, getAvatarColors } from "@/lib/format-helpers"
import { CheckCircle2, Ban } from "lucide-react"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"
import { TESTIDS } from "@/lib/testids"

export interface Subscription {
    id: string
    user_id: string
    club_id: string
    plan_name: string
    price: number
    due_day: number
    status: 'ACTIVE' | 'OVERDUE' | 'CANCELLED'
    next_due_date: string
    member_name: string
    member_email: string
    created_at: string
    updated_at: string
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

interface MemberRowProps {
    subscription: Subscription
    onMarkPaid: (subscription: Subscription) => void
    onCancel: (subscription: Subscription) => void
    isReadOnly?: boolean
}

export function MemberRow({ subscription, onMarkPaid, onCancel, isReadOnly = false }: MemberRowProps) {
    const initials = getInitials(subscription.member_name)
    const colors = getAvatarColors(subscription.member_name)

    return (
        <TableRow className="group">
            <TableCell>
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className={`${colors.bg} ${colors.text} text-xs font-semibold`}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium leading-tight">{subscription.member_name}</div>
                        <div className="text-xs text-muted-foreground">{subscription.member_email || 'sem email'}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-sm">{subscription.plan_name}</TableCell>
            <TableCell className="text-sm" style={{ fontFeatureSettings: '"tnum"' }}>
                {formatCurrency(subscription.price)}
            </TableCell>
            <TableCell className="text-sm">Dia {subscription.due_day}</TableCell>
            <TableCell className="text-sm">{formatDate(subscription.next_due_date)}</TableCell>
            <TableCell data-testid={TESTIDS.MEMBER_STATUS}>
                {subscription.status === 'ACTIVE' && <TonalBadge color="emerald">Em dia</TonalBadge>}
                {subscription.status === 'OVERDUE' && <TonalBadge color="red">Em atraso</TonalBadge>}
                {subscription.status === 'CANCELLED' && <TonalBadge color="slate">Cancelado</TonalBadge>}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                {subscription.status !== 'CANCELLED' && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onMarkPaid(subscription)}
                            disabled={isReadOnly}
                            title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Marcar pago
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onCancel(subscription)}
                            disabled={isReadOnly}
                            title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : 'Cancelar mensalista'}
                        >
                            <Ban className="h-4 w-4" />
                        </Button>
                    </>
                )}
            </TableCell>
        </TableRow>
    )
}
