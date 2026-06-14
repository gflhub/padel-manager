'use client'

import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TonalBadge, type TonalColor } from "@/components/ui/tonal-badge"
import { getInitials, getAvatarColors, formatHumanDateTime } from "@/lib/format-helpers"
import { CheckCircle, Flag, UserCheck, Ellipsis } from "lucide-react"
import { cn } from "@/lib/utils"
import { TRIAL_EXPIRED_TOOLTIP } from "@/lib/trial-constants"

import { type Reservation } from "./reservation-types"

const STATUS_TONE: Record<string, TonalColor> = {
    pending: 'amber',
    confirmed: 'emerald',
    checked_in: 'blue',
    completed: 'blue',
    cancelled: 'red',
    no_show: 'slate',
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmada',
    checked_in: 'Check-in',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    no_show: 'No Show',
}

const COURT_DOT_PALETTE = [
    'bg-blue-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-violet-500',
    'bg-amber-500',
]

function getCourtDotColor(name: string): string {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
    return COURT_DOT_PALETTE[Math.abs(hash) % COURT_DOT_PALETTE.length]
}

interface ReservationRowProps {
    reservation: Reservation
    onView: (r: Reservation) => void
    onStatusChange: (id: string, status: string) => void
    isReadOnly?: boolean
}

export function ReservationRow({ reservation: r, onView, onStatusChange, isReadOnly = false }: ReservationRowProps) {
    const titular = r.players?.[0]?.name || 'Cliente'
    const extraPlayers = Math.max(0, (r.players?.length || 0) - 1)
    const avatarColors = getAvatarColors(titular)
    const isCancelled = r.status === 'cancelled' || r.status === 'no_show'

    return (
        <TableRow className={cn("group", isCancelled && "text-muted-foreground")}>
            <TableCell>
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn(avatarColors.bg, avatarColors.text, "text-xs font-semibold")}>
                            {getInitials(titular)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className={cn("font-medium leading-tight", isCancelled && "text-foreground/60")}>{titular}</div>
                        {extraPlayers > 0 && (
                            <div className="text-xs text-muted-foreground">
                                +{extraPlayers} jogador{extraPlayers > 1 ? 'es' : ''}
                            </div>
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                {r.court ? (
                    <span className="inline-flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", getCourtDotColor(r.court.name))} />
                        {r.court.name}
                    </span>
                ) : '-'}
            </TableCell>
            <TableCell>
                <div className="font-medium">{formatHumanDateTime(new Date(`${r.date}T00:00:00`))}</div>
                <div className="text-xs text-muted-foreground">{r.start_time} – {r.end_time}</div>
            </TableCell>
            <TableCell className="text-right font-semibold">
                <span className={cn(isCancelled && "line-through")}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.total_price)}
                </span>
            </TableCell>
            <TableCell>
                <TonalBadge color={STATUS_TONE[r.status] || 'slate'}>{STATUS_LABEL[r.status] || r.status}</TonalBadge>
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                {r.status === 'confirmed' && (
                    <Button size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => onStatusChange(r.id, 'checked_in')} disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}>
                        <UserCheck className="h-3.5 w-3.5" /> Check-in
                    </Button>
                )}
                {r.status === 'pending' && (
                    <Button size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => onStatusChange(r.id, 'confirmed')} disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}>
                        <CheckCircle className="h-3.5 w-3.5" /> Confirmar
                    </Button>
                )}
                {r.status === 'checked_in' && (
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1" onClick={() => onStatusChange(r.id, 'completed')} disabled={isReadOnly} title={isReadOnly ? TRIAL_EXPIRED_TOOLTIP : undefined}>
                        <Flag className="h-3.5 w-3.5" /> Concluir
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity align-middle"
                    onClick={() => onView(r)}
                    title="Detalhes"
                >
                    <Ellipsis className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    )
}
